/**
 * Inventory Depletion Forecasting
 * CRM-91: Predicts when products will run out based on sales velocity
 *
 * This module calculates inventory depletion forecasts by analyzing
 * historical sales velocity across multiple timeframes (30/60/90/180/360 days)
 * and predicting when current stock will be depleted.
 */

import { prisma } from '@/lib/prisma';
import { calculateDemandStats } from './reorder/demand-stats';
import { getAvailabilityBreakdown } from './availability';
import {
  DEFAULT_DEPLETION_CONFIG,
  type DepletionForecast,
  type VelocityMetric,
  type DepletionUrgency,
  type DemandPattern,
  type ConfidenceLevel,
  type DepletionConfig,
  type DepletionFilters,
  type DepletionSummary,
} from '@/types/inventory-forecast';

/**
 * Calculate velocity metric for a specific timeframe
 */
async function calculateVelocityMetric(
  tenantId: string,
  skuId: string,
  period: 30 | 60 | 90 | 180 | 360,
  currentAvailable: number
): Promise<VelocityMetric> {
  const stats = await calculateDemandStats(tenantId, skuId, period);

  const unitsPerDay = stats.meanDailyDemand;
  const daysUntilStockout = unitsPerDay > 0
    ? Math.floor(currentAvailable / unitsPerDay)
    : null; // null = no demand (infinite stock)

  const stockoutDate = daysUntilStockout !== null
    ? new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000)
    : null;

  return {
    period,
    periodLabel: `${period}-day`,
    unitsPerDay,
    totalUnits: stats.totalDemand,
    daysWithSales: stats.daysWithDemand,
    daysUntilStockout,
    stockoutDate,
  };
}

/**
 * Classify demand pattern based on velocity
 */
function classifyDemandPattern(velocities: VelocityMetric[]): DemandPattern {
  const avgVelocity = velocities.reduce((sum, v) => sum + v.unitsPerDay, 0) / velocities.length;

  if (avgVelocity === 0) return 'none';
  if (avgVelocity >= 10) return 'fast';
  if (avgVelocity >= 3) return 'medium';
  if (avgVelocity >= 0.5) return 'slow';
  return 'intermittent';
}

/**
 * Determine confidence level based on data quality
 */
function calculateConfidence(
  velocities: VelocityMetric[],
  config: DepletionConfig
): ConfidenceLevel {
  const primaryVelocity = velocities.find(v => v.period === config.primaryPeriod);
  if (!primaryVelocity) return 'low';

  const hasSufficientHistory = primaryVelocity.daysWithSales >= config.minDaysForHighConfidence;
  const hasSufficientVolume = primaryVelocity.totalUnits >= config.minSalesForHighConfidence;

  if (hasSufficientHistory && hasSufficientVolume) return 'high';
  if (hasSufficientHistory || hasSufficientVolume) return 'medium';
  return 'low';
}

/**
 * Classify urgency based on days until stockout
 */
function classifyUrgency(daysUntilStockout: number | null, config: DepletionConfig): DepletionUrgency {
  if (daysUntilStockout === null) return 'infinite'; // No demand
  if (daysUntilStockout < 0) return 'critical'; // Already out of stock
  if (daysUntilStockout <= config.criticalThreshold) return 'critical';
  if (daysUntilStockout <= config.warningThreshold) return 'warning';
  if (daysUntilStockout <= config.normalThreshold) return 'normal';
  return 'stable';
}

/**
 * Calculate complete depletion forecast for a single SKU
 *
 * @param tenantId - Tenant ID
 * @param skuId - SKU ID
 * @param config - Configuration for thresholds and primary period
 * @returns Complete depletion forecast
 */
export async function calculateDepletionForecast(
  tenantId: string,
  skuId: string,
  config: DepletionConfig = DEFAULT_DEPLETION_CONFIG
): Promise<DepletionForecast | null> {
  // Get SKU details
  const sku = await prisma.sku.findUnique({
    where: { id: skuId },
    include: {
      product: {
        select: {
          name: true,
          brand: true,
          category: true,
        },
      },
      inventories: true,
    },
  });

  if (!sku) return null;

  // Calculate current availability
  const inventoryTotals = sku.inventories.reduce(
    (acc, inv) => ({
      onHand: acc.onHand + (inv.onHand || 0),
      allocated: acc.allocated + (inv.allocated || 0),
      reserved: acc.reserved + (inv.reserved || 0),
    }),
    { onHand: 0, allocated: 0, reserved: 0 }
  );

  const availability = getAvailabilityBreakdown(inventoryTotals);
  const currentAvailable = availability.available;

  // Calculate velocities for all timeframes
  const [v30, v60, v90, v180, v360] = await Promise.all([
    calculateVelocityMetric(tenantId, skuId, 30, currentAvailable),
    calculateVelocityMetric(tenantId, skuId, 60, currentAvailable),
    calculateVelocityMetric(tenantId, skuId, 90, currentAvailable),
    calculateVelocityMetric(tenantId, skuId, 180, currentAvailable),
    calculateVelocityMetric(tenantId, skuId, 360, currentAvailable),
  ]);

  const allVelocities = [v30, v60, v90, v180, v360];

  // Determine primary velocity based on config
  const primaryVelocity = allVelocities.find(v => v.period === config.primaryPeriod) || v90;

  // Classify demand and confidence
  const demandPattern = classifyDemandPattern(allVelocities);
  const confidenceLevel = calculateConfidence(allVelocities, config);
  const urgency = classifyUrgency(primaryVelocity.daysUntilStockout, config);

  return {
    skuId: sku.id,
    skuCode: sku.code,
    productName: sku.product.name,
    brand: sku.product.brand,
    category: sku.product.category,

    currentAvailable: availability.available,
    onHand: availability.onHand,
    allocated: availability.allocated,
    reserved: availability.reserved,

    velocities: {
      day30: v30,
      day60: v60,
      day90: v90,
      day180: v180,
      day360: v360,
    },

    primaryVelocity,
    daysUntilStockout: primaryVelocity.daysUntilStockout,
    stockoutDate: primaryVelocity.stockoutDate,
    urgency,

    demandPattern,
    confidenceLevel,
    lastCalculated: new Date(),
  };
}

