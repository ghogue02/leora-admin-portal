/**
 * Sample Analytics Service
 *
 * Calculates revenue attribution and conversion metrics for samples.
 * Key business rule: Revenue is attributed within 30 days AFTER tasting.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { addDays, startOfDay, endOfDay } from 'date-fns';

const prisma = new PrismaClient();

export interface SampleRevenueResult {
  sampleUsageId: string;
  skuId: string;
  customerId: string;
  tastedAt: Date;
  attributedRevenue: number;
  orderCount: number;
  orders: Array<{
    orderId: string;
    orderedAt: Date;
    total: number;
  }>;
}

export interface SampleMetricsInput {
  tenantId: string;
  skuId?: string;
  periodStart: Date;
  periodEnd: Date;
}

export interface SampleConversionRate {
  skuId: string;
  skuCode: string;
  productName: string;
  totalSamples: number;
  uniqueCustomers: number;
  conversions: number;
  conversionRate: number;
  avgRevenuePerSample: number;
  totalRevenue: number;
}

export interface RepSamplePerformance {
  salesRepId: string;
  repName: string;
  totalSamples: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
  avgRevenuePerSample: number;
}

/**
 * Calculate revenue attributed to a sample within 30-day window AFTER tasting
 *
 * @param sampleUsageId - ID of the sample usage record
 * @returns Revenue attribution details
 */
export async function calculateSampleRevenue(
  sampleUsageId: string
): Promise<SampleRevenueResult> {
  const sample = await prisma.sampleUsage.findUnique({
    where: { id: sampleUsageId },
    include: {
      sku: true,
      customer: true,
    },
  });

  if (!sample) {
    throw new Error(`Sample usage ${sampleUsageId} not found`);
  }

  // Attribution window: 30 days AFTER tasting
  const windowStart = startOfDay(sample.tastedAt);
  const windowEnd = endOfDay(addDays(sample.tastedAt, 30));

  // Find all orders from this customer for this SKU within the attribution window
  const orders = await prisma.order.findMany({
    where: {
      customerId: sample.customerId,
      orderedAt: {
        gte: windowStart,
        lte: windowEnd,
      },
      lines: {
        some: {
          skuId: sample.skuId,
        },
      },
    },
    include: {
      lines: {
        where: {
          skuId: sample.skuId,
        },
      },
    },
  });

  // Calculate attributed revenue from order lines matching the sampled SKU
  let totalRevenue = 0;
  const orderDetails = orders.map((order) => {
    const orderLineRevenue = order.lines.reduce(
      (sum, line) => sum + Number(line.unitPrice) * line.quantity,
      0
    );
    totalRevenue += orderLineRevenue;

    return {
      orderId: order.id,
      orderedAt: order.orderedAt!,
      total: orderLineRevenue,
    };
  });

  return {
    sampleUsageId: sample.id,
    skuId: sample.skuId,
    customerId: sample.customerId,
    tastedAt: sample.tastedAt,
    attributedRevenue: totalRevenue,
    orderCount: orders.length,
    orders: orderDetails,
  };
}

/**
 * Calculate sample metrics for a given period
 *
 * @param input - Tenant, SKU, and period parameters
 * @returns Calculated metrics
 */
