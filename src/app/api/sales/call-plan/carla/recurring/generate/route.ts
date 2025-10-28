import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { generateRecurringSchedules } from "@/lib/call-plan/recurring-scheduler";
import { startOfWeek } from "date-fns";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, session }) => {
    try {
      const { callPlanId, weekStart, weeksAhead } = await request.json();

      if (!callPlanId || typeof callPlanId !== "string") {
        return NextResponse.json(
          { error: "callPlanId is required" },
          { status: 400 },
        );
      }

      const weekStartDate = weekStart
        ? new Date(weekStart)
        : startOfWeek(new Date(), { weekStartsOn: 1 });

      const result = await generateRecurringSchedules(
        tenantId,
        session.user.id,
        callPlanId,
        weekStartDate,
        typeof weeksAhead === "number" ? weeksAhead : 2,
      );

      return NextResponse.json({
        success: true,
        created: result.created,
        skipped: result.skipped,
        message: `Created ${result.created} recurring schedules (${result.skipped} skipped)`,
      });
    } catch (error) {
      console.error("[GenerateRecurring]", error);
      return NextResponse.json(
        { error: "Failed to generate recurring schedules" },
        { status: 500 },
      );
    }
  });
}
