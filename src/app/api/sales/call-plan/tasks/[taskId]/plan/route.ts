import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSalesSession } from "@/lib/auth/sales";

const updateSchema = z.object({
  planObjective: z.string().max(100).nullable().optional(),
  planNotes: z.string().max(2000).nullable().optional(),
});

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { taskId } = await context.params;
  return withSalesSession(request, async ({ db, tenantId, session }) => {

    let payload: z.infer<typeof updateSchema>;
    try {
      payload = updateSchema.parse(await request.json());
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const hasObjective = Object.prototype.hasOwnProperty.call(payload, "planObjective");
    const hasNotes = Object.prototype.hasOwnProperty.call(payload, "planNotes");

    if (!hasObjective && !hasNotes) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 }
      );
    }

    const task = await db.task.findFirst({
      where: {
        id: taskId,
        tenantId,
      },
      include: {
        callPlan: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isOwner = task.callPlan
      ? task.callPlan.userId === session.user.id
      : task.userId === session.user.id;

    if (!isOwner) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        ...(payload.planObjective !== undefined && { planObjective: payload.planObjective }),
        ...(payload.planNotes !== undefined && { planNotes: payload.planNotes }),
      },
      select: {
        id: true,
        planObjective: true,
        planNotes: true,
      },
    });

    return NextResponse.json({ success: true, task: updated });
  });
}
