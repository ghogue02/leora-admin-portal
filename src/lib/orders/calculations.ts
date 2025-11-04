/**
 * Shared Order Calculation Utilities
 *
 * IMPORTANT: This file now uses money-safe decimal arithmetic from @/lib/money/totals
 * to ensure consistent, accurate calculations across all endpoints.
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 1.3
 */

import { calcSubtotal } from '@/lib/money/totals';
import Decimal from 'decimal.js';

type OrderLine = {
  quantity: number;
  unitPrice: number | string;
};

type Order = {
  total: number | string | null;
  lines?: OrderLine[];
};

/**
 * Calculate order total from line items or use pre-calculated total
 *
 * This function ensures both admin and sales endpoints calculate totals identically.
 * Now uses decimal.js for money-safe arithmetic to prevent rounding errors.
 *
 * Logic:
 * 1. If order.total exists and is > 0, use it
 * 2. Otherwise, calculate from line items using money-safe arithmetic
 * 3. Return 0 if neither exists
 *
 * @param order - Order with total and/or lines
 * @returns Calculated total as a number
 *
 * @example
 * const total = calculateOrderTotal({
 *   lines: [
 *     { quantity: 2, unitPrice: 10.99 },
 *     { quantity: 1, unitPrice: 5.50 }
 *   ]
 * });
 * // Returns: 27.48 (uses banker's rounding for accuracy)
 */
export function calculateOrderTotal(order: Order): number {
  // Use pre-calculated total if available and valid
  if (order.total && Number(order.total) > 0) {
    return Number(order.total);
  }

  // Calculate from line items if available - using money-safe arithmetic
  if (order.lines && order.lines.length > 0) {
    const subtotal = calcSubtotal(order.lines);
    return Number(subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN));
  }

  // No total or lines available
  return 0;
}

/**
 * Calculate subtotal from line items only (ignores order.total)
 *
 * Uses money-safe decimal arithmetic to prevent rounding errors.
 *
 * @param lines - Array of order line items
 * @returns Calculated subtotal
 *
 * @example
 * const subtotal = calculateSubtotalFromLines([
 *   { quantity: 3, unitPrice: '12.33' },
 *   { quantity: 2, unitPrice: 8.99 }
 * ]);
 * // Returns: 54.97 (3 × $12.33 + 2 × $8.99)
 */
export function calculateSubtotalFromLines(lines: OrderLine[]): number {
  const subtotal = calcSubtotal(lines);
  return Number(subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN));
}

/**
 * Format order total as currency string
 *
 * @param order - Order with total and/or lines
 * @param currency - Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatOrderTotal(order: Order, currency: string = 'USD'): string {
  const total = calculateOrderTotal(order);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(total);
}
