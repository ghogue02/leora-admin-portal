import { NextRequest, NextResponse } from "next/server";
import type { Prisma, PrismaClient } from "@prisma/client";
import { readSalesSessionCookies } from "@/lib/auth/sales-cookies";
import { getActiveSalesSession, type SalesSession } from "@/lib/auth/sales-session";
import { withTenantFromRequest } from "@/lib/tenant";
import { hasSalesManagerPrivileges } from "@/lib/sales/role-helpers";

export type SalesSessionContext = {
  tenantId: string;
  db: PrismaClient | Prisma.TransactionClient;
  session: SalesSession;
  roles: string[];
  permissions: Set<string>;
};

export type SalesAuthorizationOptions = {
  requiredRoles?: string[];
  requiredPermissions?: string[];
  requireSalesRep?: boolean;
};

export type SalesSessionHandler = (context: SalesSessionContext) => Promise<Response>;

export async function withSalesSession(
  request: NextRequest,
  handler: SalesSessionHandler,
  options: SalesAuthorizationOptions = {},
) {
  console.log("🔐 [withSalesSession] Starting session validation");
  console.log("🔐 [withSalesSession] URL:", request.url);

  const { sessionId } = readSalesSessionCookies(request);

  console.log("🔐 [withSalesSession] Session ID from cookie:", sessionId ? "present" : "missing");

  if (!sessionId) {
    console.log("❌ [withSalesSession] No session ID found in cookies");
    return NextResponse.json({
      error: "Not authenticated. Please log in to access this page.",
      code: "AUTH_REQUIRED",
      action: "redirect_to_login",
      loginUrl: "/sales/login"
    }, { status: 401 });
  }

  try {
    console.log("🔐 [withSalesSession] Calling withTenantFromRequest");
    const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
      console.log("🔐 [withSalesSession] Inside withTenantFromRequest, tenantId:", tenantId);
      console.log("🔐 [withSalesSession] Getting active sales session...");
      const session = await getActiveSalesSession(db, tenantId, sessionId);

      if (!session) {
        console.log("❌ [withSalesSession] Session not found or expired");
        return NextResponse.json({
          error: "Your session has expired. Please log in again.",
          code: "SESSION_EXPIRED",
          action: "redirect_to_login",
          loginUrl: "/sales/login"
        }, { status: 401 });
      }

      console.log("✅ [withSalesSession] Session validated successfully");
      console.log("🔐 [withSalesSession] User ID:", session.user.id);
      console.log("🔐 [withSalesSession] Sales rep:", session.user.salesRep?.id);

      const roleCodes = session.user.roles.map((item) => item.role.code);
      const managerScope = hasSalesManagerPrivileges(roleCodes);

      // Check if user has sales rep profile if required
      if (options.requireSalesRep !== false && !session.user.salesRep && !managerScope) {
        return NextResponse.json({
          error: "Sales representative profile required to access this page.",
          code: "MISSING_SALES_REP_PROFILE",
          action: "contact_admin",
          message: "Your account doesn't have a sales rep profile. Please contact your administrator to set this up."
        }, { status: 403 });
      }

      // Check if sales rep is active
      if (session.user.salesRep && !session.user.salesRep.isActive) {
        return NextResponse.json({
          error: "Your sales representative account is inactive.",
          code: "INACTIVE_SALES_REP",
          action: "contact_admin",
          message: "Your account has been deactivated. Please contact your administrator to reactivate."
        }, { status: 403 });
      }

      const roles = roleCodes;
      const permissions = new Set<string>();
      session.user.roles.forEach((userRole) => {
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

      console.log("🔐 [withSalesSession] Calling handler function");
      const handlerResult = await handler({
        tenantId,
        db,
        session,
        roles,
        permissions,
      });
      console.log("✅ [withSalesSession] Handler completed successfully");
      return handlerResult;
    });

    console.log("✅ [withSalesSession] Returning result");
    return result;
  } catch (error) {
    console.error("❌ [withSalesSession] Full error object:", error);
    console.error("❌ [withSalesSession] Error name:", error instanceof Error ? error.name : "Unknown");
    console.error("❌ [withSalesSession] Error message:", error instanceof Error ? error.message : String(error));
    console.error("❌ [withSalesSession] Error stack:", error instanceof Error ? error.stack : "No stack");
    console.error("❌ [withSalesSession] Error code:", (error as any).code);
    console.error("❌ [withSalesSession] Error meta:", (error as any).meta);
    console.error("❌ [withSalesSession] Request URL:", request.url);
    console.error("❌ [withSalesSession] Session ID was:", sessionId);

    // Provide more specific error message to client
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDbError = (error as any).code?.startsWith('P');

    return NextResponse.json({
      error: "Unable to validate session.",
      details: errorMessage,
      hint: isDbError
        ? "Database connection issue. Please check server logs."
        : "Session may be expired or invalid. Try logging out and back in.",
      sessionId: sessionId ? "present" : "missing"
    }, { status: 500 });
  }
}