/**
 * Calculate depletion forecasts for all SKUs with filtering
 *
 * @param tenantId - Tenant ID
 * @param filters - Optional filters for category, brand, urgency
 * @param config - Configuration for thresholds
 * @returns Array of depletion forecasts
 */
export async function calculateAllDepletionForecasts(
  tenantId: string,
  filters?: DepletionFilters,
  config: DepletionConfig = DEFAULT_DEPLETION_CONFIG
): Promise<DepletionForecast[]> {
  // Get all active SKUs with inventory
  const skus = await prisma.sku.findMany({
    where: {
      tenantId,
      isActive: true,
      product: {
        ...(filters?.category && { category: filters.category }),
        ...(filters?.brand && { brand: filters.brand }),
        ...(filters?.searchTerm && {
          OR: [
            { name: { contains: filters.searchTerm, mode: 'insensitive' } },
          ],
        }),
      },
    },
    select: {
      id: true,
    },
  });

  // Calculate forecast for each SKU (parallel processing)
  const forecasts = await Promise.all(
    skus.map(sku => calculateDepletionForecast(tenantId, sku.id, config))
  );

  // Filter out nulls and apply urgency filters
  let results = forecasts.filter((f): f is DepletionForecast => f !== null);

  if (filters?.urgency) {
    const urgencies = Array.isArray(filters.urgency) ? filters.urgency : [filters.urgency];
    results = results.filter(f => urgencies.includes(f.urgency));
  }

  if (filters?.minDaysUntilStockout !== undefined) {
    results = results.filter(f =>
      f.daysUntilStockout !== null && f.daysUntilStockout >= filters.minDaysUntilStockout!
    );
  }

  if (filters?.maxDaysUntilStockout !== undefined) {
    results = results.filter(f =>
      f.daysUntilStockout !== null && f.daysUntilStockout <= filters.maxDaysUntilStockout!
    );
  }

  // Sort by urgency (critical first, then by days ascending)
  results.sort((a, b) => {
    const urgencyOrder = { critical: 0, warning: 1, normal: 2, stable: 3, infinite: 4 };
    const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];

    if (urgencyDiff !== 0) return urgencyDiff;

    // Same urgency - sort by days (null goes to end)
    if (a.daysUntilStockout === null) return 1;
    if (b.daysUntilStockout === null) return -1;
    return a.daysUntilStockout - b.daysUntilStockout;
  });

  return results;
}

/**
 * Generate summary statistics for depletion forecasts
 */
export function generateDepletionSummary(forecasts: DepletionForecast[]): DepletionSummary {
  const criticalForecasts = forecasts.filter(f => f.urgency === 'critical');

  return {
    totalSKUs: forecasts.length,
    activeSKUs: forecasts.filter(f => f.demandPattern !== 'none').length,

    criticalCount: criticalForecasts.length,
    warningCount: forecasts.filter(f => f.urgency === 'warning').length,
    normalCount: forecasts.filter(f => f.urgency === 'normal').length,
    stableCount: forecasts.filter(f => f.urgency === 'stable').length,
    infiniteCount: forecasts.filter(f => f.urgency === 'infinite').length,

    topCritical: criticalForecasts
      .sort((a, b) => (a.daysUntilStockout || Infinity) - (b.daysUntilStockout || Infinity))
      .slice(0, 5)
      .map(f => ({
        skuCode: f.skuCode,
        productName: f.productName,
        daysUntilStockout: f.daysUntilStockout || 0,
      })),
  };
}

/**
 * Format days until stockout for display
 */
export function formatDaysUntilStockout(days: number | null): string {
  if (days === null) return 'No demand';
  if (days < 0) return 'Out of stock';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  if (days < 365) return `${Math.floor(days / 30)} months`;
  return `${Math.floor(days / 365)} years`;
}

/**
 * Format stockout date for display
 */
export function formatStockoutDate(date: Date | null): string {
  if (!date) return '—';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}
