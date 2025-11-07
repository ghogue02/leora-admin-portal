/**
 * Money-Safe Order Total Calculations
 *
 * Uses decimal.js to ensure accurate arithmetic for currency calculations.
 * All functions are pure - same inputs always produce same outputs.
 *
 * Rounding Policy: Banker's rounding (ROUND_HALF_EVEN) at all levels
 * This minimizes cumulative rounding bias.
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md
 */

import Decimal from 'decimal.js';
import { MoneyLine, MoneyTotals } from './types';

// Configure Decimal.js defaults
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_EVEN, // Banker's rounding
  toExpNeg: -9,
  toExpPos: 9,
});

/**
 * Calculate subtotal from line items
 *
 * Formula: Σ (quantity × unitPrice)
 *
 * @param lines - Array of order line items
 * @returns Subtotal as Decimal
 *
 * @example
 * const lines = [
 *   { quantity: 2, unitPrice: '10.99' },
 *   { quantity: 1, unitPrice: '5.50' }
 * ];
 * const subtotal = calcSubtotal(lines);
 * // Returns: Decimal(27.48)
 */
export function calcSubtotal(lines: MoneyLine[]): Decimal {
  return lines.reduce(
    (acc, line) => acc.plus(new Decimal(line.unitPrice).times(line.quantity)),
    new Decimal(0)
  );
}

/**
 * Format Decimal to currency string
 *
 * Rounds to 2 decimal places using banker's rounding
 *
 * @param d - Decimal amount
 * @returns Formatted string (e.g., "10.99")
 *
 * @example
 * formatMoney(new Decimal(10.125)) // "10.12" (rounds to even)
 * formatMoney(new Decimal(10.135)) // "10.14" (rounds to even)
 */
export function formatMoney(d: Decimal): string {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toString();
}

/**
 * Complete order total calculation
 *
 * Single source of truth for calculating order totals with optional fees.
 * Taxes are no longer applied, so totals are simply subtotal + fees.
 *
 * @param params - Calculation parameters
 * @returns Complete totals breakdown as strings
 *
 * @example
 * const totals = calcOrderTotal({
 *   lines: [
 *     { quantity: 2, unitPrice: '25.99' },
 *     { quantity: 1, unitPrice: '18.50' }
 *   ],
 *   deliveryFee: 10.00,
 *   splitCaseFee: 5.00
 * });
 * // Returns: {
 * //   subtotal: "70.48",
 * //   deliveryFee: "10.00",
 * //   splitCaseFee: "5.00",
 * //   salesTax: "0.00",
 * //   exciseTax: "0.00",
 * //   total: "85.48"
 * // }
 */
export function calcOrderTotal({
  lines,
  deliveryFee = 0,
  splitCaseFee = 0,
}: {
  lines: MoneyLine[];
  deliveryFee?: number;
  splitCaseFee?: number;
}): MoneyTotals & { deliveryFee: string; splitCaseFee: string } {
  const subtotal = calcSubtotal(lines);
  const deliveryFeeDecimal = new Decimal(deliveryFee);
  const splitCaseFeeDecimal = new Decimal(splitCaseFee);

  const salesTax = new Decimal(0);
  const exciseTax = new Decimal(0);

  const total = subtotal
    .plus(deliveryFeeDecimal)
    .plus(splitCaseFeeDecimal);

  return {
    subtotal: formatMoney(subtotal),
    deliveryFee: formatMoney(deliveryFeeDecimal),
    splitCaseFee: formatMoney(splitCaseFeeDecimal),
    salesTax: formatMoney(salesTax),
    exciseTax: formatMoney(exciseTax),
    total: formatMoney(total),
  };
}

/**
 * Calculate order total from existing order object
 *
 * Convenience wrapper for calcOrderTotal that works with
 * order objects that may have pre-calculated totals
 *
 * @param order - Order with lines and optional total
 * @param liters - Total liters (for tax calculation)
 * @returns Calculated total as number
 *
 * @deprecated Use calcOrderTotal directly for new code
 */
export function calculateOrderTotal(
  order: { total?: number | string | null; lines?: MoneyLine[] }
): number {
  // If order has pre-calculated total and no lines, trust it
  if (order.total && Number(order.total) > 0 && (!order.lines || order.lines.length === 0)) {
    return Number(order.total);
  }

  // Otherwise recalculate from lines
  if (order.lines && order.lines.length > 0) {
    const totals = calcOrderTotal({
      lines: order.lines,
    });
    return Number(totals.total);
  }

  return 0;
}
