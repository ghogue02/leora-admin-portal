import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { TaskStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get("status");

    // Build where clause - fetch tasks assigned TO current user
    const where: {
      tenantId: string;
      userId: string;
      status?: TaskStatus;
      dueAt?: { lt: Date };
    } = {
      tenantId,
      userId: session.user.id,
    };

    // Apply status filter
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "overdue") {
        // Overdue = pending AND past due date
        where.status = "PENDING";
        where.dueAt = {
          lt: new Date(),
        };
      } else {
        where.status = statusFilter.toUpperCase() as TaskStatus;
      }
    }

    // Fetch tasks with assignedBy user information
    const tasks = await db.task.findMany({
      where,
      include: {
        assignedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" }, // High priority first
        { dueAt: "asc" }, // Earliest due date first
        { createdAt: "desc" },
      ],
    });

    // Calculate summary statistics
    const now = new Date();
    const summary = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "PENDING").length,
      completed: tasks.filter((t) => t.status === "COMPLETED").length,
      overdue: tasks.filter(
        (t) => t.status === "PENDING" && t.dueAt && new Date(t.dueAt) < now
      ).length,
    };

    // Transform tasks to match API response format
    const formattedTasks = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority.toLowerCase(),
      dueAt: task.dueAt,
      status: task.status.toLowerCase(),
      assignedBy: task.assignedBy
        ? {
            id: task.assignedBy.id,
            name: task.assignedBy.fullName,
            email: task.assignedBy.email,
          }
        : null,
      customer: task.customer,
      createdAt: task.createdAt,
    }));

    return NextResponse.json({
      tasks: formattedTasks,
      summary,
    });
  });
}
