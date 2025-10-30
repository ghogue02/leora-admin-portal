import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const DEFAULT_LIMIT = 25;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limitParam = searchParams.get("limit");
  const statusFilter = searchParams.get("status") as TaskStatus | null;

  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || DEFAULT_LIMIT, 1), 100) : DEFAULT_LIMIT;

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      if (!session.portalUser.customerId) {
        return NextResponse.json({
          summary: {
            total: 0,
            byStatus: {},
          },
          tasks: [],
        });
      }

      const statusFilterClause =
        statusFilter && Object.values(TaskStatus).includes(statusFilter) ? { status: statusFilter } : {};

      const where = {
        tenantId,
        customerId: session.portalUser.customerId,
        ...statusFilterClause,
      };

      const [tasks, counts] = await Promise.all([
        db.task.findMany({
          where,
          include: {
            callPlan: {
              select: {
                id: true,
                name: true,
              },
            },
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: [
            { status: "asc" },
            { dueAt: "asc" },
          ],
          take: limit,
        }),
        db.task.groupBy({
          by: ["status"],
          where: {
            tenantId,
            customerId: session.portalUser.customerId,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

      const summary = {
        total: counts.reduce((acc, item) => acc + item._count._all, 0),
        byStatus: counts.reduce<Record<TaskStatus, number>>((acc, item) => {
          acc[item.status as TaskStatus] = item._count._all;
          return acc;
        }, {} as Record<TaskStatus, number>),
      };

      return NextResponse.json({
        summary,
        tasks: tasks.map((task) => ({
          id: task.id,
          status: task.status,
          title: task.title,
          description: task.description,
          dueAt: task.dueAt,
          callPlan: task.callPlan
            ? {
                id: task.callPlan.id,
                name: task.callPlan.name,
              }
            : null,
          owner: task.user
            ? {
                id: task.user.id,
                fullName: task.user.fullName,
              }
            : null,
        })),
      });
    },
    { requiredPermissions: ["portal.callplan.view"] },
  );
}
