/**
 * SKU Demand Statistics Calculator
 *
 * Analyzes historical order data to calculate demand patterns for each SKU.
 * Used to compute data-driven reorder points and inventory optimization.
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 2.5
 */

import { prisma } from '@/lib/prisma';
import { formatUTCDate } from '../../dates';

/**
 * Daily demand observation
 */
type DailyDemand = {
  date: string; // YYYY-MM-DD
  quantity: number;
};

/**
 * Demand statistics calculation result
 */
export type DemandStats = {
  meanDailyDemand: number;
  sdDailyDemand: number;
  minDailyDemand: number;
  maxDailyDemand: number;
  totalDemand: number;
  daysWithDemand: number;
  daysInPeriod: number;
};

/**
 * Calculate mean (average) of numbers
 */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const avg = mean(values);
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = mean(squaredDiffs);

  return Math.sqrt(variance);
}

/**
 * Calculate demand statistics for a SKU
 *
 * Analyzes historical order data over a lookback period to determine
 * demand patterns. Only includes completed/fulfilled orders.
 *
 * @param tenantId - Tenant ID
 * @param skuId - SKU ID
 * @param lookbackDays - Days of history to analyze (default: 90)
 * @returns Demand statistics
 *
 * @example
 * const stats = await calculateDemandStats(tenantId, skuId, 90);
 * // stats: {
 * //   meanDailyDemand: 5.2,
 * //   sdDailyDemand: 2.1,
 * //   minDailyDemand: 0,
 * //   maxDailyDemand: 12,
 * //   totalDemand: 468,
 * //   daysWithDemand: 45,
 * //   daysInPeriod: 90
 * // }
 */
export async function calculateDemandStats(
  tenantId: string,
  skuId: string,
  lookbackDays: number = 90
): Promise<DemandStats> {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  // Get all order lines for this SKU in completed/fulfilled orders
  const orderLines = await prisma.orderLine.findMany({
    where: {
      skuId,
      order: {
        tenantId,
        orderedAt: { gte: lookbackDate },
        status: { in: ['FULFILLED', 'PARTIALLY_FULFILLED'] }, // Use correct enum values
      },
    },
    include: {
      order: {
        select: {
          orderedAt: true,
        },
      },
    },
    orderBy: {
      order: {
        orderedAt: 'asc',
      },
    },
  });

  // Group by date and sum quantities
  // Use UTC date formatting to ensure consistent date grouping across timezones
  const dailyDemandMap = new Map<string, number>();

  orderLines.forEach(line => {
    const date = formatUTCDate(line.order.orderedAt);
    const current = dailyDemandMap.get(date) || 0;
    dailyDemandMap.set(date, current + line.quantity);
  });

  // Convert to array of daily demands
  const dailyDemands = Array.from(dailyDemandMap.values());

  // Calculate statistics
  const totalDemand = dailyDemands.reduce((sum, qty) => sum + qty, 0);
  const daysWithDemand = dailyDemands.length;

  // If no demand, return conservative defaults
  if (daysWithDemand === 0) {
    return {
      meanDailyDemand: 0,
      sdDailyDemand: 0,
      minDailyDemand: 0,
      maxDailyDemand: 0,
      totalDemand: 0,
      daysWithDemand: 0,
      daysInPeriod: lookbackDays,
    };
  }

  // Calculate mean and standard deviation
  // Note: This includes zero-demand days to avoid overestimating
  const meanDemand = totalDemand / lookbackDays; // Average across ALL days (including zero-demand days)
  const maxDemand = Math.max(...dailyDemands);
  const minDemand = Math.min(...dailyDemands);

  // For SD calculation, we use actual demand days to capture variability
  const sdDemand = standardDeviation(dailyDemands);

  return {
    meanDailyDemand: +meanDemand.toFixed(4),
    sdDailyDemand: +sdDemand.toFixed(4),
    minDailyDemand: minDemand,
    maxDailyDemand: maxDemand,
    totalDemand,
    daysWithDemand,
    daysInPeriod: lookbackDays,
  };
}

/**
 * Calculate demand statistics for all active SKUs
 *
 * Batch calculation for daily reorder point updates
 *
 * @param tenantId - Tenant ID
 * @param lookbackDays - Days of history to analyze
 * @returns Map of skuId to demand stats
 */
