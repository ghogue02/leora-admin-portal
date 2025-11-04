/**
 * Tax Estimation Hook
 *
 * Provides consistent tax calculations for order UI components.
 * Uses the same server-side tax calculation logic to ensure
 * UI estimates match final invoice calculations.
 *
 * @see web/src/lib/invoices/tax-calculator.ts
 * @see web/src/lib/money/totals.ts
 */

import { useMemo } from 'react';
import Decimal from 'decimal.js';
import { VA_TAX_RATES } from '@/lib/money/totals';

export type TaxEstimate = {
  /** Subtotal before taxes (already calculated) */
  subtotal: number;
  /** Virginia wine excise tax ($0.40/liter) */
  exciseTax: number;
  /** Virginia sales tax (5.3%) */
  salesTax: number;
  /** Total of all taxes */
  totalTax: number;
  /** Estimated grand total (subtotal + taxes) */
  total: number;
  /** True if this is an estimate (final may differ) */
  isEstimate: boolean;
  /** Tax rate used for sales tax */
  salesTaxRate: number;
  /** Tax rate used for excise tax */
  excisePerLiter: number;
};

export type UseTaxEstimationParams = {
  /** Order subtotal */
  subtotal: number;
  /** Total liters of wine */
  liters: number;
  /** Override sales tax rate (default: 0.053) */
  salesTaxRate?: number;
  /** Override excise rate (default: 0.40) */
  excisePerLiter?: number;
  /** Whether customer is in-state (affects excise tax) */
  isInState?: boolean;
};

/**
 * Calculate tax estimates using server-side tax logic
 *
 * This hook ensures UI tax estimates match the final calculations
 * performed on the server when creating invoices.
 *
 * @param params - Tax calculation parameters
 * @returns Tax estimate breakdown
 *
 * @example
 * const tax = useTaxEstimation({
 *   subtotal: 500,
 *   liters: 20,
 *   isInState: true
 * });
 *
 * console.log(tax.salesTax); // 26.50 (5.3% of $500)
 * console.log(tax.exciseTax); // 8.00 (20 liters × $0.40)
 * console.log(tax.total); // 534.50
 */
export function useTaxEstimation({
  subtotal,
  liters,
  salesTaxRate = VA_TAX_RATES.SALES_TAX_RATE,
  excisePerLiter = VA_TAX_RATES.EXCISE_PER_LITER,
  isInState = true,
}: UseTaxEstimationParams): TaxEstimate {
  return useMemo(() => {
    // Use Decimal for accuracy
    const subtotalDecimal = new Decimal(subtotal);
    const litersDecimal = new Decimal(liters);

    // Calculate excise tax (only for in-state sales)
    const exciseTaxDecimal = isInState
      ? litersDecimal.times(excisePerLiter)
      : new Decimal(0);

    // Calculate sales tax
    const salesTaxDecimal = subtotalDecimal.times(salesTaxRate);

    // Total tax
    const totalTaxDecimal = exciseTaxDecimal.plus(salesTaxDecimal);

    // Grand total
    const totalDecimal = subtotalDecimal.plus(totalTaxDecimal);

    return {
      subtotal,
      exciseTax: Number(exciseTaxDecimal.toFixed(2)),
      salesTax: Number(salesTaxDecimal.toFixed(2)),
      totalTax: Number(totalTaxDecimal.toFixed(2)),
      total: Number(totalDecimal.toFixed(2)),
      isEstimate: true, // UI calculations are always estimates
      salesTaxRate,
      excisePerLiter,
    };
  }, [subtotal, liters, salesTaxRate, excisePerLiter, isInState]);
}
