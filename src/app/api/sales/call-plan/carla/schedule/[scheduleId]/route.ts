import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { parseISO, startOfDay } from "date-fns";
import { z } from "zod";

const updateScheduleSchema = z
  .object({
    scheduledDate: z.string().optional(),
    scheduledTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "scheduledTime must be HH:mm format")
      .optional(),
    duration: z.number().int().min(15).max(480).optional(),
  })
  .refine(
    (data) => data.scheduledDate || data.scheduledTime || data.duration,
    "At least one field must be provided for update",
  );

export async function PATCH(
  request: NextRequest,
  { params }: { params: { scheduleId: string } },
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const parsedBody = updateScheduleSchema.safeParse(await request.json().catch(() => ({})));

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsedBody.error.flatten() },
        { status: 400 },
      );
    }

    const schedule = await db.callPlanSchedule.findFirst({
      where: {
        id: params.scheduleId,
        tenantId,
      },
      include: {
        callPlan: {
          select: {
            id: true,
            userId: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
            city: true,
            state: true,
            territory: true,
            accountPriority: true,
            accountType: true,
            lastOrderDate: true,
          },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    if (schedule.callPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const data = parsedBody.data;
    const updateData: Record<string, unknown> = {};

    if (data.scheduledDate) {
      updateData.scheduledDate = startOfDay(parseISO(data.scheduledDate));
    }
    if (data.scheduledTime) {
      updateData.scheduledTime = data.scheduledTime;
    }
    if (typeof data.duration === "number") {
      if (data.duration % 15 !== 0) {
        return NextResponse.json(
          { error: "Duration must be in 15-minute increments" },
          { status: 400 },
        );
      }
      updateData.duration = data.duration;
    }

    try {
      const updated = await db.callPlanSchedule.update({
        where: { id: schedule.id },
        data: updateData,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              city: true,
              state: true,
              territory: true,
              accountPriority: true,
              accountType: true,
              lastOrderDate: true,
            },
          },
        },
      });

      return NextResponse.json({
        schedule: {
          id: updated.id,
          customerId: updated.customerId,
          scheduledDate: updated.scheduledDate.toISOString(),
          scheduledTime: updated.scheduledTime,
          duration: updated.duration,
          customer: {
            id: updated.customer.id,
            name: updated.customer.name,
            accountNumber: updated.customer.accountNumber,
            territory: updated.customer.territory,
            city: updated.customer.city,
            state: updated.customer.state,
            priority: updated.customer.accountPriority,
            accountType: updated.customer.accountType,
            lastOrderDate: updated.customer.lastOrderDate?.toISOString() ?? null,
          },
        },
      });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json(
          { error: "Account already scheduled at that time" },
          { status: 409 },
        );
      }

      console.error("[CallPlanSchedule][PATCH]", error);
      return NextResponse.json(
        { error: "Failed to update schedule" },
        { status: 500 },
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { scheduleId: string } },
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { scheduleId } = params;

    const schedule = await db.callPlanSchedule.findFirst({
      where: {
        id: scheduleId,
        tenantId,
      },
      include: {
        callPlan: {
          select: { id: true, userId: true },
        },
        customer: {
          select: { name: true },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json(
        { error: "Schedule not found or access denied" },
        { status: 404 },
      );
    }

    if (schedule.callPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await db.callPlanSchedule.delete({
      where: { id: schedule.id },
    });

    return NextResponse.json({
      success: true,
      message: `${schedule.customer.name} removed from schedule`,
    });
  });
}
