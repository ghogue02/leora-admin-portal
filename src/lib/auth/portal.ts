import { NextRequest, NextResponse } from "next/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { readSessionCookies } from "@/lib/auth/cookies";
import { getActivePortalSession } from "@/lib/auth/session";
import { withTenantFromRequest } from "@/lib/tenant";

type ActivePortalSession = NonNullable<Awaited<ReturnType<typeof getActivePortalSession>>>;

export type PortalSessionContext = {
  tenantId: string;
  db: PrismaClient | Prisma.TransactionClient;
  session: ActivePortalSession;
  roles: string[];
  permissions: Set<string>;
};

export type PortalAuthorizationOptions = {
  requiredRoles?: string[];
  requiredPermissions?: string[];
};

export type PortalSessionHandler = (context: PortalSessionContext) => Promise<Response>;

export async function withPortalSession(
  request: NextRequest,
  handler: PortalSessionHandler,
  options: PortalAuthorizationOptions = {},
) {
  const { sessionId } = readSessionCookies(request);

  if (!sessionId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
      const session = await getActivePortalSession(db, tenantId, sessionId);

      if (!session) {
        return NextResponse.json({ error: "Session expired." }, { status: 401 });
      }

      const roles = session.portalUser.roles.map((item) => item.role.code);
      const permissions = new Set<string>();
      session.portalUser.roles.forEach((userRole) => {
        userRole.role.permissions.forEach((rolePermission) => {
          permissions.add(rolePermission.permission.code);
        });
      });

      if (options.requiredRoles?.length) {
        const hasRole = options.requiredRoles.some((role) => roles.includes(role));
        if (!hasRole) {
          return NextResponse.json({ error: "Missing required role." }, { status: 403 });
        }
      }

      if (options.requiredPermissions?.length) {
        const hasPermission = options.requiredPermissions.every((permission) =>
          permissions.has(permission),
        );
        if (!hasPermission) {
          return NextResponse.json({ error: "Missing required permission." }, { status: 403 });
        }
      }

      return handler({
        tenantId,
        db,
        session,
        roles,
        permissions,
      });
    });

    return result;
  } catch (error) {
    console.error("Portal session resolution failed:", error);
    return NextResponse.json({ error: "Unable to validate session." }, { status: 500 });
  }
}
