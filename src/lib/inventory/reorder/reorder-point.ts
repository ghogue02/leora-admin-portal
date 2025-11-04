/**
 * SKU-Level Reorder Point Calculations
 *
 * Implements data-driven reorder points (ROP) based on demand statistics
 * and lead time variability. Replaces hardcoded "<10 remaining" thresholds
 * with SKU-specific calculations.
 *
 * FORMULA: ROP = (μ_d × L) + (z × σ_dL)
 *
 * Where:
 * - μ_d = mean daily demand
 * - σ_d = standard deviation of daily demand
 * - L = mean lead time in days
 * - σ_L = standard deviation of lead time
 * - z = service level z-score (1.64 for 95%, 2.33 for 99%)
 * - σ_dL = √(L × σ_d² + μ_d² × σ_L²)
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 2.5
 */

/**
 * Reorder point calculation parameters
 */
export type ReorderParams = {
  /** Mean daily demand (average units sold per day) */
  meanDailyDemand: number;
  /** Standard deviation of daily demand */
  sdDailyDemand: number;
  /** Mean lead time in days (time from order to receipt) */
  meanLeadDays: number;
  /** Standard deviation of lead time */
  sdLeadDays: number;
  /** Service level z-score (default: 1.64 for 95% service level) */
  serviceLevelZ?: number;
};

/**
 * Days of supply calculation parameters
 */
export type DaysOfSupplyParams = {
  /** Units physically on hand */
  onHand: number;
  /** Units committed (allocated + reserved) */
  committed: number;
  /** Mean daily demand */
  meanDailyDemand: number;
};

/**
 * SKU demand statistics (stored in database)
 */
export type SKUDemandStats = {
  skuId: string;
  tenantId: string;
  meanDailyDemand: number;
  sdDailyDemand: number;
  meanLeadDays: number;
  sdLeadDays: number;
  reorderPoint: number;
  targetDaysOfSupply: number;
  serviceLevelZ: number;
  lastCalculated: Date;
};

/**
 * Service level configurations
 *
 * Maps service level percentages to z-scores from standard normal distribution
 */
export const SERVICE_LEVELS = {
  /** 90% service level (10% stockout risk) */
  '90': 1.28,
  /** 95% service level (5% stockout risk) - recommended for most SKUs */
  '95': 1.64,
  /** 97.5% service level (2.5% stockout risk) */
  '97.5': 1.96,
  /** 99% service level (1% stockout risk) - for critical SKUs */
  '99': 2.33,
  /** 99.5% service level (0.5% stockout risk) - for VIP customers */
  '99.5': 2.58,
} as const;

/**
 * Default reorder parameters for when no historical data exists
 */
export const DEFAULT_REORDER_PARAMS = {
  meanDailyDemand: 2,
  sdDailyDemand: 1,
  meanLeadDays: 7,
  sdLeadDays: 2,
  serviceLevelZ: SERVICE_LEVELS['95'], // 95% service level
} as const;

/**
 * Calculate reorder point using normal distribution approximation
 *
 * ROP consists of two components:
 * 1. Expected demand during lead time: μ_d × L
 * 2. Safety stock: z × σ_dL
 *
 * The safety stock protects against demand and lead time variability.
 * Higher z-score = higher service level but more inventory carrying cost.
 *
 * @param params - Demand and lead time statistics
 * @returns Reorder point quantity (rounded to nearest whole unit)
 *
 * @example
 * // SKU sells 5 units/day (±2), lead time 7 days (±1)
 * const rop = calculateReorderPoint({
 *   meanDailyDemand: 5,
 *   sdDailyDemand: 2,
 *   meanLeadDays: 7,
 *   sdLeadDays: 1,
 *   serviceLevelZ: 1.64 // 95% service level
 * });
 * // Expected demand: 5 × 7 = 35 units
 * // Variance: √(7 × 4 + 25 × 1) = √53 ≈ 7.28
 * // Safety stock: 1.64 × 7.28 ≈ 12 units
 * // ROP = 35 + 12 = 47 units
 */
