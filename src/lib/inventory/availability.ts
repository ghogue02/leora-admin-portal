/**
 * Canonical Inventory Availability Calculations
 *
 * Single source of truth for calculating inventory availability.
 * Replaces multiple inconsistent local calculations throughout the codebase.
 *
 * IMPORTANT: All inventory availability checks should use these functions.
 * Do NOT create local calculations of "available = onHand - allocated".
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 1.2
 */

/**
 * Inventory snapshot from database
 *
 * All quantities are non-negative integers representing units
 */
export type InventorySnapshot = {
  /** Total units physically on hand */
  onHand: number;
  /** Units allocated to submitted orders */
  allocated: number;
  /** Units reserved for pending quotes/holds */
  reserved: number;
};

/**
 * Complete breakdown of inventory status
 *
 * This is the preferred return type for APIs and UI components
 * as it provides full transparency into inventory state
 */
export type AvailabilityBreakdown = {
  /** Total units physically on hand */
  onHand: number;
  /** Units allocated to submitted orders */
  allocated: number;
  /** Units reserved for pending quotes/holds */
  reserved: number;
  /** Total committed units (allocated + reserved) */
  committed: number;
  /** Units available for new orders (onHand - committed) */
  available: number;
};

/**
 * Calculate available quantity
 *
 * Formula: available = onHand - (allocated + reserved)
 *
 * This is the ONLY place this calculation should be performed.
 * All other code should import and use this function.
 *
 * @param snapshot - Inventory levels
 * @returns Available quantity (never negative)
 *
 * @example
 * const available = getAvailableQty({
 *   onHand: 100,
 *   allocated: 30,
 *   reserved: 10
 * });
 * // Returns: 60
 *
 * @example
 * // Handles negative cases gracefully
 * const available = getAvailableQty({
 *   onHand: 10,
 *   allocated: 15,
 *   reserved: 5
 * });
 * // Returns: 0 (not -10)
 */
export function getAvailableQty(snapshot: InventorySnapshot): number {
  const committed = (snapshot.allocated ?? 0) + (snapshot.reserved ?? 0);
  return Math.max(0, (snapshot.onHand ?? 0) - committed);
}

/**
 * Get complete availability breakdown
 *
 * Returns all inventory levels including derived values.
 * Use this when you need to display full inventory status to users.
 *
 * @param snapshot - Inventory levels
 * @returns Complete breakdown with all calculated fields
 *
 * @example
 * const breakdown = getAvailabilityBreakdown({
 *   onHand: 100,
 *   allocated: 30,
 *   reserved: 10
 * });
 * // Returns: {
 * //   onHand: 100,
 * //   allocated: 30,
 * //   reserved: 10,
 * //   committed: 40,
 * //   available: 60
 * // }
 */
export function getAvailabilityBreakdown(
  snapshot: InventorySnapshot
): AvailabilityBreakdown {
  const committed = (snapshot.allocated ?? 0) + (snapshot.reserved ?? 0);
  const available = Math.max(0, (snapshot.onHand ?? 0) - committed);

  return {
    onHand: snapshot.onHand ?? 0,
    allocated: snapshot.allocated ?? 0,
    reserved: snapshot.reserved ?? 0,
    committed,
    available,
  };
}

/**
 * Check if requested quantity is available
 *
 * Convenience function for common "can we fulfill this?" check
 *
 * @param snapshot - Inventory levels
 * @param requestedQty - Quantity needed
 * @returns True if sufficient inventory available
 *
 * @example
 * const canFulfill = isAvailable({ onHand: 100, allocated: 30, reserved: 10 }, 50);
 * // Returns: true (60 available >= 50 requested)
 *
 * @example
 * const canFulfill = isAvailable({ onHand: 100, allocated: 30, reserved: 10 }, 70);
 * // Returns: false (60 available < 70 requested)
 */