export async function calculateSampleMetrics(
  input: SampleMetricsInput
): Promise<Prisma.SampleMetricsCreateInput> {
  const { tenantId, skuId, periodStart, periodEnd } = input;

  // Get all samples given during the period
  const samples = await prisma.sampleUsage.findMany({
    where: {
      tenantId,
      ...(skuId && { skuId }),
      tastedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  const totalSamplesGiven = samples.length;
  const uniqueCustomers = new Set(samples.map((s) => s.customerId)).size;

  // Calculate revenue for each sample
  let totalRevenue = 0;
  let samplesWithOrders = 0;

  for (const sample of samples) {
    const windowEnd = addDays(sample.tastedAt, 30);

    // Only calculate if attribution window has passed or we're within it
    if (windowEnd <= new Date() || sample.tastedAt >= periodStart) {
      const orders = await prisma.order.findMany({
        where: {
          customerId: sample.customerId,
          orderedAt: {
            gte: sample.tastedAt,
            lte: windowEnd,
          },
          lines: {
            some: {
              skuId: sample.skuId,
            },
          },
        },
        include: {
          lines: {
            where: {
              skuId: sample.skuId,
            },
          },
        },
      });

      if (orders.length > 0) {
        samplesWithOrders++;
        const revenue = orders.reduce((sum, order) => {
          const orderRevenue = order.lines.reduce(
            (lineSum, line) => lineSum + Number(line.unitPrice) * line.quantity,
            0
          );
          return sum + orderRevenue;
        }, 0);
        totalRevenue += revenue;
      }
    }
  }

  const conversionRate =
    totalSamplesGiven > 0 ? samplesWithOrders / totalSamplesGiven : 0;
  const avgRevenuePerSample =
    totalSamplesGiven > 0 ? totalRevenue / totalSamplesGiven : 0;

  if (!skuId) {
    throw new Error('SKU ID is required for calculateSampleMetrics');
  }

  return {
    tenant: { connect: { id: tenantId } },
    sku: { connect: { id: skuId } },
    periodStart,
    periodEnd,
    totalSamplesGiven,
    totalCustomersSampled: uniqueCustomers,
    samplesResultingInOrder: samplesWithOrders,
    conversionRate,
    totalRevenue: new Prisma.Decimal(totalRevenue),
    avgRevenuePerSample: new Prisma.Decimal(avgRevenuePerSample),
  };
}

/**
 * Get sample conversion rate by SKU
 *
 * @param tenantId - Tenant ID
 * @param periodStart - Start of analysis period
 * @param periodEnd - End of analysis period
 * @returns Conversion rates by SKU
 */
export async function getSampleConversionRate(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<SampleConversionRate[]> {
  const samples = await prisma.sampleUsage.findMany({
    where: {
      tenantId,
      tastedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      sku: {
        include: {
          product: true,
        },
      },
    },
  });

  // Group by SKU
  const skuMap = new Map<string, SampleConversionRate>();

  for (const sample of samples) {
    const key = sample.skuId;

    if (!skuMap.has(key)) {
      skuMap.set(key, {
        skuId: sample.skuId,
        skuCode: sample.sku.code,
        productName: sample.sku.product.name,
        totalSamples: 0,
        uniqueCustomers: 0,
        conversions: 0,
        conversionRate: 0,
        avgRevenuePerSample: 0,
        totalRevenue: 0,
      });
    }

    const stats = skuMap.get(key)!;
    stats.totalSamples++;

    // Check for conversion (30-day window)
    const windowEnd = addDays(sample.tastedAt, 30);
    const orders = await prisma.order.findMany({
      where: {
        customerId: sample.customerId,
        orderedAt: {
          gte: sample.tastedAt,
          lte: windowEnd,
        },
        lines: {
          some: {
            skuId: sample.skuId,
          },
        },
      },
      include: {
        lines: {
          where: {
            skuId: sample.skuId,
          },
        },
      },
    });

    if (orders.length > 0) {
      stats.conversions++;
      const revenue = orders.reduce((sum, order) => {
        const orderRevenue = order.lines.reduce(
          (lineSum, line) => lineSum + Number(line.unitPrice) * line.quantity,
          0
        );
        return sum + orderRevenue;
      }, 0);
      stats.totalRevenue += revenue;
    }
  }

  // Calculate final metrics
  const results: SampleConversionRate[] = [];
  for (const [, stats] of skuMap) {
    const customerSet = new Set(
      samples.filter((s) => s.skuId === stats.skuId).map((s) => s.customerId)
    );
    stats.uniqueCustomers = customerSet.size;
    stats.conversionRate =
      stats.totalSamples > 0 ? stats.conversions / stats.totalSamples : 0;
    stats.avgRevenuePerSample =
      stats.totalSamples > 0 ? stats.totalRevenue / stats.totalSamples : 0;
    results.push(stats);
  }

  // Sort by conversion rate descending
  return results.sort((a, b) => b.conversionRate - a.conversionRate);
}

/**
 * Get top performing samples by conversion rate
 *
 * @param tenantId - Tenant ID
 * @param limit - Number of results to return
 * @returns Top performing SKUs by sample conversion
 */
export async function getTopPerformingSamples(
  tenantId: string,
  limit: number = 10
): Promise<SampleConversionRate[]> {
  const thirtyDaysAgo = addDays(new Date(), -30);
  const results = await getSampleConversionRate(
    tenantId,
    thirtyDaysAgo,
    new Date()
  );
  return results.slice(0, limit);
}

/**
 * Get sample performance by sales rep
 *
 * @param tenantId - Tenant ID
 * @param periodStart - Start of analysis period
 * @param periodEnd - End of analysis period
 * @returns Performance metrics by sales rep
 */
export async function getRepSamplePerformance(
  tenantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<RepSamplePerformance[]> {
  const samples = await prisma.sampleUsage.findMany({
    where: {
      tenantId,
      tastedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      salesRep: {
        include: {
          user: true,
        },
      },
    },
  });

  const repMap = new Map<string, RepSamplePerformance>();

  for (const sample of samples) {
    const key = sample.salesRepId;

    if (!repMap.has(key)) {
      repMap.set(key, {
        salesRepId: sample.salesRepId,
        repName: sample.salesRep.user.fullName,
        totalSamples: 0,
        conversions: 0,
        conversionRate: 0,
        totalRevenue: 0,
        avgRevenuePerSample: 0,
      });
    }

    const stats = repMap.get(key)!;
    stats.totalSamples++;

    // Check for conversion
    const windowEnd = addDays(sample.tastedAt, 30);
    const orders = await prisma.order.findMany({
      where: {
        customerId: sample.customerId,
        orderedAt: {
          gte: sample.tastedAt,
          lte: windowEnd,
        },
        lines: {
          some: {
            skuId: sample.skuId,
          },
        },
      },
      include: {
        lines: {
          where: {
            skuId: sample.skuId,
          },
        },
      },
    });

    if (orders.length > 0) {
      stats.conversions++;
      const revenue = orders.reduce((sum, order) => {
        const orderRevenue = order.lines.reduce(
          (lineSum, line) => lineSum + Number(line.unitPrice) * line.quantity,
          0
        );
        return sum + orderRevenue;
      }, 0);
      stats.totalRevenue += revenue;
    }
  }

  // Calculate final metrics
  const results: RepSamplePerformance[] = [];
  for (const [, stats] of repMap) {
    stats.conversionRate =
      stats.totalSamples > 0 ? stats.conversions / stats.totalSamples : 0;
    stats.avgRevenuePerSample =
      stats.totalSamples > 0 ? stats.totalRevenue / stats.totalSamples : 0;
    results.push(stats);
  }

  // Sort by total revenue descending
  return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
}
