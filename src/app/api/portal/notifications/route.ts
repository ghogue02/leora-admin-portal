import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || DEFAULT_LIMIT, 100) : DEFAULT_LIMIT;

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const where = {
        tenantId,
        portalUserId: session.portalUserId,
        ...(unreadOnly ? { readAt: null } : {}),
      } as const;

      const [notifications, unreadCount] = await Promise.all([
        db.portalNotification.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
          take: limit,
        }),
        db.portalNotification.count({
          where: {
            tenantId,
            portalUserId: session.portalUserId,
            readAt: null,
          },
        }),
      ]);

      return NextResponse.json({
        notifications: notifications.map(serializeNotification),
        unreadCount,
      });
    },
    { requiredPermissions: ["portal.notifications.view"] },
  );
}

type NotificationUpdatePayload = {
  notificationIds?: string[];
  markRead?: boolean;
  markUnread?: boolean;
  markAllRead?: boolean;
};

export async function PATCH(request: NextRequest) {
  let payload: NotificationUpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload.markRead && !payload.markUnread && !payload.markAllRead) {
    return NextResponse.json({ error: "Specify markRead, markUnread, or markAllRead." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const targetIds = payload.notificationIds?.filter(Boolean) ?? [];
      if (!payload.markAllRead && targetIds.length === 0) {
        return NextResponse.json({ error: "notificationIds required unless markAllRead is true." }, { status: 400 });
      }

      const where = {
        tenantId,
        portalUserId: session.portalUserId,
        ...(payload.markAllRead ? {} : { id: { in: targetIds } }),
      } as const;

      const data = payload.markUnread
        ? { readAt: null }
        : { readAt: new Date() };

      await db.portalNotification.updateMany({ where, data });

      return NextResponse.json({ success: true });
    },
    { requiredPermissions: ["portal.notifications.view"] },
  );
}

function serializeNotification(notification: {
  id: string;
  category: string;
  title: string;
  message: string;
  metadata: unknown;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    category: notification.category,
    title: notification.title,
    message: notification.message,
    metadata: notification.metadata,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}
