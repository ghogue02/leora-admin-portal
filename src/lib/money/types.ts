/**
 * Money Calculation Types
 *
 * Type-safe definitions for money and line item calculations
 */

/**
 * Order line item for calculations
 * Unit prices can be strings or numbers (converted to Decimal internally)
 */
export type MoneyLine = {
  quantity: number;
  unitPrice: string | number;
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
