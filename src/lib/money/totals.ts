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
import { MoneyLine, MoneyTotals, TaxBreakdown, TaxParams } from './types';

// Configure Decimal.js defaults
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_EVEN, // Banker's rounding
  toExpNeg: -9,
  toExpPos: 9,
});

/**
 * Virginia tax rates (as of 2025)
 *
 * @constant SALES_TAX_RATE - 5.3% state sales tax
 * @constant EXCISE_PER_LITER - $0.40 per liter wine excise tax
 */
export const VA_TAX_RATES = {
  SALES_TAX_RATE: 0.053,
  EXCISE_PER_LITER: 0.40,
} as const;

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
 * Calculate tax amounts
 *
 * Computes both excise and sales tax based on subtotal and volume
 *
 * @param params - Tax calculation parameters
 * @returns Object with sales and excise tax as Decimals
 *
 * @example
 * const taxes = calcTaxes({
 *   subtotal: new Decimal(100),
 *   liters: new Decimal(50),
 *   salesTaxRate: 0.053,
 *   excisePerLiter: 0.40
 * });
 * // Returns: { sales: Decimal(5.30), excise: Decimal(20.00) }
 */
export function calcTaxes({
  subtotal,
  liters,
  salesTaxRate,
  excisePerLiter,
}: TaxParams): TaxBreakdown {
  const exciseTax = liters.times(excisePerLiter);
  const salesTax = subtotal.times(salesTaxRate);
  const totalTax = exciseTax.plus(salesTax);

  return {
    exciseTax,
    salesTax,
    totalTax,
  };
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
 * Single source of truth for calculating order totals with taxes and fees.
 * This function should be used everywhere totals are calculated:
 * - UI order summary
 * - Server-side order processing
 * - Invoice generation
 * - PDF generation
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
 *   liters: 2.25,
 *   salesTaxRate: 0.053,
 *   excisePerLiter: 0.40,
 *   deliveryFee: 10.00,
 *   splitCaseFee: 5.00
 * });
 * // Returns: {
 * //   subtotal: "70.48",
 * //   deliveryFee: "10.00",
 * //   splitCaseFee: "5.00",
 * //   salesTax: "3.74",
 * //   exciseTax: "0.90",
 * //   total: "90.12"
 * // }
 */
export function calcOrderTotal({
  lines,
  liters,
  salesTaxRate = VA_TAX_RATES.SALES_TAX_RATE,
  excisePerLiter = VA_TAX_RATES.EXCISE_PER_LITER,
  deliveryFee = 0,
  splitCaseFee = 0,
  isB2B = false,
}: {
  lines: MoneyLine[];
  liters: number;
  salesTaxRate?: number;
  excisePerLiter?: number;
  deliveryFee?: number;
  splitCaseFee?: number;
  isB2B?: boolean;
}): MoneyTotals & { deliveryFee: string; splitCaseFee: string } {
  const subtotal = calcSubtotal(lines);
  const deliveryFeeDecimal = new Decimal(deliveryFee);
  const splitCaseFeeDecimal = new Decimal(splitCaseFee);

  // B2B customers are tax-exempt
  const { salesTax, exciseTax } = isB2B
    ? { salesTax: new Decimal(0), exciseTax: new Decimal(0) }
    : calcTaxes({
        subtotal,
        liters: new Decimal(liters),
        salesTaxRate,
        excisePerLiter,
      });

  const total = subtotal
    .plus(deliveryFeeDecimal)
    .plus(splitCaseFeeDecimal)
    .plus(salesTax)
    .plus(exciseTax);

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
  order: { total?: number | string | null; lines?: MoneyLine[] },
  liters: number = 0
): number {
  // If order has pre-calculated total and no lines, trust it
  if (order.total && Number(order.total) > 0 && (!order.lines || order.lines.length === 0)) {
    return Number(order.total);
  }

  // Otherwise recalculate from lines
  if (order.lines && order.lines.length > 0) {
    const totals = calcOrderTotal({
      lines: order.lines,
      liters,
    });
    return Number(totals.total);
  }

  return 0;
}
