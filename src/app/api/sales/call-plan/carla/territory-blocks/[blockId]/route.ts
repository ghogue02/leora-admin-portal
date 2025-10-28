import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { z } from "zod";

const updateSchema = z
  .object({
    allDay: z.boolean().optional(),
    startTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "startTime must be HH:mm format")
      .optional(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "endTime must be HH:mm format")
      .optional(),
  })
  .refine(
    (data) => data.allDay !== false || (data.startTime && data.endTime),
    {
      message: "startTime and endTime are required when allDay is false",
      path: ["startTime"],
    },
  );

export async function PATCH(
  request: NextRequest,
  { params }: { params: { blockId: string } },
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const body = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const block = await db.territoryBlock.findFirst({
      where: {
        id: params.blockId,
        tenantId,
      },
      include: {
        callPlan: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!block) {
      return NextResponse.json({ error: "Territory block not found" }, { status: 404 });
    }

    if (block.callPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { allDay, startTime, endTime } = parsed.data;

    if (allDay === false && startTime && endTime && startTime >= endTime) {
      return NextResponse.json(
        { error: "startTime must be before endTime" },
        { status: 400 },
      );
    }

    const updated = await db.territoryBlock.update({
      where: { id: block.id },
      data: {
        allDay: allDay ?? block.allDay,
        startTime: allDay === false ? startTime : null,
        endTime: allDay === false ? endTime : null,
      },
    });

    return NextResponse.json({ block: updated });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { blockId: string } },
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const block = await db.territoryBlock.findFirst({
      where: {
        id: params.blockId,
        tenantId,
      },
      include: {
        callPlan: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!block) {
      return NextResponse.json({ error: "Territory block not found" }, { status: 404 });
    }

    if (block.callPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.territoryBlock.delete({
      where: { id: block.id },
    });

    return NextResponse.json({ success: true });
  });
}
