/**
 * Invoice Services - Main Export
 *
 * Complete invoice generation system with VA ABC compliance
 */

// Format Selection
export {
  determineInvoiceFormat,
  shouldApplyExciseTax,
  getFormatDescription,
  getRequiredFields,
  validateInvoiceFormat,
  type FormatSelectionContext,
} from './format-selector';

// Tax Calculation
export {
  calculateVAExciseTax,
  calculateSalesTax,
  calculateInvoiceTaxes,
  getTaxRule,
  calculateTaxFromRules,
  initializeDefaultTaxRules,
  VA_TAX_RATES,
  type TaxCalculation,
} from './tax-calculator';

// Liter Calculations
export {
  parseBottleSizeToLiters,
  calculateLineItemLiters,
  calculateInvoiceTotalLiters,
  formatLitersForInvoice,
  litersToGallons,
  calculateLitersFromCases,
} from './liter-calculator';

// Case/Bottle Conversion
export {
  bottlesToCases,
  casesToBottles,
  formatCasesForInvoice,
  calculateCasesAndBottles,
  getDisplayFormat,
} from './case-converter';

// Interest Calculation
export {
  calculateOverdueInterest,
  calculateCompoundInterest,
  formatInterestRate,
  getVACollectionTerms,
  getVAComplianceNotice,
  projectFutureBalance,
  VA_INTEREST_RATE,
} from './interest-calculator';

// Complete Invoice Builder
export {
  buildInvoiceData,
  saveCalculatedOrderLineValues,
  createVAInvoice,
  type InvoiceDataInput,
  type EnrichedOrderLine,
  type CompleteInvoiceData,
} from './invoice-data-builder';
