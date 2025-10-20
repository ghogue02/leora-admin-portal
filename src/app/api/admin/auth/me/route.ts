import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";

/**
 * GET /api/admin/auth/me
 * Returns current admin user information
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ user, sessionType, tenantId }) => {
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        isActive: user.isActive,
      },
      sessionType,
      tenantId,
    });
  });
}
