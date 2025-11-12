#!/usr/bin/env ts-node

import { PrismaClient, AccountPriority, OrderStatus } from "@prisma/client";
import { subMonths } from "date-fns";

const prisma = new PrismaClient();

const HIGH_THRESHOLD = 2500; // avg monthly revenue >= $2.5k
const MEDIUM_THRESHOLD = 1000; // avg monthly revenue >= $1k
const MONTHS = 6;
const BATCH_SIZE = 250;

function determinePriority(totalRevenueSixMonths: number): AccountPriority {
  const avgMonthly = totalRevenueSixMonths / MONTHS;

  if (avgMonthly >= HIGH_THRESHOLD) return "HIGH";
  if (avgMonthly >= MEDIUM_THRESHOLD) return "MEDIUM";
  return "LOW";
}

async function recomputePriorities() {
  const sixMonthsAgo = subMonths(new Date(), MONTHS);

  const customers = await prisma.customer.findMany({
    where: {
      accountPriorityManuallySet: false,
      isPermanentlyClosed: false,
    },
    select: {
      id: true,
      accountPriority: true,
      accountPriorityAutoAssignedAt: true,
    },
  });

  const customerIds = customers.map((c) => c.id);

  const revenueRows = await prisma.order.groupBy({
    by: ["customerId"],
    where: {
      customerId: { in: customerIds },
      status: { not: OrderStatus.CANCELLED },
      orderedAt: { gte: sixMonthsAgo },
    },
    _sum: {
      total: true,
    },
  });

  const revenueMap = new Map<string, number>();
  for (const row of revenueRows) {
    revenueMap.set(row.customerId, Number(row._sum.total ?? 0));
  }

  let updates = 0;

  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);

    const tx = batch
      .map((customer) => {
        const totalRevenueSixMonths = revenueMap.get(customer.id) ?? 0;
        const nextPriority = determinePriority(totalRevenueSixMonths);

        const needsPriorityUpdate = customer.accountPriority !== nextPriority;
        const needsTimestamp = !customer.accountPriorityAutoAssignedAt;

        if (!needsPriorityUpdate && !needsTimestamp) {
          return null;
        }

        updates += needsPriorityUpdate ? 1 : 0;

        return prisma.customer.update({
          where: { id: customer.id },
          data: {
            accountPriority: nextPriority,
            accountPriorityAutoAssignedAt: new Date(),
          },
        });
      })
      .filter(Boolean) as Array<ReturnType<typeof prisma.customer.update>>;

    if (tx.length > 0) {
      await prisma.$transaction(tx);
    }

    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`Processed ${Math.min(i + BATCH_SIZE, customers.length)} / ${customers.length}`);
    }
  }

  // Backfill any remaining NULL priorities (e.g., manual accounts) with LOW
  const nullCount = await prisma.customer.count({
    where: { accountPriority: null },
  });
  if (nullCount > 0) {
    await prisma.customer.updateMany({
      where: { accountPriority: null },
      data: {
        accountPriority: "LOW",
        accountPriorityAutoAssignedAt: new Date(),
      },
    });
  }

  console.log(
    `Recomputed priorities for ${customers.length} customers (${updates} updated). Nulls remaining: ${nullCount}`,
  );
}

recomputePriorities()
  .catch((error) => {
    console.error("Failed to recompute account priorities", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
