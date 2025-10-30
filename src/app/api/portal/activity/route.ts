import { NextRequest, NextResponse } from "next/server";
import { ActivityOutcome, Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit");
  const outcomeParam = searchParams.get("outcome") as ActivityOutcome | null;
  const typeParam = searchParams.get("type");

  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || DEFAULT_LIMIT, 1), 100) : DEFAULT_LIMIT;

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const where: Prisma.ActivityWhereInput = {
        tenantId,
        OR: [
          { portalUserId: session.portalUserId },
          session.portalUser.customerId ? { customerId: session.portalUser.customerId } : undefined,
        ].filter(Boolean) as Prisma.ActivityWhereInput["OR"],
      };

      if (outcomeParam && Object.values(ActivityOutcome).includes(outcomeParam)) {
        where.outcome = outcomeParam;
      }

      if (typeParam) {
        where.activityType = {
          code: typeParam,
        };
      }

      const activities = await db.activity.findMany({
        where,
        include: {
          activityType: true,
          order: {
            select: {
              id: true,
              status: true,
              orderedAt: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: {
          occurredAt: "desc",
        },
        take: limit,
      });

      return NextResponse.json({
        activities: activities.map((activity) => ({
          id: activity.id,
          occurredAt: activity.occurredAt,
          followUpAt: activity.followUpAt,
          outcome: activity.outcome,
          subject: activity.subject,
          notes: activity.notes,
          type: {
            code: activity.activityType.code,
            name: activity.activityType.name,
          },
          order: activity.order
            ? {
                id: activity.order.id,
                status: activity.order.status,
                orderedAt: activity.order.orderedAt,
              }
            : null,
          task: activity.task
            ? {
                id: activity.task.id,
                title: activity.task.title,
                status: activity.task.status,
              }
            : null,
        })),
      });
    },
    { requiredPermissions: ["portal.dashboard.view"] },
  );
}