export function calculateReorderPoint({
  meanDailyDemand,
  sdDailyDemand,
  meanLeadDays,
  sdLeadDays,
  serviceLevelZ = SERVICE_LEVELS['95'], // Default to 95% service level
}: ReorderParams): number {
  // Expected demand during lead time
  const demandDuringLead = meanDailyDemand * meanLeadDays;

  // Variance of demand during lead time
  // σ_dL² = L × σ_d² + μ_d² × σ_L²
  const variance =
    meanLeadDays * (sdDailyDemand ** 2) +
    (meanDailyDemand ** 2) * (sdLeadDays ** 2);

  // Standard deviation of demand during lead time
  const stdDevDuringLead = Math.sqrt(variance);

  // Safety stock to achieve desired service level
  const safetyStock = serviceLevelZ * stdDevDuringLead;

  // ROP = Expected demand + Safety stock
  const rop = demandDuringLead + safetyStock;

  return Math.round(rop);
}

/**
 * Calculate days of supply (inventory runway)
 *
 * Tells you how many days current inventory will last at current demand rate.
 * Useful for prioritizing reorder urgency.
 *
 * @param params - Inventory and demand parameters
 * @returns Days of supply (Infinity if no demand)
 *
 * @example
 * const dos = calculateDaysOfSupply({
 *   onHand: 100,
 *   committed: 40,  // allocated + reserved
 *   meanDailyDemand: 5
 * });
 * // Available: 100 - 40 = 60 units
 * // Days of supply: 60 / 5 = 12.0 days
 */
export function calculateDaysOfSupply({
  onHand,
  committed,
  meanDailyDemand,
}: DaysOfSupplyParams): number {
  const netAvailable = Math.max(0, onHand - committed);

  // If no demand, we have infinite supply
  if (meanDailyDemand <= 0) {
    return Infinity;
  }

  return +(netAvailable / meanDailyDemand).toFixed(1);
}

/**
 * Calculate Economic Order Quantity (EOQ)
 *
 * Optimal order quantity that minimizes total inventory costs
 * (ordering costs + holding costs).
 *
 * Formula: EOQ = √(2 × D × K / h)
 *
 * Where:
 * - D = annual demand
 * - K = fixed cost per order
 * - h = annual holding cost per unit
 *
 * @param annualDemand - Total units sold per year
 * @param orderCost - Fixed cost to place an order
 * @param holdingCostPerUnit - Annual cost to hold one unit
 * @returns Economic order quantity (rounded to nearest whole unit)
 *
 * @example
 * const eoq = calculateEOQ({
 *   annualDemand: 1000,    // 1000 units/year
 *   orderCost: 50,         // $50 per order
 *   holdingCostPerUnit: 2  // $2/unit/year
 * });
 * // EOQ = √(2 × 1000 × 50 / 2) = √50,000 ≈ 224 units
 */
export function calculateEOQ({
  annualDemand,
  orderCost,
  holdingCostPerUnit,
}: {
  annualDemand: number;
  orderCost: number;
  holdingCostPerUnit: number;
}): number {
  if (holdingCostPerUnit <= 0 || annualDemand <= 0 || orderCost <= 0) {
    return 0;
  }

  const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCostPerUnit);
  return Math.round(eoq);
}

/**
 * Determine reorder urgency level
 *
 * Classifies SKUs based on days of supply and reorder point status
 */
export type ReorderUrgency = 'critical' | 'urgent' | 'soon' | 'normal' | 'ok';