export async function calculateAllDemandStats(
  tenantId: string,
  lookbackDays: number = 90
): Promise<Map<string, DemandStats>> {
  // Get all active SKUs
  const skus = await prisma.sKU.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  const results = new Map<string, DemandStats>();

  // Calculate stats for each SKU
  for (const sku of skus) {
    const stats = await calculateDemandStats(tenantId, sku.id, lookbackDays);
    results.set(sku.id, stats);
  }

  return results;
}

/**
 * Classify SKU by demand pattern
 *
 * Helps determine appropriate inventory management strategy:
 * - Fast: High volume, consistent demand → Low ROP, frequent reorders
 * - Medium: Moderate volume → Standard ROP
 * - Slow: Low volume, sporadic demand → Higher safety stock %
 * - Intermittent: Very sporadic → Consider Croston forecasting
 *
 * @param stats - Demand statistics
 * @returns Demand classification
 */
export function classifyDemandPattern(stats: DemandStats): {
  classification: 'fast' | 'medium' | 'slow' | 'intermittent';
  intermittencyRate: number; // % of days with zero demand
  coefficientOfVariation: number; // CV = σ / μ
} {
  const intermittencyRate =
    stats.daysInPeriod > 0
      ? ((stats.daysInPeriod - stats.daysWithDemand) / stats.daysInPeriod) * 100
      : 0;

  const coefficientOfVariation =
    stats.meanDailyDemand > 0
      ? stats.sdDailyDemand / stats.meanDailyDemand
      : 0;

  let classification: 'fast' | 'medium' | 'slow' | 'intermittent';

  // Classify based on demand frequency and volume
  if (intermittencyRate > 70) {
    // More than 70% zero-demand days
    classification = 'intermittent';
  } else if (stats.meanDailyDemand >= 5) {
    // High daily demand
    classification = 'fast';
  } else if (stats.meanDailyDemand >= 1) {
    // Moderate daily demand
    classification = 'medium';
  } else {
    // Low daily demand
    classification = 'slow';
  }

  return {
    classification,
    intermittencyRate: +intermittencyRate.toFixed(1),
    coefficientOfVariation: +coefficientOfVariation.toFixed(2),
  };
}

/**
 * Adjust service level based on SKU importance
 *
 * Critical SKUs (high margin, VIP customers) get higher service levels
 *
 * @param params - SKU importance factors
 * @returns Recommended service level z-score
 */
export function getRecommendedServiceLevel({
  grossMarginPercent,
  isVIPCustomer,
  demandPattern,
}: {
  grossMarginPercent: number;
  isVIPCustomer: boolean;
  demandPattern: 'fast' | 'medium' | 'slow' | 'intermittent';
}): {
  serviceLevelZ: number;
  serviceLevelPercent: number;
  rationale: string;
} {
  let z = SERVICE_LEVELS['95']; // Default 95%
  let percent = 95;
  let rationale = 'Standard service level';

  // High margin items deserve higher service level
  if (grossMarginPercent >= 40) {
    z = SERVICE_LEVELS['99'];
    percent = 99;
    rationale = 'High margin (≥40%)';
  } else if (grossMarginPercent >= 25) {
    z = SERVICE_LEVELS['97.5'];
    percent = 97.5;
    rationale = 'Good margin (≥25%)';
  }

  // VIP customers get premium service
  if (isVIPCustomer) {
    z = Math.max(z, SERVICE_LEVELS['99']);
    percent = 99;
    rationale = 'VIP customer priority';
  }

  // Fast movers can use lower service level (reorder frequently anyway)
  if (demandPattern === 'fast') {
    z = Math.min(z, SERVICE_LEVELS['95']);
    percent = 95;
    rationale = 'Fast mover - frequent reorders';
  }

  // Intermittent items need higher safety stock
  if (demandPattern === 'intermittent') {
    z = SERVICE_LEVELS['99'];
    percent = 99;
    rationale = 'Intermittent demand - higher safety stock';
  }

  return {
    serviceLevelZ: z,
    serviceLevelPercent: percent,
    rationale,
  };
}
