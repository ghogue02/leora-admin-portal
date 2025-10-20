import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { PortalUserStatus } from "@prisma/client";
import { applySessionCookies } from "@/lib/auth/cookies";
import { withTenantFromRequest } from "@/lib/tenant";

const SESSION_TTL_MS = Number(process.env.PORTAL_SESSION_TTL_MS ?? 1000 * 60 * 60 * 24);

type LoginBody = {
  email?: string;
  fullName?: string;
  portalUserKey?: string;
};

export async function POST(request: NextRequest) {
  let body: LoginBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const suppliedKey = body.portalUserKey?.trim();
  const defaultKey = process.env.DEFAULT_PORTAL_USER_KEY;

  try {
    const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
      let portalUser = await db.portalUser.findUnique({
        where: {
          tenantId_email: {
            tenantId,
            email,
          },
        },
      });

      const keyToUse = suppliedKey ?? defaultKey ?? null;

      if (!portalUser) {
        if (!keyToUse) {
          return NextResponse.json(
            { error: "Portal user key is required for first-time login." },
            { status: 401 },
          );
        }

        portalUser = await db.portalUser.create({
          data: {
            tenantId,
            email,
            fullName: body.fullName?.trim() || email,
            portalUserKey: keyToUse,
            status: PortalUserStatus.ACTIVE,
          },
        });
      } else if (portalUser.portalUserKey && suppliedKey && portalUser.portalUserKey !== suppliedKey) {
        return NextResponse.json({ error: "Invalid portal user key." }, { status: 401 });
      }

      if (portalUser.status !== PortalUserStatus.ACTIVE) {
        return NextResponse.json({ error: "Portal user is not active." }, { status: 403 });
      }

      const roleAssignments = await db.portalUserRole.count({
        where: {
          portalUserId: portalUser.id,
        },
      });

      if (roleAssignments === 0) {
        const tenantSettings = await db.tenantSettings.findUnique({
          where: { tenantId },
          select: { defaultPortalRole: true },
        });

        const defaultRoleCode = tenantSettings?.defaultPortalRole ?? "portal.viewer";

        let defaultRole = await db.role.findUnique({
          where: {
            tenantId_code: {
              tenantId,
              code: defaultRoleCode,
            },
          },
          select: { id: true },
        });

        if (!defaultRole) {
          defaultRole = await db.role.findFirst({
            where: { tenantId },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          });
        }

        if (defaultRole) {
          await db.portalUserRole.create({
            data: {
              portalUserId: portalUser.id,
              roleId: defaultRole.id,
            },
          });
        }
      }

      const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
      const session = await db.portalSession.create({
        data: {
          tenantId,
          portalUserId: portalUser.id,
          refreshToken: randomUUID(),
          expiresAt,
        },
      });

      const response = NextResponse.json({
        user: {
          id: portalUser.id,
          email: portalUser.email,
          fullName: portalUser.fullName,
          status: portalUser.status,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt.toISOString(),
        },
      });

      applySessionCookies(response, session, Math.floor(SESSION_TTL_MS / 1000));
      return response;
    });

    return result;
  } catch (error) {
    console.error("Portal login failed:", error);
    const message =
      process.env.NODE_ENV === "production" || !(error instanceof Error)
        ? "Unable to authenticate user."
        : error.message || "Unable to authenticate user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
