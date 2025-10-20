import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    throw new Error("No tenant found. Seed aborted.");
  }

  const existingOrders = await prisma.order.count({
    where: { tenantId: tenant.id },
  });

  if (existingOrders > 0) {
    console.log("[seed-portal-demo] Orders already exist—skipping demo seed.");
    return;
  }

  const portalUser = await prisma.portalUser.findFirst({
    where: { tenantId: tenant.id },
  });

  if (!portalUser) {
    throw new Error("No portal user found. Create a portal user before seeding demo data.");
  }

  const customers = await prisma.customer.findMany({
    where: { tenantId: tenant.id },
    take: 5,
  });

  if (customers.length === 0) {
    throw new Error("No customers found for tenant. Seed customers before running this demo seed.");
  }

  const catalog = await prisma.priceListItem.findMany({
    where: { tenantId: tenant.id },
    include: {
      sku: {
        select: {
          id: true,
          code: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
      priceList: {
        select: {
          currency: true,
        },
      },
    },
    take: 40,
  });

  if (catalog.length === 0) {
    throw new Error("No price list items found. Seed catalog data before running this demo seed.");
  }

  const activityType = await prisma.activityType.upsert({
    where: {
      tenantId_code: {
        tenantId: tenant.id,
        code: "portal.follow-up",
      },
    },
    update: {
      name: "Portal follow-up",
      description: "Automated sales cadence follow-up seeded for demo data.",
    },
    create: {
      tenantId: tenant.id,
      name: "Portal follow-up",
      code: "portal.follow-up",
      description: "Automated sales cadence follow-up seeded for demo data.",
    },
    select: { id: true },
  });

  const now = new Date();
  const createdOrderIds: string[] = [];

  for (let index = 0; index < 8; index += 1) {
    const customer = customers[index % customers.length];
    const orderDate = new Date(now);
    orderDate.setDate(orderDate.getDate() - (index * 4 + 3));
    orderDate.setHours(11, 30, 0, 0);
    const fulfillmentDate = new Date(orderDate);
    fulfillmentDate.setDate(orderDate.getDate() + 2);

    const lineItems = pickRandomItems(catalog, 3 + (index % 3));
    let orderTotal = 0;

    const orderLines = lineItems.map((item, lineIndex) => {
      const quantity = 3 + ((index + lineIndex) % 4);
      const unitPrice = Number(item.price);
      orderTotal += unitPrice * quantity;

      return {
        tenantId: tenant.id,
        skuId: item.sku.id,
        quantity,
        unitPrice: new Prisma.Decimal(unitPrice.toFixed(2)),
        appliedPricingRules: null,
      };
    });

    const order = await prisma.order.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        portalUserId: portalUser.id,
        status: "FULFILLED",
        orderedAt: orderDate,
        fulfilledAt: fulfillmentDate,
        currency: "USD",
        total: new Prisma.Decimal(orderTotal.toFixed(2)),
        lines: {
          create: orderLines,
        },
        invoices: {
          create: {
            tenantId: tenant.id,
            customerId: customer.id,
            invoiceNumber: `INV-${String(101 + index)}`,
            status: "PAID",
            subtotal: new Prisma.Decimal(orderTotal.toFixed(2)),
            total: new Prisma.Decimal(orderTotal.toFixed(2)),
            issuedAt: orderDate,
            dueDate: addDays(orderDate, 30),
          },
        },
      },
      select: {
        id: true,
        customerId: true,
      },
    });

    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        activityTypeId: activityType.id,
        portalUserId: portalUser.id,
        customerId: order.customerId,
        orderId: order.id,
        subject: "Automated fulfilment follow-up",
        notes: "Demo activity generated to support portal analytics.",
        occurredAt: addHours(orderDate, 36),
        outcome: "SUCCESS",
      },
    });

    createdOrderIds.push(order.id);
  }

  const replayFeeds = ["orders", "invoices", "activities"];
  const completedAt = new Date();
  const startedAt = addMinutes(completedAt, -3);

  for (const feed of replayFeeds) {
    await prisma.portalReplayStatus.upsert({
      where: {
        tenantId_feed: {
          tenantId: tenant.id,
          feed,
        },
      },
      update: {
        status: "COMPLETED",
        startedAt,
        completedAt,
        recordCount: createdOrderIds.length,
        errorCount: 0,
        durationMs: 180000,
      },
      create: {
        tenantId: tenant.id,
        feed,
        status: "COMPLETED",
        startedAt,
        completedAt,
        recordCount: createdOrderIds.length,
        errorCount: 0,
        durationMs: 180000,
      },
    });
  }

  console.log(`[seed-portal-demo] Created ${createdOrderIds.length} orders, invoices, activities, and replay snapshots.`);
}

function pickRandomItems<T>(items: T[], count: number): T[] {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone.slice(0, Math.max(1, Math.min(count, clone.length)));
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addHours(date: Date, hours: number) {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

function addMinutes(date: Date, minutes: number) {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error("[seed-portal-demo] Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
