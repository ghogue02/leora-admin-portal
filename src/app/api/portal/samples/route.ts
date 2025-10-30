import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const SAMPLE_LINE_INCLUDE = {
  lines: {
    where: { isSample: true },
    include: {
      sku: {
        include: {
          product: true,
        },
      },
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.OrderInclude;

type SamplePayload = {
  skuId?: string;
  quantity?: number;
  notes?: string;
};

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50) : 20;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const scope = buildOrderScope(tenantId, session.portalUserId, session.portalUser.customerId);

      const [tenantSettings, usageAggregate, sampleOrders] = await Promise.all([
        db.tenantSettings.findUnique({ where: { tenantId } }),
        db.orderLine.aggregate({
          where: {
            isSample: true,
            order: {
              ...scope,
              orderedAt: {
                gte: startOfMonth,
              },
            },
          },
          _sum: {
            quantity: true,
          },
        }),
        db.order.findMany({
          where: {
            ...scope,
            lines: {
              some: { isSample: true },
            },
          },
          include: SAMPLE_LINE_INCLUDE,
          orderBy: {
            orderedAt: "desc",
          },
          take: limit,
        }),
      ]);

      const allowance = tenantSettings?.sampleAllowancePerMonth ?? 60;
      const used = usageAggregate._sum.quantity ?? 0;

      return NextResponse.json({
        allowance: {
          monthly: allowance,
          used,
          remaining: Math.max(allowance - used, 0),
          periodStart: startOfMonth,
        },
        samples: sampleOrders.map(serializeSampleOrder),
      });
    },
    { requiredPermissions: ["portal.samples.view"] },
  );
}

export async function POST(request: NextRequest) {
  let payload: SamplePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const skuId = payload.skuId?.trim();
  const quantity = Number.isFinite(payload.quantity) ? Number(payload.quantity) : 1;
  const notes = payload.notes?.trim();

  if (!skuId) {
    return NextResponse.json({ error: "skuId is required." }, { status: 400 });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be a positive integer." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      if (!session.portalUser.customerId) {
        return NextResponse.json(
          { error: "Portal user is not associated with a customer account." },
          { status: 400 },
        );
      }

      const [sku, tenantSettings, monthUsage] = await Promise.all([
        db.sku.findFirst({
          where: {
            id: skuId,
            tenantId,
            isActive: true,
          },
          include: {
            product: true,
            priceListItems: {
              include: {
                priceList: true,
              },
            },
          },
        }),
        db.tenantSettings.findUnique({ where: { tenantId } }),
        getMonthlySampleUsage(db, tenantId, session.portalUserId, session.portalUser.customerId),
      ]);

      if (!sku) {
        return NextResponse.json({ error: "SKU not found." }, { status: 404 });
      }

      const allowance = tenantSettings?.sampleAllowancePerMonth ?? 60;
      if (monthUsage.used + quantity > allowance) {
        return NextResponse.json(
          {
            error: "Sample allowance exceeded.",
            allowance,
            used: monthUsage.used,
          },
          { status: 409 },
        );
      }

      const now = new Date();
      const order = await db.order.create({
        data: {
          tenantId,
          customerId: session.portalUser.customerId,
          portalUserId: session.portalUserId,
          status: "SUBMITTED",
          orderedAt: now,
          currency: sku.priceListItems[0]?.priceList.currency ?? "USD",
          total: new Prisma.Decimal(0),
          lines: {
            create: [
              {
                tenantId,
                skuId: sku.id,
                quantity,
                unitPrice: new Prisma.Decimal(0),
                isSample: true,
              },
            ],
          },
        },
        include: SAMPLE_LINE_INCLUDE,
      });

      await ensureSampleLogActivityType(db, tenantId);
      await db.activity.create({
        data: {
          tenantId,
          activityType: {
            connect: {
              tenantId_code: {
                tenantId,
                code: SAMPLE_ACTIVITY_CODE,
              },
            },
          },
          portalUserId: session.portalUserId,
          customerId: session.portalUser.customerId,
          orderId: order.id,
          subject: `Sample requested: ${sku.product?.name ?? sku.code}`,
          notes: notes ?? null,
          occurredAt: now,
        },
      });

      return NextResponse.json({ sample: serializeSampleOrder(order) }, { status: 201 });
    },
    { requiredPermissions: ["portal.samples.manage"] },
  );
}

const SAMPLE_ACTIVITY_CODE = "sample_log";

async function ensureSampleLogActivityType(db: Prisma.PrismaClient, tenantId: string) {
  await db.activityType.upsert({
    where: {
      tenantId_code: {
        tenantId,
        code: SAMPLE_ACTIVITY_CODE,
      },
    },
    update: {},
    create: {
      tenantId,
      code: SAMPLE_ACTIVITY_CODE,
      name: "Sample Log",
      description: "Tracks sample distribution and follow-up activity.",
    },
  });
}

async function getMonthlySampleUsage(
  db: Prisma.PrismaClient,
  tenantId: string,
  portalUserId: string,
  customerId: string | null,
) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const scope = buildOrderScope(tenantId, portalUserId, customerId);

  const usage = await db.orderLine.aggregate({
    where: {
      isSample: true,
      order: {
        ...scope,
        orderedAt: { gte: startOfMonth },
      },
    },
    _sum: {
      quantity: true,
    },
  });

  return {
    used: usage._sum.quantity ?? 0,
    startOfMonth,
  };
}

function buildOrderScope(tenantId: string, portalUserId: string, customerId: string | null) {
  const base: Prisma.OrderWhereInput = { tenantId };
  if (customerId) {
    return {
      ...base,
      customerId,
    } satisfies Prisma.OrderWhereInput;
  }
  return {
    ...base,
    portalUserId,
  } satisfies Prisma.OrderWhereInput;
}

function serializeSampleOrder(
  order: Prisma.OrderGetPayload<{ include: typeof SAMPLE_LINE_INCLUDE }>,
) {
  return {
    id: order.id,
    status: order.status,
    orderedAt: order.orderedAt,
    fulfilledAt: order.fulfilledAt,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
        }
      : null,
    lines: order.lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      sku: {
        id: line.sku.id,
        code: line.sku.code,
        name: line.sku.product?.name ?? null,
        brand: line.sku.product?.brand ?? null,
      },
    })),
  };
}
