import { PrismaClient } from "@prisma/client";
import { subMonths } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const reps = await prisma.salesRep.findMany({
    where: { isActive: true },
    select: {
      id: true,
      territoryName: true,
      user: { select: { fullName: true, email: true } },
    },
  });

  const counts = await prisma.customer.groupBy({
    by: ["salesRepId", "accountPriority"],
    where: {
      isPermanentlyClosed: false,
    },
    _count: { _all: true },
  });

  const repTotals = await prisma.customer.groupBy({
    by: ["salesRepId"],
    where: { isPermanentlyClosed: false },
    _count: { _all: true },
  });

  const totalMap = new Map(repTotals.map((row) => [row.salesRepId, row._count._all]));

  const summary = reps.map((rep) => {
    const totals: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 };
    for (const row of counts) {
      if (row.salesRepId === rep.id) {
        const bucket = row.accountPriority ?? "NONE";
        totals[bucket] = (totals[bucket] ?? 0) + row._count._all;
      }
    }
    const total = totalMap.get(rep.id) ?? 0;
    const pct = (value: number) => (total > 0 ? `${((value / total) * 100).toFixed(1)}%` : "0.0%");
    return {
      rep: rep.user.fullName,
      territory: rep.territoryName ?? "",
      total,
      high: `${totals.HIGH} (${pct(totals.HIGH)})`,
      medium: `${totals.MEDIUM} (${pct(totals.MEDIUM)})`,
      low: `${totals.LOW} (${pct(totals.LOW)})`,
      none: `${totals.NONE} (${pct(totals.NONE)})`,
    };
  });

  console.table(summary);

  const globalTotals = counts.reduce<Record<string, number>>((acc, row) => {
    const bucket = row.accountPriority ?? "NONE";
    acc[bucket] = (acc[bucket] ?? 0) + row._count._all;
    return acc;
  }, { HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0 });

  const globalTotal = Object.values(globalTotals).reduce((sum, value) => sum + value, 0);
  console.log("Global distribution:");
  for (const [bucket, value] of Object.entries(globalTotals)) {
    const percentage = globalTotal > 0 ? ((value / globalTotal) * 100).toFixed(1) : "0.0";
    console.log(`  ${bucket}: ${value} (${percentage}%)`);
  }

  const sixMonthsAgo = subMonths(new Date(), 6);
  const revenueRows = await prisma.order.groupBy({
    by: ["customerId"],
    where: {
      orderedAt: { gte: sixMonthsAgo },
      status: { not: "CANCELLED" },
    },
    _sum: { total: true },
  });

  const monthlyAverages = revenueRows
    .map((row) => Number(row._sum.total ?? 0) / 6)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  const percentile = (p: number) => {
    if (monthlyAverages.length === 0) return 0;
    const idx = Math.min(
      monthlyAverages.length - 1,
      Math.max(0, Math.round((p / 100) * (monthlyAverages.length - 1)))
    );
    return monthlyAverages[idx];
  };

  console.log("\nAvg monthly revenue percentiles (trailing six months):");
  for (const p of [50, 75, 90, 95, 99]) {
    console.log(`  ${p}th percentile: $${percentile(p).toFixed(2)}`);
  }

  const topCustomers = revenueRows
    .filter((row) => Number(row._sum.total ?? 0) > 0)
    .sort((a, b) => Number(b._sum.total ?? 0) - Number(a._sum.total ?? 0))
    .slice(0, 10);
  const topCustomerRecords = await prisma.customer.findMany({
    where: { id: { in: topCustomers.map((row) => row.customerId) } },
    select: { id: true, name: true, accountPriority: true },
  });
  const nameMap = new Map(topCustomerRecords.map((c) => [c.id, c]));
  console.log("\nTop 10 customers by trailing six-month revenue:");
  console.table(
    topCustomers.map((row) => {
      const customer = nameMap.get(row.customerId);
      const sixMonthTotal = Number(row._sum.total ?? 0);
      return {
        name: customer?.name ?? row.customerId,
        priority: customer?.accountPriority ?? "NONE",
        revenueSixMonths: `$${sixMonthTotal.toFixed(2)}`,
        avgMonthly: `$${(sixMonthTotal / 6).toFixed(2)}`,
      };
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
