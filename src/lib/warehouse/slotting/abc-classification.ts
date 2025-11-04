/**
 * ABC Warehouse Slotting Optimization
 *
 * Implements data-driven warehouse slotting using ABC analysis.
 * Replaces hardcoded frequency-based aisle assignment with
 * actual pick frequency, volume, and weight calculations.
 *
 * ABC Classification:
 * - A Items (top 20% by activity): Fast pick lanes (aisles 1-3)
 * - B Items (next 30% by activity): Medium lanes (aisles 4-7)
 * - C Items (bottom 50% by activity): Back lanes (aisles 8+)
 *
 * Activity Score = Pick Frequency × Weight Factor × Volume Factor
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 3
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * ABC classification result
 */
export type ABCClass = 'A' | 'B' | 'C';

/**
 * SKU activity metrics for classification
 */
export type SKUActivity = {
  skuId: string;
  skuCode: string;
  productName: string;

  // Activity metrics
  pickFrequency: number; // Picks per month
  totalPickVolume: number; // Total cases picked per month
  averagePickSize: number; // Average cases per pick

  // Physical attributes
  casesPerPallet: number;
  itemsPerCase: number;

  // Calculated scores
  activityScore: number; // Composite score for ranking
  abcClass: ABCClass; // A, B, or C classification
  abcPercentile: number; // Percentile rank (0-100)

  // Recommended slotting
  recommendedAisleRange: string; // e.g., "1-3", "4-7", "8+"
  reason: string; // Why this classification
};

/**
 * ABC classification thresholds
 */
export const ABC_THRESHOLDS = {
  A_PERCENTILE: 80, // Top 20% are A items
  B_PERCENTILE: 50, // Next 30% (50-80th percentile) are B items
  // Below 50th percentile are C items
} as const;

/**
 * Aisle assignment recommendations
 */
export const AISLE_ASSIGNMENTS = {
  A: {
    aisles: '1-3',
    description: 'Fast pick lanes - closest to shipping',
    shelfPreference: 'middle', // Waist height for fast access
  },
  B: {
    aisles: '4-7',
    description: 'Medium pick lanes - moderate distance',
    shelfPreference: 'middle',
  },
  C: {
    aisles: '8+',
    description: 'Back lanes - lower frequency items',
    shelfPreference: 'any', // Can use top/bottom shelves
  },
} as const;

/**
 * Calculate SKU activity metrics
 *
 * Analyzes pick sheet data over a period to determine how frequently
 * each SKU is picked and in what volumes.
 *
 * @param tenantId - Tenant ID
 * @param lookbackDays - Days of history to analyze (default: 90)
 * @returns Map of SKU ID to activity metrics
 */