export function isAvailable(
  snapshot: InventorySnapshot,
  requestedQty: number
): boolean {
  return getAvailableQty(snapshot) >= requestedQty;
}

/**
 * Get availability status classification
 *
 * Categorizes inventory into standard status buckets using dynamic thresholds.
 *
 * Phase 2 Improvement: Now supports data-driven reorder points instead of
 * hardcoded threshold. Pass the SKU's calculated reorder point for accuracy.
 *
 * @param snapshot - Inventory levels
 * @param lowStockThreshold - Units below which is considered "low"
 *   - Can be SKU-specific reorder point (recommended)
 *   - Or fixed threshold (legacy, default: 10)
 * @returns Status classification
 *
 * @example
 * // Phase 2: Using SKU-specific reorder point
 * const rop = await getReorderPoint(skuId, tenantId); // e.g., 42
 * const status = getAvailabilityStatus({ onHand: 50, allocated: 20, reserved: 10 }, rop);
 * // Returns: "low_stock" (20 available < 42 reorder point)
 *
 * @example
 * // Legacy: Using fixed threshold
 * getAvailabilityStatus({ onHand: 15, allocated: 10, reserved: 2 })
 * // Returns: "low_stock" (3 available < 10 default threshold, but > 0)
 *
 * @example
 * getAvailabilityStatus({ onHand: 10, allocated: 10, reserved: 0 })
 * // Returns: "out_of_stock" (0 available)
 */
export function getAvailabilityStatus(
  snapshot: InventorySnapshot,
  lowStockThreshold: number = 10
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  const available = getAvailableQty(snapshot);

  if (available === 0) {
    return 'out_of_stock';
  } else if (available < lowStockThreshold) {
    return 'low_stock';
  } else {
    return 'in_stock';
  }
}

/**
 * Calculate availability across multiple warehouses
 *
 * Aggregates inventory from multiple locations
 *
 * @param inventories - Array of inventory snapshots from different locations
 * @returns Aggregated availability breakdown
 *
 * @example
 * const total = aggregateAvailability([
 *   { onHand: 50, allocated: 10, reserved: 5 },  // Warehouse A
 *   { onHand: 30, allocated: 5, reserved: 0 }    // Warehouse B
 * ]);
 * // Returns: {
 * //   onHand: 80,
 * //   allocated: 15,
 * //   reserved: 5,
 * //   committed: 20,
 * //   available: 60
 * // }
 */
export function aggregateAvailability(
  inventories: InventorySnapshot[]
): AvailabilityBreakdown {
  const totals = inventories.reduce(
    (acc, inv) => ({
      onHand: acc.onHand + (inv.onHand ?? 0),
      allocated: acc.allocated + (inv.allocated ?? 0),
      reserved: acc.reserved + (inv.reserved ?? 0),
    }),
    { onHand: 0, allocated: 0, reserved: 0 }
  );

  return getAvailabilityBreakdown(totals);
}

/**
 * Format availability for display
 *
 * Creates human-readable availability message
 *
 * @param snapshot - Inventory levels
 * @returns Formatted availability string
 *
 * @example
 * formatAvailability({ onHand: 100, allocated: 30, reserved: 10 })
 * // Returns: "60 available (100 on hand, 40 committed)"
 *
 * @example
 * formatAvailability({ onHand: 5, allocated: 3, reserved: 0 })
 * // Returns: "2 available (5 on hand, 3 committed) - LOW STOCK"
 */
export function formatAvailability(snapshot: InventorySnapshot): string {
  const breakdown = getAvailabilityBreakdown(snapshot);
  const status = getAvailabilityStatus(snapshot);

  let message = `${breakdown.available} available (${breakdown.onHand} on hand, ${breakdown.committed} committed)`;

  if (status === 'low_stock') {
    message += ' - LOW STOCK';
  } else if (status === 'out_of_stock') {
    message = 'OUT OF STOCK';
  }

  return message;
}
