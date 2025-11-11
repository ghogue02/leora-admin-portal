/**
 * SAGE Export Module - Main Entry Point
 *
 * This module provides validation, formatting, and payment terms handling
 * for SAGE accounting software exports.
 */

// Validation exports
export {
  validateOrdersForExport,
  validateCustomer,
  validateSku,
  validateSalesRep,
  validateAmount,
  validateDate,
  formatValidationErrors,
  groupErrorsByOrder,
  groupErrorsByType,
  SageErrorType,
  type ValidationResult,
  type ValidationError,
  type OrderToValidate,
} from './validation';

// Payment terms exports
export {
  PAYMENT_TERMS,
  getPaymentTermDays,
  formatPaymentTerms,
  validatePaymentTerms,
  getPaymentTermDescription,
  type PaymentTermsConfig,
} from './payment-terms';

// Formatting exports
export {
  formatOrdersForSAGE,
  formatOrderLineForSAGE,
  formatCustomerForSAGE,
  formatDateForSAGE,
  formatAmountForSAGE,
  type SAGEOrderExport,
  type SAGEOrderLineExport,
  type SAGECustomerExport,
} from './formatting';

// Classification exports
export {
  classifyOrderForExport,
  isSampleOrder,
  isStorageOrder,
  SageOrderCategory,
  type SageOrderForClassification,
} from './classification';

// Inventory adjustment exports
export {
  orderToInventoryAdjustmentRows,
  generateInventoryAdjustmentCSV,
  type InventoryAdjustmentOrder,
  type InventoryAdjustmentRow,
} from './inventory-adjustment';
