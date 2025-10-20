import { NextRequest, NextResponse } from "next/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { readSalesSessionCookies } from "@/lib/auth/sales-cookies";
import { readSessionCookies } from "@/lib/auth/cookies";
import { getActiveSalesSession, type SalesSession } from "@/lib/auth/sales-session";
import { getActivePortalSession } from "@/lib/auth/session";
import { withTenantFromRequest } from "@/lib/tenant";

// Admin session can come from either Sales session (User) or Portal session (PortalUser)
type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  roles: string[];
  permissions: Set<string>;
};

export type AdminSessionContext = {
  tenantId: string;
  db: PrismaClient | Prisma.TransactionClient;
  user: AdminUser;
  sessionType: "sales" | "portal";
  salesSession?: SalesSession;
  portalSession?: NonNullable<Awaited<ReturnType<typeof getActivePortalSession>>>;
};

export type AdminAuthorizationOptions = {
  requiredRoles?: string[];
  requiredPermissions?: string[];
};

export type AdminSessionHandler = (context: AdminSessionContext) => Promise<Response>;

// Admin roles that grant access to the admin portal
const ADMIN_ROLES = ["admin", "sales.admin", "portal.admin"];

/**
 * Check if a user has admin privileges based on their roles
 */
export function isAdmin(roles: string[]): boolean {
  return roles.some((role) => ADMIN_ROLES.includes(role));
}

/**
 * Check if a user has a specific role
 */
export function requireRole(roles: string[], requiredRole: string): boolean {
  return roles.includes(requiredRole);
}

/**
 * Check if a user has a specific permission
 */
export function requirePermission(permissions: Set<string>, requiredPermission: string): boolean {
  return permissions.has(requiredPermission);
}

/**
 * Admin session middleware that accepts both Sales and Portal sessions
 * Validates that the user has admin privileges (admin, sales.admin, or portal.admin roles)
 */
export async function withAdminSession(
  request: NextRequest,
  handler: AdminSessionHandler,
  options: AdminAuthorizationOptions = {},
) {
  // Try sales session first
  const { sessionId: salesSessionId } = readSalesSessionCookies(request);
  const { sessionId: portalSessionId } = readSessionCookies(request);

  if (!salesSessionId && !portalSessionId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
      let adminUser: AdminUser | null = null;
      let sessionType: "sales" | "portal" | null = null;
      let salesSession: SalesSession | undefined;
      let portalSession: NonNullable<Awaited<ReturnType<typeof getActivePortalSession>>> | undefined;

      // Try sales session
      if (salesSessionId) {
        salesSession = await getActiveSalesSession(db, tenantId, salesSessionId);
        if (salesSession) {
          const roles = salesSession.user.roles.map((item) => item.role.code);
          const permissions = new Set<string>();
          salesSession.user.roles.forEach((userRole) => {
            userRole.role.permissions.forEach((rolePermission) => {
              permissions.add(rolePermission.permission.code);
            });
          });

          adminUser = {
            id: salesSession.user.id,
            email: salesSession.user.email,
            fullName: salesSession.user.fullName,
            isActive: salesSession.user.isActive,
            roles,
            permissions,
          };
          sessionType = "sales";
        }
      }

      // Try portal session if sales session not found
      if (!adminUser && portalSessionId) {
        portalSession = await getActivePortalSession(db, tenantId, portalSessionId);
        if (portalSession) {
          const roles = portalSession.portalUser.roles.map((item) => item.role.code);
          const permissions = new Set<string>();
          portalSession.portalUser.roles.forEach((userRole) => {
            userRole.role.permissions.forEach((rolePermission) => {
              permissions.add(rolePermission.permission.code);
            });
          });

          adminUser = {
            id: portalSession.portalUser.id,
            email: portalSession.portalUser.email,
            fullName: portalSession.portalUser.fullName,
            isActive: portalSession.portalUser.status === "ACTIVE",
            roles,
            permissions,
          };
          sessionType = "portal";
        }
      }

      if (!adminUser || !sessionType) {
        return NextResponse.json({ error: "Session expired." }, { status: 401 });
      }

      // Check if user is active
      if (!adminUser.isActive) {
        return NextResponse.json({ error: "Account is inactive." }, { status: 403 });
      }

      // Check if user has admin privileges
      if (!isAdmin(adminUser.roles)) {
        return NextResponse.json(
          { error: "Access denied. Admin privileges required." },
          { status: 403 },
        );
      }

      // Check additional role requirements
      if (options.requiredRoles?.length) {
        const hasRole = options.requiredRoles.some((role) => adminUser.roles.includes(role));
        if (!hasRole) {
          return NextResponse.json({ error: "Missing required role." }, { status: 403 });
        }
      }

      // Check permission requirements
      if (options.requiredPermissions?.length) {
        const hasPermission = options.requiredPermissions.every((permission) =>
          adminUser.permissions.has(permission),
        );
        if (!hasPermission) {
          return NextResponse.json({ error: "Missing required permission." }, { status: 403 });
        }
      }

      return handler({
        tenantId,
        db,
        user: adminUser,
        sessionType,
        salesSession,
        portalSession,
      });
    });

    return result;
  } catch (error) {
    console.error("Admin session resolution failed:", error);
    console.error("Error details:", error instanceof Error ? error.message : 'Unknown error');
    console.error("Error stack:", error instanceof Error ? error.stack : 'No stack');

    // Return detailed error in development/preview
    const errorDetails = error instanceof Error ? error.message : "Unknown error";
    const isProd = process.env.NODE_ENV === 'production';

    return NextResponse.json(
      {
        error: "Unable to validate session.",
        details: isProd ? "Check server logs" : errorDetails,
        stack: isProd ? undefined : (error instanceof Error ? error.stack : undefined),
        env: {
          nodeEnv: process.env.NODE_ENV,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasTenantSlug: !!process.env.DEFAULT_TENANT_SLUG,
        }
      },
      { status: 500 }
    );
  }
}
