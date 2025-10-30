import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const [totals, unreadCount, totalsByCategory, unreadByCategory] = await Promise.all([
        db.portalNotification.aggregate({
          where: {
            tenantId,
            portalUserId: session.portalUserId,
          },
          _count: {
            _all: true,
          },
        }),
        db.portalNotification.count({
          where: {
            tenantId,
            portalUserId: session.portalUserId,
            readAt: null,
          },
        }),
        db.portalNotification.groupBy({
          by: ["category"],
          where: {
            tenantId,
            portalUserId: session.portalUserId,
          },
          _count: {
            _all: true,
          },
        }),
        db.portalNotification.groupBy({
          by: ["category"],
          where: {
            tenantId,
            portalUserId: session.portalUserId,
            readAt: null,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

      const unreadCategoryMap = new Map(unreadByCategory.map((item) => [item.category, item._count._all]));

      return NextResponse.json({
        total: totals._count._all,
        unread: unreadCount,
        categories: totalsByCategory.map((item) => ({
          category: item.category,
          total: item._count._all,
          unread: unreadCategoryMap.get(item.category) ?? 0,
        })),
      });
    },
    { requiredPermissions: ["portal.notifications.view"] },
  );
}
