/**
 * SAGE Export Data Validation System
 *
 * Validates order data before exporting to SAGE accounting software.
 * Uses batch queries to efficiently validate 100+ orders with minimal database overhead.
 */

import { PrismaClient } from '@prisma/client';

// ============================================================================
// Types & Enums
// ============================================================================

/**
 * Error types for SAGE validation
 */
export enum SageErrorType {
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  CUSTOMER_MISSING_PAYMENT_TERMS = 'CUSTOMER_MISSING_PAYMENT_TERMS',
  SKU_NOT_FOUND = 'SKU_NOT_FOUND',
  SKU_INACTIVE = 'SKU_INACTIVE',
  SALES_REP_NOT_FOUND = 'SALES_REP_NOT_FOUND',
  SALES_REP_INACTIVE = 'SALES_REP_INACTIVE',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_DATE = 'INVALID_DATE',
  MISSING_ORDER_DATE = 'MISSING_ORDER_DATE',
  MISSING_ORDER_TOTAL = 'MISSING_ORDER_TOTAL',
  EMPTY_ORDER_LINES = 'EMPTY_ORDER_LINES',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  INVALID_UNIT_PRICE = 'INVALID_UNIT_PRICE',
}

/**
 * Individual validation error
 */
export interface ValidationError {
  type: SageErrorType;
  message: string;
  orderId: string;
  customerId?: string;
  skuId?: string;
  salesRepId?: string;
  orderLineId?: string;
  field?: string;
  value?: unknown;
  isWarning?: boolean; // If true, doesn't block export
}

/**
 * Validation result for a batch of orders
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    totalOrders: number;
    validOrders: number;
    invalidOrders: number;
    totalErrors: number;
    totalWarnings: number;
    errorsByType: Record<SageErrorType, number>;
  };
}

/**
 * Order data structure for validation
 */