export function getReorderUrgency({
  available,
  reorderPoint,
  daysOfSupply,
  targetDays = 14,
}: {
  available: number;
  reorderPoint: number;
  daysOfSupply: number;
  targetDays?: number;
}): ReorderUrgency {
  // Critical: Out of stock or below half of ROP
  if (available <= 0 || available < reorderPoint * 0.5) {
    return 'critical';
  }

  // Urgent: Below ROP or less than 1 week supply
  if (available < reorderPoint || daysOfSupply < 7) {
    return 'urgent';
  }

  // Soon: Below target days of supply
  if (daysOfSupply < targetDays) {
    return 'soon';
  }

  // Normal: Between target and 2x target
  if (daysOfSupply < targetDays * 2) {
    return 'normal';
  }

  // OK: Plenty of supply
  return 'ok';
}

/**
 * Calculate suggested order quantity
 *
 * Recommends how many units to order based on:
 * - Current inventory position
 * - Reorder point
 * - Economic order quantity (if provided)
 * - Maximum shelf capacity
 *
 * @param params - Order quantity calculation parameters
 * @returns Suggested order quantity
 *
 * @example
 * const suggested = calculateSuggestedOrderQty({
 *   available: 30,
 *   reorderPoint: 50,
 *   eoq: 100,
 *   maxCapacity: 200
 * });
 * // Below ROP (30 < 50), order up to EOQ
 * // But check capacity: min(100, 200 - 30) = 100
 */
export function calculateSuggestedOrderQty({
  available,
  reorderPoint,
  eoq,
  maxCapacity,
}: {
  available: number;
  reorderPoint: number;
  eoq?: number;
  maxCapacity?: number;
}): number {
  // If at or above ROP, no order needed
  if (available >= reorderPoint) {
    return 0;
  }

  // Default to ordering up to ROP + safety buffer
  let suggestedQty = reorderPoint - available + Math.round(reorderPoint * 0.2);

  // Use EOQ if provided and we're below ROP
  if (eoq && eoq > 0) {
    suggestedQty = eoq;
  }

  // Respect maximum capacity if provided
  if (maxCapacity && maxCapacity > 0) {
    const roomAvailable = maxCapacity - available;
    suggestedQty = Math.min(suggestedQty, roomAvailable);
  }

  return Math.max(0, Math.round(suggestedQty));
}

/**
 * Get reorder point alert message
 *
 * Creates actionable message for reorder alerts
 *
 * @param params - Alert parameters
 * @returns Formatted alert message
 *
 * @example
 * const message = getReorderAlertMessage({
 *   productName: 'ROSEWOOD Pinot Noir 750ml',
 *   available: 8,
 *   reorderPoint: 42,
 *   daysOfSupply: 3.2,
 *   suggestedQty: 100,
 *   urgency: 'urgent'
 * });
 * // "ROSEWOOD Pinot Noir 750ml: 8 units available (3.2 days of supply).
 * //  Below reorder point of 42. Suggest ordering 100 units by [date]."
 */
export function getReorderAlertMessage({
  productName,
  available,
  reorderPoint,
  daysOfSupply,
  suggestedQty,
  urgency,
  meanDailyDemand,
}: {
  productName: string;
  available: number;
  reorderPoint: number;
  daysOfSupply: number;
  suggestedQty: number;
  urgency: ReorderUrgency;
  meanDailyDemand: number;
}): string {
  const urgencyPrefix = {
    critical: '🔴 CRITICAL',
    urgent: '🟠 URGENT',
    soon: '🟡 SOON',
    normal: '🟢 NORMAL',
    ok: '✅ OK',
  }[urgency];

  const daysUntilStockout = Math.floor(daysOfSupply);

  // Calculate suggested order date (allow lead time buffer)
  const orderByDays = Math.max(1, daysUntilStockout - 3); // Order 3 days before stockout
  const orderByDate = new Date();
  orderByDate.setDate(orderByDate.getDate() + orderByDays);

  return `${urgencyPrefix}: ${productName} has ${available} units available (${daysOfSupply.toFixed(1)} days of supply at ${meanDailyDemand.toFixed(1)} units/day). Below reorder point of ${reorderPoint}. Suggest ordering ${suggestedQty} units by ${orderByDate.toLocaleDateString()} to maintain service level.`;
}
