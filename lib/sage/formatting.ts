/**
 * SAGE Accounting CSV Formatting Utilities
 *
 * Transforms database records into SAGE accounting CSV format for invoice export.
 * Based on specification in /docs/SAGE_PAYMENT_TERMS.md
 *
 * @module lib/sage/formatting
 */

import { Decimal } from '@prisma/client/runtime/library';
import { stringify } from 'csv-stringify/sync';

/**
 * SAGE CSV row structure (17 columns)
 * Note: "Quanitity" typo is intentional to match SAGE format
 */
export interface SageRow {
  /** Date in MM/DD/YYYY format */
  Date: string;
  /** Customer ID from SAGE system */
  'Customer ID Sage': string;
  /** Due date in MM/DD/YYYY format */
  'Due Date': string;
  /** Invoice or Credit Memo number */
  'Invoice/CM #': string;
  /** Customer purchase order number (optional) */
  'Customer PO': string;
  /** Sales representative ID/name */
  'Sales Representative ID': string;
  /** SKU code */
  'UPC / SKU': string;
  /** Product description */
  Description: string;
  /** Quantity ordered (note typo!) */
  Quanitity: number;
  /** Unit price per item */
  'Unit Price': string;
  /** Total amount (negated for SAGE) */
  'Amount ': string;  // Note trailing space!
  /** Accounts Receivable account (static: 11000) */
  'Accounts Receivable Account': string;
  /** Tax type (static: 1) */
  'Tax Type': string;
  /** General Ledger account (static: 40000) */
  'G/L Account': string;
  /** Credit memo flag (static: FALSE) */
  'Credit Memo': string;
  /** Item ID (duplicate of SKU) */
  'Item ID': string;
  /** Number of line items in this invoice */
  'Number of Distributions': number;
}

/**
 * Order with all required relations for SAGE export
 */
export interface OrderWithRelations {
  id: string;
  orderedAt: Date | null;
  customerId: string;
  customer: {
    name: string;
    paymentTerms: string | null;
  };
  invoices: Array<{
    invoiceNumber: string | null;
    issuedAt: Date | null;
    dueDate: Date | null;
  }>;
  orderLines: Array<{
    id: string;
    quantity: number;
    unitPrice: Decimal;
    isSample: boolean;
    sku: {
      code: string;
      product: {
        name: string;
      };
    };
  }>;
  portalUser?: {
    name: string | null;
  } | null;
}

/**
 * Format a Date to MM/DD/YYYY for SAGE
 *
 * @param date - JavaScript Date object
 * @returns Date string in MM/DD/YYYY format
 *
 * @example
 * formatDate(new Date('2025-11-05')) // Returns "11/5/2025"
 */
