import { Prisma, PrismaClient } from "@prisma/client";
import { addDays } from "date-fns";

type TrendPoint = {
  date: string;
  samples: number;
  conversions: number;
  revenue: number;
};

type TopProductSummary = {
  id: string;
  productName: string;
  skuCode: string;
  brand: string;
  samplesGiven: number;
  orders: number;
  conversionRate: number;
  revenue: number;
};

type RepPerformanceSummary = {
  id: string;
  name: string;
  samplesGiven: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
};

export type SampleAnalyticsResponse = {
  overview: {
    totalSamples: number;
    conversionRate: number;
    totalRevenue: number;
    activeProducts: number;
  };
  trends: TrendPoint[];
  topProducts: TopProductSummary[];
  repPerformance: RepPerformanceSummary[];
};

export type SampleAnalyticsFilters = {
  salesRepId?: string;
  supplierId?: string;
  skuId?: string;
  customerId?: string;
};

export type SampleAnalyticsInput = {
  startDate: Date;
  endDate: Date;
  filters: SampleAnalyticsFilters;
};

export async function fetchSampleAnalytics(
  db: PrismaClient,
  tenantId: string,
  params: SampleAnalyticsInput,
): Promise<SampleAnalyticsResponse> {
  const { startDate, endDate, filters } = params;

  const sampleWhere: Prisma.SampleUsageWhereInput = {
    tenantId,
    tastedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (filters.salesRepId) {
    sampleWhere.salesRepId = filters.salesRepId;
  }
  if (filters.customerId) {
    sampleWhere.customerId = filters.customerId;
  }
  if (filters.skuId) {
    sampleWhere.skuId = filters.skuId;
  }
  if (filters.supplierId) {
    sampleWhere.sku = {
      product: {
        supplierId: filters.supplierId,
      },
    };
  }

  const samples = await db.sampleUsage.findMany({
    where: sampleWhere,
    include: {
      sku: {
        select: {
          id: true,
          code: true,
          product: {
            select: {
              name: true,
              brand: true,
              supplierId: true,
              supplier: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      salesRep: {
        select: {
          id: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      },
    },
    orderBy: {
      tastedAt: "asc",
    },
  });

  if (samples.length === 0) {
    return {
      overview: {
        totalSamples: 0,
        conversionRate: 0,
        totalRevenue: 0,
        activeProducts: 0,
      },
      trends: [],
      topProducts: [],
      repPerformance: [],
    };
  }

  const customerIds = Array.from(new Set(samples.map((sample) => sample.customerId)));
  const skuIds = Array.from(new Set(samples.map((sample) => sample.skuId)));

  const orders = await db.order.findMany({
    where: {
      tenantId,
      customerId: {
        in: customerIds,
      },
      orderedAt: {
        gte: startDate,
        lte: addDays(endDate, 30),
      },
      lines: {
        some: {
          skuId: {
            in: skuIds,
          },
        },
      },
    },
    include: {
      lines: {
        where: {
          skuId: {
            in: skuIds,
          },
        },
      },
    },
  });

  const trends = new Map<string, TrendPoint>();
  const productAggregates = new Map<string, {
    id: string;
    productName: string;
    skuCode: string;
    brand: string;
    events: number;
    samplesGiven: number;
    conversions: number;
    orders: number;
    revenue: number;
  }>();
  const repAggregates = new Map<string, {
    id: string;
    name: string;
    events: number;
    samplesGiven: number;
    conversions: number;
    revenue: number;
  }>();

  let totalRevenue = 0;
  let totalConversions = 0;

  for (const sample of samples) {
    const sampleDateKey = sample.tastedAt.toISOString().split("T")[0];
    const attributionWindowEnd = addDays(sample.tastedAt, 30);

    const matchingOrders = orders.filter((order) => {
      if (!order.orderedAt) {
        return false;
      }
      return (
        order.customerId === sample.customerId &&
        order.orderedAt >= sample.tastedAt &&
        order.orderedAt <= attributionWindowEnd
      );
    });

    const sampleRevenue = matchingOrders.reduce((sum, order) => {
      const orderRevenue = order.lines
        .filter((line) => line.skuId === sample.skuId)
        .reduce((lineSum, line) => lineSum + Number(line.unitPrice) * line.quantity, 0);
      return sum + orderRevenue;
    }, 0);

    const sampleConverted = sample.resultedInOrder || matchingOrders.length > 0;
    if (sampleConverted) {
      totalConversions += 1;
    }
    totalRevenue += sampleRevenue;

    const trendPoint = trends.get(sampleDateKey) ?? {
      date: sampleDateKey,
      samples: 0,
      conversions: 0,
      revenue: 0,
    };
    trendPoint.samples += 1;
    if (sampleConverted) {
      trendPoint.conversions += 1;
    }
    trendPoint.revenue += sampleRevenue;
    trends.set(sampleDateKey, trendPoint);

    const product = productAggregates.get(sample.skuId) ?? {
      id: sample.skuId,
      productName: sample.sku.product?.name ?? "Unknown Product",
      skuCode: sample.sku.code,
      brand: sample.sku.product?.brand ?? "",
      events: 0,
      samplesGiven: 0,
      conversions: 0,
      orders: 0,
      revenue: 0,
    };
    product.events += 1;
    product.samplesGiven += sample.quantity ?? 1;
    product.orders += matchingOrders.length;
    product.revenue += sampleRevenue;
    if (sampleConverted) {
      product.conversions += 1;
    }
    productAggregates.set(sample.skuId, product);

    if (sample.salesRepId) {
      const rep = repAggregates.get(sample.salesRepId) ?? {
        id: sample.salesRepId,
        name: sample.salesRep?.user?.fullName ?? "Unknown Sales Rep",
        events: 0,
        samplesGiven: 0,
        conversions: 0,
        revenue: 0,
      };
      rep.events += 1;
      rep.samplesGiven += sample.quantity ?? 1;
      rep.revenue += sampleRevenue;
      if (sampleConverted) {
        rep.conversions += 1;
      }
      repAggregates.set(sample.salesRepId, rep);
    }
  }

  const totalSamples = samples.length;
  const overview = {
    totalSamples,
    conversionRate: totalSamples > 0 ? totalConversions / totalSamples : 0,
    totalRevenue,
    activeProducts: productAggregates.size,
  };

  const trendsData = Array.from(trends.values()).sort((a, b) => a.date.localeCompare(b.date));

  const topProducts = Array.from(productAggregates.values())
    .map((product) => ({
      id: product.id,
      productName: product.productName,
      skuCode: product.skuCode,
      brand: product.brand,
      samplesGiven: product.samplesGiven,
      orders: product.orders,
      conversionRate: product.events > 0 ? product.conversions / product.events : 0,
      revenue: product.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const repPerformance = Array.from(repAggregates.values())
    .map((rep) => ({
      id: rep.id,
      name: rep.name,
      samplesGiven: rep.samplesGiven,
      conversions: rep.conversions,
      revenue: rep.revenue,
      conversionRate: rep.events > 0 ? rep.conversions / rep.events : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    overview,
    trends: trendsData,
    topProducts,
    repPerformance,
  };
}
