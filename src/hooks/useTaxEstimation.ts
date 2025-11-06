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
  /** Delivery fee */
  deliveryFee: number;
  /** Split-case fee */
  splitCaseFee: number;
  /** Virginia wine excise tax ($0.40/liter) */
  exciseTax: number;
  /** Virginia sales tax (5.3%) */
  salesTax: number;
  /** Total of all taxes */
  totalTax: number;
  /** Estimated grand total (subtotal + fees + taxes) */
  total: number;
  /** True if this is an estimate (final may differ) */
  isEstimate: boolean;
  /** Tax rate used for sales tax */
  salesTaxRate: number;
  /** Tax rate used for excise tax */
  excisePerLiter: number;
  /** Whether customer is B2B (tax-exempt) */
  isB2B: boolean;
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
  /** Whether customer is B2B (tax-exempt) */
  isB2B?: boolean;
  /** Optional delivery fee */
  deliveryFee?: number;
  /** Optional split-case fee */
  splitCaseFee?: number;
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
 *   isInState: true,
 *   isB2B: false,
 *   deliveryFee: 10,
 *   splitCaseFee: 5
 * });
 *
 * console.log(tax.salesTax); // 26.50 (5.3% of $500) or 0 if B2B
 * console.log(tax.exciseTax); // 8.00 (20 liters × $0.40) or 0 if B2B
 * console.log(tax.total); // 549.50 (includes fees)
 */
export function useTaxEstimation({
  subtotal,
  liters,
  salesTaxRate = VA_TAX_RATES.SALES_TAX_RATE,
  excisePerLiter = VA_TAX_RATES.EXCISE_PER_LITER,
  isInState = true,
  isB2B = false,
  deliveryFee = 0,
  splitCaseFee = 0,
}: UseTaxEstimationParams): TaxEstimate {
  return useMemo(() => {
    // Use Decimal for accuracy
    const subtotalDecimal = new Decimal(subtotal);
    const litersDecimal = new Decimal(liters);
    const deliveryFeeDecimal = new Decimal(deliveryFee);
    const splitCaseFeeDecimal = new Decimal(splitCaseFee);

    // B2B customers are tax-exempt
    const exciseTaxDecimal = isB2B
      ? new Decimal(0)
      : isInState
      ? litersDecimal.times(excisePerLiter)
      : new Decimal(0);

    // Calculate sales tax (exempt for B2B)
    const salesTaxDecimal = isB2B
      ? new Decimal(0)
      : subtotalDecimal.times(salesTaxRate);

    // Total tax
    const totalTaxDecimal = exciseTaxDecimal.plus(salesTaxDecimal);

    // Grand total includes fees
    const totalDecimal = subtotalDecimal
      .plus(deliveryFeeDecimal)
      .plus(splitCaseFeeDecimal)
      .plus(totalTaxDecimal);

    return {
      subtotal,
      deliveryFee: Number(deliveryFeeDecimal.toFixed(2)),
      splitCaseFee: Number(splitCaseFeeDecimal.toFixed(2)),
      exciseTax: Number(exciseTaxDecimal.toFixed(2)),
      salesTax: Number(salesTaxDecimal.toFixed(2)),
      totalTax: Number(totalTaxDecimal.toFixed(2)),
      total: Number(totalDecimal.toFixed(2)),
      isEstimate: true, // UI calculations are always estimates
      salesTaxRate,
      excisePerLiter,
      isB2B,
    };
  }, [subtotal, liters, salesTaxRate, excisePerLiter, isInState, isB2B, deliveryFee, splitCaseFee]);
}