export interface OrderToValidate {
  id: string;
  customerId: string;
  orderedAt: Date | null;
  total: number | null;
  orderLines: Array<{
    id: string;
    skuId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

/**
 * Customer validation data
 */
interface CustomerValidationData {
  id: string;
  paymentTerms: string | null;
  salesRepId: string | null;
}

/**
 * SKU validation data
 */
interface SkuValidationData {
  id: string;
  code: string;
  isActive: boolean;
}

/**
 * Sales rep validation data
 */
interface SalesRepValidationData {
  id: string;
  isActive: boolean;
  userId: string;
}

// ============================================================================
// Main Validation Functions
// ============================================================================

/**
 * Validate a batch of orders for SAGE export
 * Uses optimized batch queries to minimize database overhead
 *
 * @param orders - Array of orders to validate
 * @param prisma - Prisma client instance
 * @returns Validation result with errors and warnings
 */
export async function validateOrdersForExport(
  orders: OrderToValidate[],
  prisma: PrismaClient
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (!orders || orders.length === 0) {
    return createEmptyValidationResult();
  }

  // Extract unique IDs for batch queries
  const customerIds = Array.from(new Set(orders.map(o => o.customerId)));
  const skuIds = Array.from(new Set(orders.flatMap(o => o.orderLines.map(l => l.skuId))));

  // Batch fetch all required data in parallel
  const [customers, skus, salesReps] = await Promise.all([
    fetchCustomers(customerIds, prisma),
    fetchSkus(skuIds, prisma),
    fetchSalesRepsForCustomers(customerIds, prisma),
  ]);

  // Create lookup maps for O(1) access
  const customerMap = new Map(customers.map(c => [c.id, c]));
  const skuMap = new Map(skus.map(s => [s.id, s]));
  const salesRepMap = new Map(salesReps.map(r => [r.id, r]));

  // Validate each order
  for (const order of orders) {
    // Validate order-level data
    validateOrderData(order, errors);

    // Validate customer
    validateCustomer(order, customerMap, salesRepMap, errors, warnings);

    // Validate order lines
    for (const line of order.orderLines) {
      validateOrderLine(order.id, line, skuMap, errors);
    }
  }

  // Build summary
  const summary = buildValidationSummary(orders, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}

/**
 * Validate customer exists and has payment terms
 */
export function validateCustomer(
  order: OrderToValidate,
  customerMap: Map<string, CustomerValidationData>,
  salesRepMap: Map<string, SalesRepValidationData>,
  errors: ValidationError[],
  warnings: ValidationError[]
): void {
  const customer = customerMap.get(order.customerId);

  if (!customer) {
    errors.push({
      type: SageErrorType.CUSTOMER_NOT_FOUND,
      message: `Customer not found: ${order.customerId}`,
      orderId: order.id,
      customerId: order.customerId,
    });
    return;
  }

  // Check payment terms (required for SAGE export)
  if (!customer.paymentTerms || customer.paymentTerms.trim() === '') {
    errors.push({
      type: SageErrorType.CUSTOMER_MISSING_PAYMENT_TERMS,
      message: `Customer ${order.customerId} is missing payment terms`,
      orderId: order.id,
      customerId: order.customerId,
      field: 'paymentTerms',
    });
  }

  // Validate sales rep (warning only, not blocking)
  if (customer.salesRepId) {
    validateSalesRep(
      order.id,
      customer.salesRepId,
      salesRepMap,
      warnings
    );
  }
}

/**
 * Validate SKU exists and is active
 */
export function validateSku(
  orderId: string,
  orderLineId: string,
  skuId: string,
  skuMap: Map<string, SkuValidationData>,
  errors: ValidationError[]
): void {
  const sku = skuMap.get(skuId);

  if (!sku) {
    errors.push({
      type: SageErrorType.SKU_NOT_FOUND,
      message: `SKU not found: ${skuId}`,
      orderId,
      orderLineId,
      skuId,
    });
    return;
  }

  if (!sku.isActive) {
    errors.push({
      type: SageErrorType.SKU_INACTIVE,
      message: `SKU ${sku.code} is inactive`,
      orderId,
      orderLineId,
      skuId,
    });
  }
}

/**
 * Validate sales rep exists (warning only, doesn't block export)
 */
export function validateSalesRep(
  orderId: string,
  salesRepId: string,
  salesRepMap: Map<string, SalesRepValidationData>,
  warnings: ValidationError[]
): void {
  const salesRep = salesRepMap.get(salesRepId);

  if (!salesRep) {
    warnings.push({
      type: SageErrorType.SALES_REP_NOT_FOUND,
      message: `Sales rep not found: ${salesRepId}`,
      orderId,
      salesRepId,
      isWarning: true,
    });
    return;
  }

  if (!salesRep.isActive) {
    warnings.push({
      type: SageErrorType.SALES_REP_INACTIVE,
      message: `Sales rep ${salesRepId} is inactive`,
      orderId,
      salesRepId,
      isWarning: true,
    });
  }
}

/**
 * Validate numeric amount (can be negative for returns/credits)
 */
export function validateAmount(
  orderId: string,
  field: string,
  amount: number | null | undefined,
  errors: ValidationError[]
): void {
  if (amount === null || amount === undefined) {
    errors.push({
      type: SageErrorType.INVALID_AMOUNT,
      message: `Missing or null ${field}`,
      orderId,
      field,
      value: amount,
    });
    return;
  }

  if (typeof amount !== 'number' || isNaN(amount)) {
    errors.push({
      type: SageErrorType.INVALID_AMOUNT,
      message: `Invalid ${field}: must be a valid number`,
      orderId,
      field,
      value: amount,
    });
  }

  // Note: Negative amounts are allowed for returns/credits
}

/**
 * Validate date is valid
 */
export function validateDate(
  orderId: string,
  field: string,
  date: Date | null | undefined,
  errors: ValidationError[],
  required: boolean = true
): void {
  if (!date) {
    if (required) {
      errors.push({
        type: SageErrorType.INVALID_DATE,
        message: `Missing required date: ${field}`,
        orderId,
        field,
      });
    }
    return;
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    errors.push({
      type: SageErrorType.INVALID_DATE,
      message: `Invalid date for ${field}`,
      orderId,
      field,
      value: date,
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate order-level data (date, total, lines)
 */
function validateOrderData(
  order: OrderToValidate,
  errors: ValidationError[]
): void {
  // Validate order date
  if (!order.orderedAt) {
    errors.push({
      type: SageErrorType.MISSING_ORDER_DATE,
      message: 'Order date is required for SAGE export',
      orderId: order.id,
      field: 'orderedAt',
    });
  } else {
    validateDate(order.id, 'orderedAt', order.orderedAt, errors, true);
  }

  // Validate order total
  validateAmount(order.id, 'total', order.total, errors);

  // Validate order has lines
  if (!order.orderLines || order.orderLines.length === 0) {
    errors.push({
      type: SageErrorType.EMPTY_ORDER_LINES,
      message: 'Order has no line items',
      orderId: order.id,
    });
  }
}

/**
 * Validate order line data
 */
function validateOrderLine(
  orderId: string,
  line: { id: string; skuId: string; quantity: number; unitPrice: number },
  skuMap: Map<string, SkuValidationData>,
  errors: ValidationError[]
): void {
  // Validate SKU
  validateSku(orderId, line.id, line.skuId, skuMap, errors);

  // Validate quantity
  if (!line.quantity || typeof line.quantity !== 'number' || line.quantity <= 0) {
    errors.push({
      type: SageErrorType.INVALID_QUANTITY,
      message: `Invalid quantity: ${line.quantity}`,
      orderId,
      orderLineId: line.id,
      field: 'quantity',
      value: line.quantity,
    });
  }

  // Validate unit price
  validateAmount(orderId, 'unitPrice', line.unitPrice, errors);
}

/**
 * Build validation summary with statistics
 */
function buildValidationSummary(
  orders: OrderToValidate[],
  errors: ValidationError[],
  warnings: ValidationError[]
): ValidationResult['summary'] {
  // Count unique orders with errors
  const ordersWithErrors = new Set(errors.map(e => e.orderId));
  const invalidOrders = ordersWithErrors.size;
  const validOrders = orders.length - invalidOrders;

  // Count errors by type
  const errorsByType: Record<SageErrorType, number> = {} as Record<SageErrorType, number>;
  for (const error of errors) {
    errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
  }

  return {
    totalOrders: orders.length,
    validOrders,
    invalidOrders,
    totalErrors: errors.length,
    totalWarnings: warnings.length,
    errorsByType,
  };
}

/**
 * Create empty validation result
 */
function createEmptyValidationResult(): ValidationResult {
  return {
    isValid: true,
    errors: [],
    warnings: [],
    summary: {
      totalOrders: 0,
      validOrders: 0,
      invalidOrders: 0,
      totalErrors: 0,
      totalWarnings: 0,
      errorsByType: {} as Record<SageErrorType, number>,
    },
  };
}

// ============================================================================
// Database Query Functions (Optimized for Batch Processing)
// ============================================================================

/**
 * Fetch customers in batch
 */
async function fetchCustomers(
  customerIds: string[],
  prisma: PrismaClient
): Promise<CustomerValidationData[]> {
  if (customerIds.length === 0) return [];

  return prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: {
      id: true,
      paymentTerms: true,
      salesRepId: true,
    },
  });
}

/**
 * Fetch SKUs in batch
 */
async function fetchSkus(
  skuIds: string[],
  prisma: PrismaClient
): Promise<SkuValidationData[]> {
  if (skuIds.length === 0) return [];

  return prisma.sku.findMany({
    where: { id: { in: skuIds } },
    select: {
      id: true,
      code: true,
      isActive: true,
    },
  });
}

/**
 * Fetch sales reps for customers (via customer relationship)
 */
async function fetchSalesRepsForCustomers(
  customerIds: string[],
  prisma: PrismaClient
): Promise<SalesRepValidationData[]> {
  if (customerIds.length === 0) return [];

  // Get unique sales rep IDs from customers
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: { salesRepId: true },
  });

  const salesRepIds = Array.from(new Set(
    customers
      .map(c => c.salesRepId)
      .filter((id): id is string => id !== null)
  ));

  if (salesRepIds.length === 0) return [];

  return prisma.salesRep.findMany({
    where: { id: { in: salesRepIds } },
    select: {
      id: true,
      isActive: true,
      userId: true,
    },
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format validation errors for display
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push('=== SAGE Export Validation Results ===');
  lines.push('');
  lines.push(`Total Orders: ${result.summary.totalOrders}`);
  lines.push(`Valid Orders: ${result.summary.validOrders}`);
  lines.push(`Invalid Orders: ${result.summary.invalidOrders}`);
  lines.push(`Total Errors: ${result.summary.totalErrors}`);
  lines.push(`Total Warnings: ${result.summary.totalWarnings}`);
  lines.push('');

  if (Object.keys(result.summary.errorsByType).length > 0) {
    lines.push('Errors by Type:');
    for (const [type, count] of Object.entries(result.summary.errorsByType)) {
      lines.push(`  ${type}: ${count}`);
    }
    lines.push('');
  }

  if (result.errors.length > 0) {
    lines.push('=== Errors (Blocking Export) ===');
    for (const error of result.errors) {
      lines.push(`[${error.type}] Order ${error.orderId}: ${error.message}`);
    }
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('=== Warnings (Non-Blocking) ===');
    for (const warning of result.warnings) {
      lines.push(`[${warning.type}] Order ${warning.orderId}: ${warning.message}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Get validation errors grouped by order ID
 */
export function groupErrorsByOrder(
  errors: ValidationError[]
): Map<string, ValidationError[]> {
  const grouped = new Map<string, ValidationError[]>();

  for (const error of errors) {
    const existing = grouped.get(error.orderId) || [];
    existing.push(error);
    grouped.set(error.orderId, existing);
  }

  return grouped;
}

/**
 * Get validation errors grouped by type
 */
export function groupErrorsByType(
  errors: ValidationError[]
): Map<SageErrorType, ValidationError[]> {
  const grouped = new Map<SageErrorType, ValidationError[]>();

  for (const error of errors) {
    const existing = grouped.get(error.type) || [];
    existing.push(error);
    grouped.set(error.type, existing);
  }

  return grouped;
}
