/**
 * Authentication compatibility barrel.
 * Provides legacy exports expected by older API routes until they are refactored.
 */
export { getServerSession } from "next-auth";
export { authOptions } from "@/app/api/auth/[...nextauth]/route";
export { withSalesSession } from "./auth/sales";
export { withPortalSession } from "./auth/portal";
export { withAdminSession } from "./auth/admin";
