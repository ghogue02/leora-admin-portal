import { NextRequest } from "next/server";
import { withSalesSession, type SalesSessionHandler, type SalesAuthorizationOptions } from "./sales";

/**
 * Wrapper for admin-only endpoints
 * Requires sales.admin or admin role
 */
export async function withAdminSession(
  request: NextRequest,
  handler: SalesSessionHandler,
  options: Omit<SalesAuthorizationOptions, "requiredRoles"> = {},
) {
  return withSalesSession(
    request,
    handler,
    {
      ...options,
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}
