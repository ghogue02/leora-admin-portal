import { NextRequest, NextResponse } from "next/server";
import { TaskStatus, Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

type TaskUpdatePayload = {
  status?: TaskStatus;
  dueAt?: string | null;
  description?: string | null;
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let payload: TaskUpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (payload.status && !Object.values(TaskStatus).includes(payload.status)) {
    return NextResponse.json({ error: "Invalid status provided." }, { status: 400 });
  }

  const dueAt =
    payload.dueAt === undefined
      ? undefined
      : payload.dueAt === null
        ? null
        : new Date(payload.dueAt);

  if (dueAt instanceof Date && Number.isNaN(dueAt.getTime())) {
    return NextResponse.json({ error: "dueAt must be a valid ISO datetime string." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      if (!session.portalUser.customerId) {
        return NextResponse.json({ error: "Portal user is not associated with a customer." }, { status: 400 });
      }

      const task = await db.task.findFirst({
        where: {
          id: params.id,
          tenantId,
          customerId: session.portalUser.customerId,
        },
        include: {
          callPlan: true,
          user: true,
        },
      });

      if (!task) {
        return NextResponse.json({ error: "Task not found." }, { status: 404 });
      }

      const data: Prisma.TaskUpdateInput = {};

      if (payload.status) {
        data.status = payload.status;
      }
      if (dueAt !== undefined) {
        data.dueAt = dueAt;
      }
      if (payload.description !== undefined) {
        data.description = payload.description;
      }

      const updated = await db.task.update({
        where: { id: task.id },
        data,
        include: {
          callPlan: true,
          user: true,
        },
      });

      return NextResponse.json({
        task: {
          id: updated.id,
          status: updated.status,
          title: updated.title,
          description: updated.description,
          dueAt: updated.dueAt,
          callPlan: updated.callPlan
            ? {
                id: updated.callPlan.id,
                name: updated.callPlan.name,
              }
            : null,
          owner: updated.user
            ? {
                id: updated.user.id,
                fullName: updated.user.fullName,
              }
            : null,
        },
      });
    },
    { requiredPermissions: ["portal.callplan.manage"] },
  );
}
