import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { TaskStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { taskId } = await context.params;

    // Verify task exists and belongs to this tenant
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        tenantId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update task status back to PENDING
    const updatedTask = await db.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: TaskStatus.PENDING,
        updatedAt: new Date(),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  });
}
