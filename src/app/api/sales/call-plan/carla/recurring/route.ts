import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { z } from "zod";

const createRecurringSchema = z.object({
  customerId: z.string().uuid(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  preferredTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
});

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { searchParams } = request.nextUrl;
    const customerId = searchParams.get("customerId");

    const where: Record<string, unknown> = {
      tenantId,
      active: true,
    };

    if (customerId) {
      where.customerId = customerId;
    }

    const recurringSchedules = await db.recurringCallPlan.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            accountNumber: true,
            territory: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ recurringSchedules });
  });
}

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const body = await request.json();
      const parsed = createRecurringSchema.parse(body);

      const recurringSchedule = await db.recurringCallPlan.create({
        data: {
          tenantId,
          customerId: parsed.customerId,
          frequency: parsed.frequency,
          dayOfWeek: parsed.dayOfWeek,
          preferredTime: parsed.preferredTime,
          active: true,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
            },
          },
        },
      });

      return NextResponse.json({ recurringSchedule });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid request", details: error.errors },
          { status: 400 },
        );
      }

      console.error("[RecurringSchedule][POST]", error);
      return NextResponse.json(
        { error: "Failed to create recurring schedule" },
        { status: 500 },
      );
    }
  });
}
