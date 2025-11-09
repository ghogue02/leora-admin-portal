import type { AccountType, Prisma, PrismaClient } from "@prisma/client";
import {
  calculateKaplanMeierMedian,
  calculateMedian,
  calculatePercentile,
  calculatePortfolioScores,
  CustomerSignalClassification,
  classifyCustomerSignal,
} from "@/lib/sales/customer-health-metrics";
import { differenceInCalendarDays, subDays } from "date-fns";

type SignalBucket = {
  classification: CustomerSignalClassification;
  count: number;
  percentOfActive: number;
  percentOfAssigned: number;
  revenueShare: number;
  topCustomers: Array<{ id: string; name: string; revenue: number }>;
};

export type CustomerHealthReportRow = {
  customerId: string;
  name: string;
  accountType: AccountType | null;
  classification: CustomerSignalClassification;
  trailingTwelveRevenue: number;
  averageMonthlyRevenue: number;
  last90Revenue: number;
  last60Revenue: number;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  isDormant: boolean;
  targetStartDate: string | null;
  firstOrderDate: string | null;
  ttfoDays: number | null;
};

export type CustomerHealthSnapshot = {
  assignedCustomersCount: number;
  coverage: {
    assigned: number;
    active: number;
    targets: number;
    prospects: number;
    unassigned: number;
  };
  signals: {
    buckets: Record<CustomerSignalClassification, SignalBucket>;
    totals: {
      assigned: number;
      active: number;
    };
  };
  portfolio: {
    healthyCount: number;
    healthyPercent: number;
    immediateAttentionCount: number;
    immediateAttentionPercent: number;
    downCount: number;
    dormantCount: number;
    totalActive: number;
    weightedScore: number | null;
    unweightedScore: number | null;
  };
  targetPipeline: {
    assignedCount: number;
    turnedActiveCount: number;
    turnedActivePercent: number;
    visitedCount: number;
    visitedPercent: number;
    ttfoMedianDays: number | null;
    ttfoP75Days: number | null;
    ttfoKmMedianDays: number | null;
  };
  coldLeads: {
    count: number;
    dormantToColdCount: number;
    sample: Array<{ id: string; name: string }>;
  };
  accountPulse: {
    direction: "UP" | "FLAT" | "DOWN";
    deltaPercent: number;
    summary: string;
    dominantSignal: CustomerSignalClassification;
    dormantCount: number;
    totalCustomers: number;
  };
  reportRows: CustomerHealthReportRow[];
};

type BuildParams = {
  db: PrismaClient | Prisma.TransactionClient;
  tenantId: string;
  salesRepId: string;
  userId: string;
  now?: Date;
};

