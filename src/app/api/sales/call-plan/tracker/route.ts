import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek } from "date-fns";
import { enrichCallPlanTasks } from "@/lib/call-plan/enrich-tasks.server";

/**
 * GET /api/sales/call-plan/tracker
 * Get all accounts in the current week's call plan with their contact outcomes
 */
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = new URL(request.url);
    const weekStartParam = searchParams.get("weekStart");

    if (!weekStartParam) {
      return NextResponse.json(
        { error: "weekStart parameter is required" },
        { status: 400 }
      );
    }

    const weekStartDate = new Date(weekStartParam);
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 });

    // Get call plan for this week
    const callPlan = await db.callPlan.findFirst({
      where: {
        tenantId,
        userId: session.user.id,
        effectiveAt: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      include: {
        tasks: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
              },
            },
          },
          where: {
            dueAt: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        },
      },
    });

    const tasks = callPlan
      ? callPlan.tasks
      : await db.task.findMany({
          where: {
            tenantId,
            userId: session.user.id,
            dueAt: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
              },
            },
          },
          orderBy: {
            dueAt: "asc",
          },
        });

    const enrichedTasks = await enrichCallPlanTasks(tasks, { db, tenantId });

    const accounts = enrichedTasks.map((task) => ({
      id: task.customer?.id || task.id,
      name: task.customer?.name || "Unknown",
      city: task.customer?.city,
      state: task.customer?.state,
      outcome: task.contactOutcome,
      markedAt: task.markedAt,
      notes: task.notes,
      taskId: task.id,
      activityType: task.activityTypeKey,
      activityTypeLabel: task.activityTypeLabel,
      activityTypeCategory: task.activityTypeCategory,
    }));

    return NextResponse.json({
      accounts,
      callPlanId: callPlan?.id ?? null,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    });
  });
}
