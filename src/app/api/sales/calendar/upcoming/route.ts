import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { addDays, startOfDay, endOfDay, format } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = request.nextUrl;
    const daysParam = searchParams.get("days") || "10";
    const days = Math.min(parseInt(daysParam, 10), 14); // Max 14 days

    const today = startOfDay(new Date());
    const endDate = endOfDay(addDays(today, days - 1));

    // Get all tasks for the current user in the date range
    const tasks = await db.task.findMany({
      where: {
        tenantId,
        userId: session.user.id,
        dueAt: {
          gte: today,
          lte: endDate,
        },
        status: {
          in: ["PENDING", "IN_PROGRESS"],
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

    // Group tasks by date
    const dayMap = new Map<string, any[]>();

    // Initialize all days in range
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      const dateKey = format(date, "yyyy-MM-dd");
      dayMap.set(dateKey, []);
    }

    // Populate activities
    tasks.forEach((task) => {
      if (!task.dueAt) return;

      const dateKey = format(task.dueAt, "yyyy-MM-dd");
      const timeKey = format(task.dueAt, "HH:mm");

      // Infer activity type from title
      const title = task.title.toLowerCase();
      let type = "call";
      if (title.includes("visit")) type = "visit";
      else if (title.includes("tasting")) type = "tasting";
      else if (title.includes("event")) type = "event";
      else if (title.includes("call")) type = "call";

      const activity = {
        id: task.id,
        time: timeKey,
        title: task.title,
        customer: task.customer?.name || null,
        customerId: task.customer?.id || null,
        type,
        status: task.status.toLowerCase(),
        description: task.description,
      };

      const existing = dayMap.get(dateKey);
      if (existing) {
        existing.push(activity);
      }
    });

    // Convert map to response format
    const daysArray = Array.from(dayMap.entries()).map(([dateStr, activities]) => {
      const date = new Date(dateStr);
      return {
        date: dateStr,
        dayName: format(date, "EEEE"),
        dayOfMonth: format(date, "d"),
        month: format(date, "MMM"),
        activities: activities.sort((a, b) => a.time.localeCompare(b.time)),
      };
    });

    return NextResponse.json({
      days: daysArray,
      totalActivities: tasks.length,
    });
  });
}
