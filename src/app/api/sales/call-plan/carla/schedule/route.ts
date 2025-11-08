import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { parseISO, startOfDay, startOfWeek, endOfWeek } from "date-fns";
import { z } from "zod";
import { Prisma, PrismaClient } from "@prisma/client";

const BLOCK_TYPES = ["DRIVE_TIME", "ADMIN"] as const;
type BlockType = (typeof BLOCK_TYPES)[number];

const BLOCK_METADATA: Record<BlockType, { externalId: string; name: string }> = {
  DRIVE_TIME: {
    externalId: "call-plan-block:drive-time",
    name: "Drive Time",
  },
  ADMIN: {
    externalId: "call-plan-block:admin",
    name: "Admin",
  },
};

const createScheduleSchema = z
  .object({
    callPlanId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    blockType: z.enum(BLOCK_TYPES).optional(),
    scheduledDate: z.string().min(1),
    scheduledTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "scheduledTime must be HH:mm format"),
    duration: z.number().int().min(15).max(480).optional(),
  })
  .refine((data) => data.customerId || data.blockType, {
    message: "customerId or blockType is required",
    path: ["customerId"],
  });

const resolveBlockType = (externalId?: string | null): BlockType | null => {
  if (!externalId) return null;
  const match = (Object.keys(BLOCK_METADATA) as BlockType[]).find(
    (key) => BLOCK_METADATA[key].externalId === externalId
  );
  return match ?? null;
};