export async function buildCustomerHealthSnapshot({
  db,
  tenantId,
  salesRepId,
  userId,
  now: providedNow,
}: BuildParams): Promise<CustomerHealthSnapshot> {
  const now = providedNow ?? new Date();
  const lookback365 = subDays(now, 365);
  const lookback730 = subDays(now, 730);
  const lookback90 = subDays(now, 90);
  const lookback60 = subDays(now, 60);
  const lookback45 = subDays(now, 45);
  const lookback30 = subDays(now, 30);

  const assignedCustomers = await db.customer.findMany({
    where: {
      tenantId,
      salesRepId,
      isPermanentlyClosed: false,
    },
    select: {
      id: true,
      name: true,
      accountType: true,
      lastOrderDate: true,
      dormancySince: true,
      riskStatus: true,
      establishedRevenue: true,
      createdAt: true,
      assignments: {
        where: {
          tenantId,
          salesRepId,
          unassignedAt: null,
        },
        orderBy: {
          assignedAt: "desc",
        },
        take: 1,
        select: {
          assignedAt: true,
        },
      },
    },
  });

  const assignedIds = assignedCustomers.map((customer) => customer.id);
  const targetCustomers = assignedCustomers.filter((customer) => customer.accountType === "TARGET");
  const prospectCustomers = assignedCustomers.filter((customer) => customer.accountType === "PROSPECT");
  const targetIds = targetCustomers.map((customer) => customer.id);
  const targetOrProspectIds = assignedCustomers
    .filter((customer) => customer.accountType === "TARGET" || customer.accountType === "PROSPECT")
    .map((customer) => customer.id);

  const [ttmRevenueRows, last90Rows, last60Rows, targetFirstOrderRows, targetActivities, coldLeadActivities] = assignedIds.length
    ? await Promise.all([
        db.order.groupBy({
          by: ["customerId"],
          where: {
            tenantId,
            customerId: { in: assignedIds },
            deliveredAt: {
              gte: lookback365,
              lte: now,
            },
            status: { not: "CANCELLED" },
          },
          _sum: { total: true },
        }),
        db.order.groupBy({
          by: ["customerId"],
          where: {
            tenantId,
            customerId: { in: assignedIds },
            deliveredAt: {
              gte: lookback90,
              lte: now,
            },
            status: { not: "CANCELLED" },
          },
          _sum: { total: true },
        }),
        db.order.groupBy({
          by: ["customerId"],
          where: {
            tenantId,
            customerId: { in: assignedIds },
            deliveredAt: {
              gte: lookback60,
              lte: now,
            },
            status: { not: "CANCELLED" },
          },
          _sum: { total: true },
        }),
        targetIds.length
          ? db.order.groupBy({
              by: ["customerId"],
              where: {
                tenantId,
                customerId: { in: targetIds },
              },
              _min: { orderedAt: true },
            })
          : Promise.resolve([]),
        targetIds.length
          ? db.activity.findMany({
              where: {
                tenantId,
                customerId: { in: targetIds },
                userId,
                occurredAt: {
                  gte: lookback30,
                  lte: now,
                },
              },
              select: {
                customerId: true,
                activityType: {
                  select: {
                    code: true,
                  },
                },
              },
            })
          : Promise.resolve([]),
        targetOrProspectIds.length
          ? db.activity.findMany({
              where: {
                tenantId,
                customerId: { in: targetOrProspectIds },
                userId,
                occurredAt: {
                  gte: lookback30,
                  lte: now,
                },
              },
              select: {
                customerId: true,
                id: true,
              },
            })
          : Promise.resolve([]),
      ])
    : [[], [], [], [], [], []];

  const mapFromRows = (rows: Array<{ customerId: string; _sum: { total: Prisma.Decimal | null } }>) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.customerId, Number(row._sum.total ?? 0));
    }
    return map;
  };

  const ttmMap = mapFromRows(ttmRevenueRows as Array<{ customerId: string; _sum: { total: Prisma.Decimal | null } }>);
  const last90Map = mapFromRows(last90Rows as Array<{ customerId: string; _sum: { total: Prisma.Decimal | null } }>);
  const last60Map = mapFromRows(last60Rows as Array<{ customerId: string; _sum: { total: Prisma.Decimal | null } }>);

  const firstOrderMap = new Map<string, Date>();
  for (const row of targetFirstOrderRows as Array<{ customerId: string; _min: { orderedAt: Date | null } }>) {
    if (row._min.orderedAt) {
      firstOrderMap.set(row.customerId, row._min.orderedAt);
    }
  }

  const targetVisitSet = new Set<string>();
  for (const activity of targetActivities as Array<{ customerId: string; activityType: { code: string | null } | null }>) {
    const code = activity.activityType?.code?.toLowerCase() ?? "";
    if (code.includes("visit") || code.includes("in_person")) {
      targetVisitSet.add(activity.customerId);
    }
  }

  const recentActivitySet = new Set<string>((coldLeadActivities as Array<{ customerId: string }>).map((activity) => activity.customerId));

  const reportRows: CustomerHealthReportRow[] = [];

  const bucketSums: Record<CustomerSignalClassification, number> = {
    GROWING: 0,
    FLAT: 0,
    SHRINKING: 0,
    DORMANT: 0,
  };

  const bucketCounts: Record<CustomerSignalClassification, number> = {
    GROWING: 0,
    FLAT: 0,
    SHRINKING: 0,
    DORMANT: 0,
  };

  for (const customer of assignedCustomers) {
    const trailing = ttmMap.get(customer.id) ?? 0;
    const last90 = last90Map.get(customer.id) ?? 0;
    const last60 = last60Map.get(customer.id) ?? 0;
    const lastOrderDate = customer.lastOrderDate ?? null;
    const isDormant = Boolean(lastOrderDate) && lastOrderDate <= lookback45 && lastOrderDate >= lookback730;
    const classification = classifyCustomerSignal({
      isDormant,
      trailingTwelveRevenue: trailing,
      last90Revenue: last90,
      last60Revenue: last60,
    });

    bucketCounts[classification] += 1;
    bucketSums[classification] += trailing;

    const assignmentStart = customer.assignments[0]?.assignedAt ?? customer.createdAt;
    const firstOrder = firstOrderMap.get(customer.id) ?? null;
    const ttfoDays = assignmentStart && firstOrder ? Math.max(0, differenceInCalendarDays(firstOrder, assignmentStart)) : null;

    reportRows.push({
      customerId: customer.id,
      name: customer.name,
      accountType: customer.accountType ?? null,
      classification,
      trailingTwelveRevenue: trailing,
      averageMonthlyRevenue: trailing / 12,
      last90Revenue: last90,
      last60Revenue: last60,
      lastOrderDate: lastOrderDate ? lastOrderDate.toISOString() : null,
      daysSinceLastOrder: lastOrderDate ? differenceInCalendarDays(now, lastOrderDate) : null,
      isDormant,
      targetStartDate: assignmentStart ? assignmentStart.toISOString() : null,
      firstOrderDate: firstOrder ? firstOrder.toISOString() : null,
      ttfoDays,
    });
  }

  const assignedCount = assignedCustomers.length;
  const activeRows = reportRows.filter((row) => row.trailingTwelveRevenue > 0);
  const activeCount = activeRows.length;
  const totalActiveRevenue = activeRows.reduce((sum, row) => sum + row.trailingTwelveRevenue, 0);

  const buildBucket = (classification: CustomerSignalClassification): SignalBucket => {
    const rows = reportRows.filter((row) => row.classification === classification);
    const revenue = rows.reduce((sum, row) => sum + row.trailingTwelveRevenue, 0);
    const topCustomers = rows
      .slice()
      .sort((a, b) => b.trailingTwelveRevenue - a.trailingTwelveRevenue)
      .slice(0, 5)
      .map((row) => ({ id: row.customerId, name: row.name, revenue: row.trailingTwelveRevenue }));

    return {
      classification,
      count: rows.length,
      percentOfActive: activeCount ? (rows.length / activeCount) * 100 : 0,
      percentOfAssigned: assignedCount ? (rows.length / assignedCount) * 100 : 0,
      revenueShare: totalActiveRevenue ? revenue / totalActiveRevenue : 0,
      topCustomers,
    };
  };

  const buckets: Record<CustomerSignalClassification, SignalBucket> = {
    GROWING: buildBucket("GROWING"),
    FLAT: buildBucket("FLAT"),
    SHRINKING: buildBucket("SHRINKING"),
    DORMANT: buildBucket("DORMANT"),
  };

  const portfolioScores = calculatePortfolioScores({
    customers: reportRows.map((row) => ({
      classification: row.classification,
      trailingTwelveRevenue: row.trailingTwelveRevenue,
    })),
  });

  const healthyCount = bucketCounts.GROWING + bucketCounts.FLAT;
  const immediateAttentionCount = bucketCounts.SHRINKING + bucketCounts.DORMANT;

  const targetAssignments = targetCustomers.map((customer) => ({
    id: customer.id,
    assignmentStart: customer.assignments[0]?.assignedAt ?? customer.createdAt,
    firstOrderDate: firstOrderMap.get(customer.id) ?? null,
  }));

  const targetsTurnedActiveCount = targetAssignments.filter(
    (entry) => entry.firstOrderDate && entry.firstOrderDate >= lookback30
  ).length;

  const ttfoRealized: number[] = [];
  const ttfoObservations: Array<{ time: number; event: boolean }> = [];
  for (const entry of targetAssignments) {
    if (!entry.assignmentStart) {
      continue;
    }
    const eventDate = entry.firstOrderDate ?? now;
    const days = Math.max(0, differenceInCalendarDays(eventDate, entry.assignmentStart));
    if (entry.firstOrderDate) {
      ttfoRealized.push(days);
    }
    ttfoObservations.push({ time: days, event: Boolean(entry.firstOrderDate) });
  }

  const coldLeads = assignedCustomers.filter((customer) => {
    if (customer.accountType !== "TARGET" && customer.accountType !== "PROSPECT") {
      return false;
    }
    if (recentActivitySet.has(customer.id)) {
      return false;
    }
    if (!customer.lastOrderDate) {
      return true;
    }
    return customer.lastOrderDate < lookback730;
  });

  const dormantToColdCount = coldLeads.filter((customer) => Boolean(customer.lastOrderDate)).length;

  const bookTtm = reportRows.reduce((sum, row) => sum + row.trailingTwelveRevenue, 0);
  const bookLast60 = reportRows.reduce((sum, row) => sum + row.last60Revenue, 0);
  const bookLast90 = reportRows.reduce((sum, row) => sum + row.last90Revenue, 0);
  const expected90 = (bookTtm / 12) * 3;
  const expected60 = (bookTtm / 12) * 2;

  let direction: "UP" | "FLAT" | "DOWN" = "FLAT";
  if (expected90 > 0 && bookLast90 >= expected90 * 1.05) {
    direction = "UP";
  } else if (expected60 > 0) {
    const ratio = bookLast60 / expected60;
    if (Math.abs(1 - ratio) <= 0.05) {
      direction = "FLAT";
    } else if (ratio < 0.95) {
      direction = "DOWN";
    } else {
      direction = "FLAT";
    }
  }

  const dominantSignal = (Object.entries(bucketCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as CustomerSignalClassification) || "FLAT";

  const snapshot: CustomerHealthSnapshot = {
    assignedCustomersCount: assignedCount,
    coverage: {
      assigned: assignedCount,
      active: activeCount,
      targets: targetCustomers.length,
      prospects: prospectCustomers.length,
      unassigned: await db.customer.count({
        where: {
          tenantId,
          salesRepId: null,
          isPermanentlyClosed: false,
        },
      }),
    },
    signals: {
      buckets,
      totals: {
        assigned: assignedCount,
        active: activeCount,
      },
    },
    portfolio: {
      healthyCount,
      healthyPercent: activeCount ? (healthyCount / activeCount) * 100 : 0,
      immediateAttentionCount,
      immediateAttentionPercent: activeCount ? (immediateAttentionCount / activeCount) * 100 : 0,
      downCount: bucketCounts.SHRINKING,
      dormantCount: bucketCounts.DORMANT,
      totalActive: activeCount,
      weightedScore: portfolioScores.weightedScore,
      unweightedScore: portfolioScores.unweightedScore,
    },
    targetPipeline: {
      assignedCount: targetCustomers.length,
      turnedActiveCount: targetsTurnedActiveCount,
      turnedActivePercent: targetCustomers.length ? (targetsTurnedActiveCount / targetCustomers.length) * 100 : 0,
      visitedCount: targetVisitSet.size,
      visitedPercent: targetCustomers.length ? (targetVisitSet.size / targetCustomers.length) * 100 : 0,
      ttfoMedianDays: calculateMedian(ttfoRealized),
      ttfoP75Days: calculatePercentile(ttfoRealized, 75),
      ttfoKmMedianDays: calculateKaplanMeierMedian(ttfoObservations),
    },
    coldLeads: {
      count: coldLeads.length,
      dormantToColdCount,
      sample: coldLeads.slice(0, 5).map((customer) => ({ id: customer.id, name: customer.name })),
    },
    accountPulse: {
      direction,
      deltaPercent: expected60 > 0 ? ((bookLast60 - expected60) / expected60) * 100 : 0,
      summary:
        expected60 > 0
          ? `Last 60 days ${bookLast60 >= expected60 ? "up" : "down"} ${Math.abs(
              ((bookLast60 - expected60) / expected60) * 100
            ).toFixed(1)}% vs baseline`
          : "Insufficient data for trend",
      dominantSignal,
      dormantCount: bucketCounts.DORMANT,
      totalCustomers: assignedCount,
    },
    reportRows,
  };

  return snapshot;
}
