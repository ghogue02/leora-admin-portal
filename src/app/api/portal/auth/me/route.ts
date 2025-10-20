import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

export async function GET(request: NextRequest) {
  return withPortalSession(request, async ({ session, roles }) =>
    NextResponse.json({
      user: {
        id: session.portalUser.id,
        email: session.portalUser.email,
        fullName: session.portalUser.fullName,
        status: session.portalUser.status,
        roles,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
      },
    }),
  );
}
