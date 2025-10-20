import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { TaskStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { taskId } = await context.params;

    // Parse request body for optional notes
    let notes: string | undefined;
    try {
      const body = await request.json();
      notes = body.notes;
    } catch {
      // No body is fine
    }

    // Verify task exists and belongs to this user's tenant
    const task = await db.task.findFirst({
      where: {
        id: taskId,
        tenantId,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update task status to COMPLETED
    const updatedTask = await db.task.update({
      where: {
        id: taskId,
      },
      data: {
        status: TaskStatus.COMPLETED,
        ...(notes && { description: notes }), // Optionally update description with notes
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
