import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, parseISO } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = request.nextUrl;
    const weekStartParam = searchParams.get("weekStart");

    if (!weekStartParam) {
      return NextResponse.json(
        { error: "weekStart query parameter is required" },
        { status: 400 }
      );
    }

    const weekStartDate = parseISO(weekStartParam);
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 }); // Sunday

    // Get the sales rep's call plan for this week
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
          orderBy: {
            dueAt: "asc",
          },
        },
      },
    });

    // If no call plan exists, get tasks directly
    if (!callPlan) {
      const tasks = await db.task.findMany({
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

      return NextResponse.json({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        tasks,
      });
    }

    return NextResponse.json({
      id: callPlan.id,
      name: callPlan.name,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      tasks: callPlan.tasks,
    });
  });
}
