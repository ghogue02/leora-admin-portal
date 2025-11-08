import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { TaskStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where = {
      tenantId,
      userId: session.user.id, // Only tasks assigned to this user
    };

    // Filter by status if provided
    if (status && status !== "ALL") {
      (where as { status?: TaskStatus }).status = status as TaskStatus;
    }

    // Fetch tasks
    const tasks = await db.task.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { dueAt: "asc" }, // Upcoming tasks first
        { createdAt: "desc" },
      ],
      take: limit,
    });

    // Separate into pending and overdue
    const now = new Date();
    const pendingTasks = tasks.filter((t) => t.status === "PENDING");
    const overdueTasks = pendingTasks.filter(
      (t) => t.dueAt && new Date(t.dueAt) < now
    );

    return NextResponse.json({
      tasks,
      summary: {
        total: tasks.length,
        pending: pendingTasks.length,
        overdue: overdueTasks.length,
        completed: tasks.filter((t) => t.status === "COMPLETED").length,
      },
    });
  });
}