async function ensureBlockCustomer(
  db: PrismaClient,
  tenantId: string,
  blockType: BlockType
) {
  const metadata = BLOCK_METADATA[blockType];
  const customer = await db.customer.upsert({
    where: {
      tenantId_externalId: {
        tenantId,
        externalId: metadata.externalId,
      },
    },
    update: {},
    create: {
      tenantId,
      externalId: metadata.externalId,
      name: metadata.name,
      accountNumber: null,
    },
  });
  return customer;
}

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = request.nextUrl;
    const callPlanId = searchParams.get("callPlanId");
    const weekStartParam = searchParams.get("weekStart");

    if (!callPlanId) {
      return NextResponse.json({ error: "callPlanId is required" }, { status: 400 });
    }

    if (!weekStartParam) {
      return NextResponse.json({ error: "weekStart is required" }, { status: 400 });
    }

    const weekStartDate = startOfWeek(parseISO(weekStartParam), { weekStartsOn: 1 });
    const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 1 });

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

    const [callPlanAccounts, schedules, territoryBlocks, plannedTasks] = await Promise.all([
      db.callPlanAccount.findMany({
        where: { callPlanId, tenantId },
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
              externalId: true,
            },
          },
        },
        orderBy: {
          addedAt: "asc",
        },
      }),
      db.callPlanSchedule.findMany({
        where: {
          tenantId,
          callPlanId,
          scheduledDate: {
            gte: weekStartDate,
            lte: weekEndDate,
          },
        },
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
        orderBy: [
          { scheduledDate: "asc" },
          { scheduledTime: "asc" },
        ],
      }),
      db.territoryBlock.findMany({
        where: {
          tenantId,
          callPlanId,
        },
        orderBy: [
          { dayOfWeek: "asc" },
          { territory: "asc" },
        ],
      }),
      db.task.findMany({
        where: {
          tenantId,
          callPlanId,
          customerId: {
            not: null,
          },
          dueAt: {
            gte: weekStartDate,
            lte: weekEndDate,
          },
        },
        select: {
          customerId: true,
        },
      }),
    ]);

    const scheduledCustomerIds = new Set(schedules.map((schedule) => schedule.customerId));
    const plannedCustomerIds = new Set(
      plannedTasks
        .map((task) => task.customerId)
        .filter((id): id is string => Boolean(id))
    );

    const unscheduledAccounts = callPlanAccounts
      .filter((account) => !scheduledCustomerIds.has(account.customerId))
      .filter((account) => plannedCustomerIds.has(account.customerId))
      .map((account) => ({
        callPlanAccountId: account.id,
        customerId: account.customerId,
        customerName: account.customer.name,
        accountNumber: account.customer.accountNumber,
        territory: account.customer.territory,
        city: account.customer.city,
        state: account.customer.state,
        priority: account.customer.accountPriority,
        accountType: account.customer.accountType,
        objective: account.objective,
        lastOrderDate: account.customer.lastOrderDate?.toISOString() ?? null,
      }));

    const scheduleEvents = schedules.map((schedule) => ({
      id: schedule.id,
      customerId: schedule.customerId,
      scheduledDate: schedule.scheduledDate.toISOString(),
      scheduledTime: schedule.scheduledTime,
      duration: schedule.duration,
      googleEventId: schedule.googleEventId,
      outlookEventId: schedule.outlookEventId,
      blockType: resolveBlockType(schedule.customer.externalId),
      customer: {
        id: schedule.customer.id,
        name: schedule.customer.name,
        accountNumber: schedule.customer.accountNumber,
        territory: schedule.customer.territory,
        city: schedule.customer.city,
        state: schedule.customer.state,
        priority: schedule.customer.accountPriority,
        accountType: schedule.customer.accountType,
        lastOrderDate: schedule.customer.lastOrderDate?.toISOString() ?? null,
      },
    }));

    return NextResponse.json({
      callPlanId,
      schedules: scheduleEvents,
      unscheduledAccounts,
      territoryBlocks,
    });
  });
}

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const body = await request.json();
      const parsed = createScheduleSchema.safeParse({
        ...body,
        duration: body.duration ? Number(body.duration) : undefined,
      });

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const { callPlanId, customerId, blockType, scheduledDate, scheduledTime } = parsed.data;
      const duration = parsed.data.duration ?? 30;
      const scheduleDate = startOfDay(parseISO(scheduledDate));

      if (duration % 15 !== 0) {
        return NextResponse.json(
          { error: "Duration must be in 15-minute increments" },
          { status: 400 },
        );
      }

      let targetCustomerId = customerId ?? null;
      const resolvedBlockType: BlockType | null = blockType ?? null;

      if (resolvedBlockType) {
        const blockCustomer = await ensureBlockCustomer(db, tenantId, resolvedBlockType);
        targetCustomerId = blockCustomer.id;
      }

      if (!targetCustomerId) {
        return NextResponse.json({ error: "customerId is required" }, { status: 400 });
      }

      const callPlan = await db.callPlan.findFirst({
        where: {
          id: callPlanId,
          tenantId,
          userId: session.user.id,
        },
        include: resolvedBlockType
          ? undefined
          : {
              accounts: {
                where: { customerId: targetCustomerId },
                select: { id: true },
              },
            },
      });

      if (!callPlan) {
        return NextResponse.json({ error: "Call plan not found" }, { status: 404 });
      }

      if (
        !resolvedBlockType &&
        (!callPlan.accounts || callPlan.accounts.length === 0)
      ) {
        return NextResponse.json(
          { error: "Account is not part of this call plan" },
          { status: 400 },
        );
      }

      const schedule = await db.callPlanSchedule.create({
        data: {
          tenantId,
          callPlanId,
          customerId: targetCustomerId,
          scheduledDate: scheduleDate,
          scheduledTime,
          duration,
        },
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
              externalId: true,
            },
          },
        },
      });

      return NextResponse.json({
        schedule: {
          id: schedule.id,
          customerId: schedule.customerId,
          scheduledDate: schedule.scheduledDate.toISOString(),
          scheduledTime: schedule.scheduledTime,
          duration: schedule.duration,
          blockType: resolveBlockType(schedule.customer.externalId),
          customer: {
            id: schedule.customer.id,
            name: schedule.customer.name,
            accountNumber: schedule.customer.accountNumber,
            territory: schedule.customer.territory,
            city: schedule.customer.city,
            state: schedule.customer.state,
            priority: schedule.customer.accountPriority,
            accountType: schedule.customer.accountType,
            lastOrderDate: schedule.customer.lastOrderDate?.toISOString() ?? null,
          },
        },
      });
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return NextResponse.json(
          { error: "Account already scheduled at that time" },
          { status: 409 },
        );
      }

      console.error("[CallPlanSchedule][POST]", error);
      return NextResponse.json(
        { error: "Failed to create schedule" },
        { status: 500 },
      );
    }
  });
}
