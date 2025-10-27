import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { parseISO, startOfWeek, endOfWeek } from "date-fns";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const body = await request.json();
      const { weekStart, accountIds } = body;

      if (!weekStart || !accountIds || !Array.isArray(accountIds)) {
        return NextResponse.json(
          { error: "weekStart and accountIds are required" },
          { status: 400 }
        );
      }

      if (accountIds.length === 0) {
        return NextResponse.json(
          { error: "At least one account must be selected" },
          { status: 400 }
        );
      }

      if (accountIds.length > 75) {
        return NextResponse.json(
          { error: "Maximum 75 accounts can be selected" },
          { status: 400 }
        );
      }

      const weekStartDate = parseISO(weekStart);
      const weekStartNormalized = startOfWeek(weekStartDate, { weekStartsOn: 1 });
      const weekEndNormalized = endOfWeek(weekStartDate, { weekStartsOn: 1 });

      // Check if a call plan already exists for this week
      const existingPlan = await db.callPlan.findFirst({
        where: {
          tenantId,
          userId: session.user.id,
          effectiveAt: {
            gte: weekStartNormalized,
            lte: weekEndNormalized,
          },
        },
      });

      if (existingPlan) {
        return NextResponse.json(
          { error: "A call plan already exists for this week" },
          { status: 409 }
        );
      }

      // Create the call plan
      const callPlan = await db.callPlan.create({
        data: {
          tenantId,
          userId: session.user.id,
          name: `Week of ${weekStartNormalized.toISOString().split("T")[0]}`,
          effectiveAt: weekStartNormalized,
          metadata: {
            accountIds,
            createdViaCarla: true,
          },
        },
      });

      // Create tasks for each selected account
      // (In a real implementation, you might want to distribute these across the week)
      const tasks = await Promise.all(
        accountIds.map((customerId: string, index: number) =>
          db.task.create({
            data: {
              tenantId,
              userId: session.user.id,
              customerId,
              callPlanId: callPlan.id,
              title: "Weekly check-in",
              description: "CARLA-generated weekly customer check-in",
              dueAt: new Date(
                weekStartNormalized.getTime() + index * (24 * 60 * 60 * 1000 / 5)
              ), // Distribute across weekdays
              status: "PENDING",
              priority: "MEDIUM",
            },
          })
        )
      );

      return NextResponse.json({
        success: true,
        callPlan: {
          id: callPlan.id,
          name: callPlan.name,
          weekStart: weekStartNormalized.toISOString(),
          accountCount: accountIds.length,
          tasksCreated: tasks.length,
        },
      });
    } catch (error) {
      console.error("Error creating CARLA call plan:", error);
      return NextResponse.json(
        { error: "Failed to create call plan" },
        { status: 500 }
      );
    }
  });
}