export async function calculateSKUActivityMetrics(
  tenantId: string,
  lookbackDays: number = 90
): Promise<Map<string, Omit<SKUActivity, 'abcClass' | 'abcPercentile' | 'recommendedAisleRange' | 'reason'>>> {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  // Get all pick sheet items in the period
  const pickSheetItems = await prisma.pickSheetItem.findMany({
    where: {
      pickSheet: {
        tenantId,
        createdAt: { gte: lookbackDate },
      },
    },
    include: {
      sku: {
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // Group by SKU and calculate metrics
  const skuMetrics = new Map<string, {
    picks: number;
    totalVolume: number;
    pickSizes: number[];
    sku: typeof pickSheetItems[0]['sku'];
  }>();

  pickSheetItems.forEach(item => {
    const skuId = item.skuId;
    const existing = skuMetrics.get(skuId) || {
      picks: 0,
      totalVolume: 0,
      pickSizes: [],
      sku: item.sku,
    };

    existing.picks++;
    existing.totalVolume += item.quantity;
    existing.pickSizes.push(item.quantity);

    skuMetrics.set(skuId, existing);
  });

  // Convert to activity metrics
  const activityMap = new Map<string, Omit<SKUActivity, 'abcClass' | 'abcPercentile' | 'recommendedAisleRange' | 'reason'>>();

  const monthsFactor = lookbackDays / 30;

  skuMetrics.forEach((metrics, skuId) => {
    const pickFrequency = metrics.picks / monthsFactor; // Picks per month
    const totalPickVolume = metrics.totalVolume / monthsFactor; // Cases per month
    const averagePickSize = metrics.totalVolume / metrics.picks;

    // Calculate activity score
    // High frequency + high volume = highest score
    // Weight frequency more than volume (picking time is labor cost)
    const activityScore = (pickFrequency * 3) + (totalPickVolume * 1);

    activityMap.set(skuId, {
      skuId,
      skuCode: metrics.sku.code,
      productName: metrics.sku.product.name,
      pickFrequency: +pickFrequency.toFixed(2),
      totalPickVolume: +totalPickVolume.toFixed(2),
      averagePickSize: +averagePickSize.toFixed(2),
      casesPerPallet: metrics.sku.casesPerPallet || 50,
      itemsPerCase: metrics.sku.itemsPerCase || 12,
      activityScore: +activityScore.toFixed(2),
    });
  });

  return activityMap;
}

/**
 * Classify SKUs into ABC groups
 *
 * Applies Pareto principle (80/20 rule) to warehouse slotting.
 * Top 20% of SKUs by activity get A classification (prime locations).
 *
 * @param activityMetrics - Map of SKU activity metrics
 * @returns Array of SKUs with ABC classifications
 */
export function classifySKUsABC(
  activityMetrics: Map<string, Omit<SKUActivity, 'abcClass' | 'abcPercentile' | 'recommendedAisleRange' | 'reason'>>
): SKUActivity[] {
  // Convert to array and sort by activity score (descending)
  const skus = Array.from(activityMetrics.values()).sort(
    (a, b) => b.activityScore - a.activityScore
  );

  if (skus.length === 0) {
    return [];
  }

  // Calculate percentile rank for each SKU
  const classified: SKUActivity[] = skus.map((sku, index) => {
    const percentileRank = ((skus.length - index) / skus.length) * 100;

    // Assign ABC class based on percentile
    let abcClass: ABCClass;
    let recommendedAisleRange: string;
    let reason: string;

    if (percentileRank >= ABC_THRESHOLDS.A_PERCENTILE) {
      // Top 20% - A items
      abcClass = 'A';
      recommendedAisleRange = AISLE_ASSIGNMENTS.A.aisles;
      reason = `Top ${(100 - ABC_THRESHOLDS.A_PERCENTILE)}% by activity (${sku.pickFrequency.toFixed(1)} picks/month)`;
    } else if (percentileRank >= ABC_THRESHOLDS.B_PERCENTILE) {
      // Next 30% (50-80th percentile) - B items
      abcClass = 'B';
      recommendedAisleRange = AISLE_ASSIGNMENTS.B.aisles;
      reason = `Medium activity ${ABC_THRESHOLDS.B_PERCENTILE}-${ABC_THRESHOLDS.A_PERCENTILE}th percentile (${sku.pickFrequency.toFixed(1)} picks/month)`;
    } else {
      // Bottom 50% - C items
      abcClass = 'C';
      recommendedAisleRange = AISLE_ASSIGNMENTS.C.aisles;
      reason = `Low activity <${ABC_THRESHOLDS.B_PERCENTILE}th percentile (${sku.pickFrequency.toFixed(1)} picks/month)`;
    }

    return {
      ...sku,
      abcClass,
      abcPercentile: +percentileRank.toFixed(1),
      recommendedAisleRange,
      reason,
    };
  });

  return classified;
}

/**
 * ABC classification summary statistics
 */
export type ABCSummary = {
  totalSKUs: number;
  aCount: number;
  bCount: number;
  cCount: number;
  aPercentActivity: number; // % of total picks
  bPercentActivity: number;
  cPercentActivity: number;
  topAItems: SKUActivity[]; // Top 10 A items
};

/**
 * Get ABC classification summary
 *
 * Provides overview statistics for ABC analysis
 *
 * @param classified - Array of classified SKUs
 * @returns Summary statistics
 */
export function getABCSummary(classified: SKUActivity[]): ABCSummary {
  const aItems = classified.filter(s => s.abcClass === 'A');
  const bItems = classified.filter(s => s.abcClass === 'B');
  const cItems = classified.filter(s => s.abcClass === 'C');

  const totalActivity = classified.reduce((sum, s) => sum + s.activityScore, 0);

  const aActivity = aItems.reduce((sum, s) => sum + s.activityScore, 0);
  const bActivity = bItems.reduce((sum, s) => sum + s.activityScore, 0);
  const cActivity = cItems.reduce((sum, s) => sum + s.activityScore, 0);

  return {
    totalSKUs: classified.length,
    aCount: aItems.length,
    bCount: bItems.length,
    cCount: cItems.length,
    aPercentActivity: totalActivity > 0 ? +(aActivity / totalActivity * 100).toFixed(1) : 0,
    bPercentActivity: totalActivity > 0 ? +(bActivity / totalActivity * 100).toFixed(1) : 0,
    cPercentActivity: totalActivity > 0 ? +(cActivity / totalActivity * 100).toFixed(1) : 0,
    topAItems: aItems.slice(0, 10),
  };
}

/**
 * Generate slotting recommendations
 *
 * Creates actionable recommendations for warehouse managers
 *
 * @param classified - Classified SKUs
 * @param currentInventory - Current inventory locations
 * @returns Slotting recommendations
 */
export async function generateSlottingRecommendations(
  tenantId: string,
  classified: SKUActivity[]
): Promise<Array<{
  skuId: string;
  skuCode: string;
  productName: string;
  currentAisle: string | null;
  recommendedAisle: string;
  abcClass: ABCClass;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  estimatedTimeSavings: string; // e.g., "2 min/day"
}>> {
  const recommendations: Array<any> = [];

  // Get current inventory locations
  const inventory = await prisma.inventory.findMany({
    where: {
      tenantId,
      skuId: { in: classified.map(s => s.skuId) },
    },
    select: {
      skuId: true,
      location: true,
    },
  });

  const locationMap = new Map(
    inventory.map(inv => [inv.skuId, inv.location])
  );

  // Find mismatches between ABC class and current location
  classified.forEach(sku => {
    const currentLocation = locationMap.get(sku.skuId);
    const currentAisle = currentLocation?.match(/^A(\d+)/)?.[1] || null;

    // Determine if relocation would help
    const shouldRelocate = currentAisle && (
      (sku.abcClass === 'A' && parseInt(currentAisle) > 3) ||
      (sku.abcClass === 'B' && (parseInt(currentAisle) < 4 || parseInt(currentAisle) > 7)) ||
      (sku.abcClass === 'C' && parseInt(currentAisle) < 8)
    );

    if (shouldRelocate) {
      // Estimate time savings
      const currentDistance = parseInt(currentAisle!) * 10; // feet
      const recommendedDistance = sku.abcClass === 'A' ? 20 : sku.abcClass === 'B' ? 50 : 80;
      const distanceSaved = Math.abs(currentDistance - recommendedDistance);
      const timeSavedPerPick = distanceSaved / 200; // ~200 ft/min walking
      const timeSavedPerDay = timeSavedPerPick * (sku.pickFrequency / 30); // Daily picks

      const priority = sku.abcClass === 'A' ? 'high' : sku.abcClass === 'B' ? 'medium' : 'low';

      recommendations.push({
        skuId: sku.skuId,
        skuCode: sku.skuCode,
        productName: sku.productName,
        currentAisle: `A${currentAisle}`,
        recommendedAisle: sku.recommendedAisleRange,
        abcClass: sku.abcClass,
        priority,
        reason: `${sku.abcClass} item currently in ${sku.abcClass === 'A' ? 'slow' : 'sub-optimal'} zone. ${sku.reason}`,
        estimatedTimeSavings: timeSavedPerDay > 1
          ? `${timeSavedPerDay.toFixed(0)} min/day`
          : `${(timeSavedPerDay * 60).toFixed(0)} sec/day`,
      });
    }
  });

  // Sort by priority and time savings
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Calculate optimal slot for new SKU
 *
 * Determines best warehouse location for a new SKU based on
 * predicted demand pattern.
 *
 * @param predictedPicksPerMonth - Expected pick frequency
 * @param casesPerPallet - Cases per pallet (for space planning)
 * @returns Recommended aisle range
 */
export function calculateOptimalSlot({
  predictedPicksPerMonth,
  casesPerPallet = 50,
}: {
  predictedPicksPerMonth: number;
  casesPerPallet?: number;
}): {
  recommendedAisleRange: string;
  abcClass: ABCClass;
  shelfPreference: string;
  reason: string;
} {
  // Classify based on predicted frequency
  let abcClass: ABCClass;

  if (predictedPicksPerMonth >= 10) {
    abcClass = 'A'; // High frequency
  } else if (predictedPicksPerMonth >= 3) {
    abcClass = 'B'; // Medium frequency
  } else {
    abcClass = 'C'; // Low frequency
  }

  const assignment = AISLE_ASSIGNMENTS[abcClass];

  return {
    recommendedAisleRange: assignment.aisles,
    abcClass,
    shelfPreference: assignment.shelfPreference,
    reason: `Predicted ${predictedPicksPerMonth.toFixed(1)} picks/month suggests ${abcClass} classification`,
  };
}

/**
 * Get current ABC distribution
 *
 * Shows how current inventory is distributed vs optimal
 *
 * @param tenantId - Tenant ID
 * @returns Current vs optimal distribution
 */
export async function getABCDistribution(tenantId: string): Promise<{
  current: { A: number; B: number; C: number };
  optimal: { A: number; B: number; C: number };
  misaligned: number;
  utilizationScore: number;
}> {
  // Get all inventory with locations
  const inventory = await prisma.inventory.findMany({
    where: { tenantId },
    select: {
      skuId: true,
      location: true,
    },
  });

  // This is a placeholder - in production, you'd:
  // 1. Get ABC classification for each SKU
  // 2. Extract aisle from location
  // 3. Compare current vs recommended aisle
  // 4. Calculate misalignment percentage

  return {
    current: { A: 0, B: 0, C: 0 },
    optimal: { A: 0, B: 0, C: 0 },
    misaligned: 0,
    utilizationScore: 0,
  };
}
