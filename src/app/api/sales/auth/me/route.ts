import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ session, roles }) =>
    NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        isActive: session.user.isActive,
        salesRep: session.user.salesRepProfile,
        roles,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt.toISOString(),
      },
    }),
  );
}
