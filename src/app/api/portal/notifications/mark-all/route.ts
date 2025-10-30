import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

export async function POST(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const result = await db.portalNotification.updateMany({
        where: {
          tenantId,
          portalUserId: session.portalUserId,
          readAt: null,
        },
        data: {
          readAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, updated: result.count });
    },
    { requiredPermissions: ["portal.notifications.view"] },
  );
}
