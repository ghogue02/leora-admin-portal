import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const upsertBlockSchema = z
  .object({
    callPlanId: z.string().uuid(),
    territory: z.string().min(1),
    dayOfWeek: z.number().int().min(1).max(7),
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

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const callPlanId = request.nextUrl.searchParams.get("callPlanId");

    if (!callPlanId) {
      return NextResponse.json({ error: "callPlanId is required" }, { status: 400 });
    }

    const callPlan = await db.callPlan.findFirst({
      where: {
        id: callPlanId,
        tenantId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!callPlan) {
      return NextResponse.json({ error: "Call plan not found" }, { status: 404 });
    }

    const blocks = await db.territoryBlock.findMany({
      where: { tenantId, callPlanId },
      orderBy: [{ dayOfWeek: "asc" }, { territory: "asc" }],
    });

    return NextResponse.json({ blocks });
  });
}

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const parsed = upsertBlockSchema.safeParse(await request.json().catch(() => ({})));

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { callPlanId, territory, dayOfWeek, allDay = true, startTime, endTime } = parsed.data;

    const callPlan = await db.callPlan.findFirst({
      where: {
        id: callPlanId,
        tenantId,
        userId: session.user.id,
      },
      select: { id: true },
    });

    if (!callPlan) {
      return NextResponse.json({ error: "Call plan not found" }, { status: 404 });
    }

    const territoryWhere: Prisma.TerritoryWhereInput = {
      tenantId,
      name: territory,
    };

    if (session.user.salesRep?.id) {
      territoryWhere.OR = [
        { salesRepId: session.user.salesRep.id },
        { salesRepId: null },
      ];
    }

    const territoryRecord = await db.territory.findFirst({
      where: territoryWhere,
      select: { id: true },
    });

    if (!territoryRecord) {
      return NextResponse.json(
        { error: "Territory not found for tenant" },
        { status: 404 },
      );
    }

    if (allDay === false && startTime && endTime && startTime >= endTime) {
      return NextResponse.json(
        { error: "startTime must be before endTime" },
        { status: 400 },
      );
    }

    const block = await db.territoryBlock.upsert({
      where: {
        tenantId_callPlanId_dayOfWeek_territory: {
          tenantId,
          callPlanId,
          dayOfWeek,
          territory,
        },
      },
      create: {
        tenantId,
        callPlanId,
        territory,
        dayOfWeek,
        allDay,
        startTime,
        endTime,
      },
      update: {
        allDay,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
      },
    });

    return NextResponse.json({ block });
  });
}
