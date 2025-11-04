/**
 * Money Calculation Types
 *
 * Type-safe definitions for money and line item calculations
 */

import { Decimal } from 'decimal.js';

/**
 * Order line item for calculations
 * Unit prices can be strings or numbers (converted to Decimal internally)
 */
export type MoneyLine = {
  quantity: number;
  unitPrice: string | number;
};

/**
 * Complete tax breakdown
 */
export type TaxBreakdown = {
  exciseTax: Decimal;
  salesTax: Decimal;
  totalTax: Decimal;
};

/**
 * Complete order totals
 * All values returned as strings for display/storage
 */
export type MoneyTotals = {
  subtotal: string;
  salesTax: string;
  exciseTax: string;
  total: string;
};

/**
 * Tax calculation parameters
 */
export type TaxParams = {
  subtotal: Decimal;
  liters: Decimal;
  salesTaxRate: number;      // e.g., 0.053 for 5.3%
  excisePerLiter: number;    // e.g., 0.40 for $0.40/liter
};