export function formatDate(date: Date): string {
  const month = date.getMonth() + 1;  // 0-indexed
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Format a Decimal amount for SAGE (negate and format to 2 decimals)
 *
 * SAGE requires amounts to be negative for invoices (accounting convention).
 *
 * @param amount - Prisma Decimal amount
 * @returns Negated amount as string with 2 decimal places
 *
 * @example
 * formatAmount(new Decimal("219.96")) // Returns "-219.96"
 * formatAmount(new Decimal("-50.00")) // Returns "50.00" (double negative)
 */
export function formatAmount(amount: Decimal): string {
  const negated = amount.negated();
  return negated.toFixed(2);
}

/**
 * Calculate number of distributions (line items per invoice)
 *
 * SAGE uses this to validate that all GL distributions have been received.
 *
 * @param orders - Array of orders with line items
 * @returns Map of invoice number to line item count
 *
 * @example
 * const counts = calculateDistributions(orders);
 * counts.get("177507") // Returns 6 (invoice has 6 line items)
 */
export function calculateDistributions(
  orders: OrderWithRelations[]
): Map<string, number> {
  const distributionCounts = new Map<string, number>();

  for (const order of orders) {
    const invoiceNumber = order.invoices[0]?.invoiceNumber;
    if (!invoiceNumber) continue;

    // Count non-sample line items
    const lineCount = order.orderLines.filter(line => !line.isSample).length;
    distributionCounts.set(invoiceNumber, lineCount);
  }

  return distributionCounts;
}

/**
 * Transform a single order into SAGE CSV rows
 *
 * Each order line becomes a separate row in the SAGE CSV.
 *
 * @param order - Order with all required relations
 * @param distributionCount - Total line items for this invoice
 * @returns Array of SAGE rows (one per line item)
 *
 * @throws {Error} If order is missing required data
 *
 * @example
 * const rows = transformOrderToSageRows(order, 6);
 * // Returns 6 rows (one per line item) with shared invoice data
 */
export function transformOrderToSageRows(
  order: OrderWithRelations,
  distributionCount: number
): SageRow[] {
  const invoice = order.invoices[0];
  if (!invoice) {
    throw new Error(`Order ${order.id} has no invoice`);
  }

  if (!invoice.invoiceNumber) {
    throw new Error(`Order ${order.id} invoice missing invoice number`);
  }

  const invoiceDate = invoice.issuedAt || order.orderedAt;
  if (!invoiceDate) {
    throw new Error(`Order ${order.id} has no invoice or order date`);
  }

  const dueDate = invoice.dueDate;
  if (!dueDate) {
    throw new Error(`Order ${order.id} invoice missing due date`);
  }

  // Get sales rep name (from portal user if available)
  const salesRepName = order.portalUser?.name || '';

  // Transform each line item to a SAGE row
  return order.orderLines
    .filter(line => !line.isSample)  // Exclude samples
    .map(line => {
      const totalAmount = line.unitPrice.mul(line.quantity);

      return {
        'Date': formatDate(invoiceDate),
        'Customer ID Sage': order.customer.name,
        'Due Date': formatDate(dueDate),
        'Invoice/CM #': invoice.invoiceNumber,
        'Customer PO': '',  // Usually blank
        'Sales Representative ID': salesRepName,
        'UPC / SKU': line.sku.code,
        'Description': line.sku.product.name,
        'Quanitity': line.quantity,  // Note typo!
        'Unit Price': line.unitPrice.toFixed(2),
        'Amount ': formatAmount(totalAmount),  // Note trailing space!
        'Accounts Receivable Account': '11000',
        'Tax Type': '1',
        'G/L Account': '40000',
        'Credit Memo': 'FALSE',
        'Item ID': line.sku.code,
        'Number of Distributions': distributionCount,
      };
    });
}

/**
 * Generate SAGE CSV from order data
 *
 * Creates a CSV string with exact SAGE format including:
 * - 17 columns with specific headers (including typos)
 * - Proper CSV escaping for special characters
 * - One row per line item
 *
 * @param orders - Array of orders with relations
 * @returns CSV string ready for SAGE import
 *
 * @example
 * const csv = generateSageCSV(orders);
 * fs.writeFileSync('sage-export.csv', csv);
 *
 * // Sample output:
 * // Date,Customer ID Sage,Due Date,Invoice/CM #,Customer PO,Sales Representative ID,UPC / SKU,Description,Quanitity,Unit Price,Amount ,Accounts Receivable Account,Tax Type,G/L Account,Credit Memo,Item ID,Number of Distributions
 * // 11/5/2025,Vino Bistro,11/5/2025,177507,,Jared Lorenz,CAL1175,Saddleback Rancher Red 2019,12,19.99,-219.96,11000,1,40000,FALSE,CAL1175,6
 */
export function generateSageCSV(orders: OrderWithRelations[]): string {
  // Calculate distributions for all invoices
  const distributionCounts = calculateDistributions(orders);

  // Transform all orders to SAGE rows
  const allRows: SageRow[] = [];

  for (const order of orders) {
    const invoiceNumber = order.invoices[0]?.invoiceNumber;
    if (!invoiceNumber) continue;

    const distributionCount = distributionCounts.get(invoiceNumber) || 0;
    const rows = transformOrderToSageRows(order, distributionCount);
    allRows.push(...rows);
  }

  // Generate CSV with exact column order
  const csv = stringify(allRows, {
    header: true,
    columns: [
      'Date',
      'Customer ID Sage',
      'Due Date',
      'Invoice/CM #',
      'Customer PO',
      'Sales Representative ID',
      'UPC / SKU',
      'Description',
      'Quanitity',  // Note typo!
      'Unit Price',
      'Amount ',    // Note trailing space!
      'Accounts Receivable Account',
      'Tax Type',
      'G/L Account',
      'Credit Memo',
      'Item ID',
      'Number of Distributions',
    ],
  });

  return csv;
}

/**
 * Validation errors for SAGE export
 */
export interface SageValidationError {
  orderId: string;
  invoiceNumber?: string;
  error: string;
}

/**
 * Validate orders before SAGE export
 *
 * Checks for:
 * - Missing invoice numbers
 * - Missing dates
 * - Missing SKU codes
 * - Missing customer data
 *
 * @param orders - Orders to validate
 * @returns Array of validation errors (empty if all valid)
 *
 * @example
 * const errors = validateOrdersForSage(orders);
 * if (errors.length > 0) {
 *   console.error('Validation failed:', errors);
 *   return;
 * }
 */
export function validateOrdersForSage(
  orders: OrderWithRelations[]
): SageValidationError[] {
  const errors: SageValidationError[] = [];

  for (const order of orders) {
    // Check invoice exists
    if (!order.invoices || order.invoices.length === 0) {
      errors.push({
        orderId: order.id,
        error: 'Order has no invoice',
      });
      continue;
    }

    const invoice = order.invoices[0];

    // Check invoice number
    if (!invoice.invoiceNumber) {
      errors.push({
        orderId: order.id,
        error: 'Invoice missing invoice number',
      });
    }

    // Check dates
    const invoiceDate = invoice.issuedAt || order.orderedAt;
    if (!invoiceDate) {
      errors.push({
        orderId: order.id,
        invoiceNumber: invoice.invoiceNumber || undefined,
        error: 'Missing invoice/order date',
      });
    }

    if (!invoice.dueDate) {
      errors.push({
        orderId: order.id,
        invoiceNumber: invoice.invoiceNumber || undefined,
        error: 'Invoice missing due date',
      });
    }

    // Check customer
    if (!order.customer || !order.customer.name) {
      errors.push({
        orderId: order.id,
        invoiceNumber: invoice.invoiceNumber || undefined,
        error: 'Order missing customer name',
      });
    }

    // Check line items
    if (!order.orderLines || order.orderLines.length === 0) {
      errors.push({
        orderId: order.id,
        invoiceNumber: invoice.invoiceNumber || undefined,
        error: 'Order has no line items',
      });
      continue;
    }

    // Check each line item
    for (const line of order.orderLines) {
      if (line.isSample) continue;  // Skip samples

      if (!line.sku || !line.sku.code) {
        errors.push({
          orderId: order.id,
          invoiceNumber: invoice.invoiceNumber || undefined,
          error: `Line item ${line.id} missing SKU code`,
        });
      }

      if (!line.sku?.product?.name) {
        errors.push({
          orderId: order.id,
          invoiceNumber: invoice.invoiceNumber || undefined,
          error: `Line item ${line.id} missing product name`,
        });
      }
    }
  }

  return errors;
}
