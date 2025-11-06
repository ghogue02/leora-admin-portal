/**
 * SAGE Export Script - Main Orchestration
 *
 * This script exports HAL invoices to SAGE accounting software format.
 * It handles the complete workflow from database query to CSV generation.
 *
 * @module scripts/export-to-sage
 * @see /docs/SAGE_PAYMENT_TERMS.md for business logic documentation
 *
 * Usage:
 * ```bash
 * # Export specific date range
 * npx tsx scripts/export-to-sage.ts --tenant=<uuid> --start=2025-11-05 --end=2025-11-05 --user=<uuid>
 *
 * # Export for November 5, 2025 (compare with /SAGE/11.05.25 invoices.csv)
 * npx tsx scripts/export-to-sage.ts \
 *   --tenant=018f8326-3ce5-7b5e-b0be-f65a28cdfe7a \
 *   --start=2025-11-05 \
 *   --end=2025-11-05 \
 *   --user=<user-uuid>
 * ```
 */

import { PrismaClient } from '@prisma/client';
import { parse } from 'date-fns';
import { formatDateForSAGE, parseUTCDate, formatUTCDate } from '../src/lib/dates';
import { normalizePaymentTerms, VALID_PAYMENT_TERMS } from '../src/lib/sage/payment-terms';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result of a SAGE export operation
 */
interface SageExportResult {
  success: boolean;
  exportId: string;
  recordCount: number;
  invoiceCount: number;
  csvContent: string;
  fileName: string;
  errors?: ValidationError[];
}

/**
 * Validation error details
 */
interface ValidationError {
  type: 'MISSING_CUSTOMER' | 'MISSING_SKU' | 'MISSING_SALES_REP' | 'INVALID_AMOUNT' | 'INVALID_DATE' | 'INVALID_PAYMENT_TERMS';
  message: string;
  orderId?: string;
  invoiceId?: string;
  customerId?: string;
  skuId?: string;
  rowData?: any;
}

/**
 * SAGE CSV row format
 */
interface SageExportRow {
  date: string;                           // MM/DD/YYYY
  customerIdSage: string;                 // Customer name (SAGE format)
  dueDate: string;                        // MM/DD/YYYY
  invoiceNumber: string;                  // Invoice number
  customerPO: string;                     // Purchase order (or blank)
  salesRepId: string;                     // Sales rep name
  upcSku: string;                         // SKU code
  description: string;                    // Product description
  quantity: number;                       // Quantity
  unitPrice: number;                      // Price per unit
  amount: number;                         // Total (negative)
  accountsReceivableAccount: number;      // Static: 11000
  taxType: number;                        // Static: 1
  glAccount: number;                      // Static: 40000
  creditMemo: boolean;                    // Static: FALSE
  itemId: string;                         // Same as UPC/SKU
  numberOfDistributions: number;          // Line items per invoice
}

/**
 * Order data from database with all required relations
 */
interface OrderWithRelations {
  id: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    paymentTerms: string | null;
    salesRep: {
      user: {
        fullName: string;
      };
    } | null;
  };
  invoices: Array<{
    id: string;
    invoiceNumber: string | null;
    issuedAt: Date | null;
    poNumber: string | null;
  }>;
  lines: Array<{
    id: string;
    skuId: string;
    quantity: number;
    unitPrice: any; // Decimal
    isSample: boolean;
    sku: {
      id: string;
      code: string;
      product: {
        name: string;
      };
    };
  }>;
}

// ============================================================================
// PAYMENT TERMS LOGIC
// ============================================================================

/**
 * Calculate due date based on invoice date and payment terms
 *
 * @param invoiceDate - The invoice date
 * @param paymentTerms - Payment terms string (e.g., "Net 30 Days", "C.O.D.")
 * @returns Calculated due date
 *
 * @see /docs/SAGE_PAYMENT_TERMS.md for business rules
 */
function calculateDueDate(invoiceDate: Date, paymentTerms: string | null): Date {
  const termsInput = paymentTerms && paymentTerms.trim() ? paymentTerms.trim() : 'C.O.D.';
  const normalized = normalizePaymentTerms(termsInput);

  if (!normalized) {
    console.warn(
      `Unknown payment terms: "${termsInput}". Defaulting to C.O.D. Valid terms: ${VALID_PAYMENT_TERMS.join(', ')}`
    );
    return new Date(invoiceDate);
  }

  if (normalized === 'C.O.D.') {
    return new Date(invoiceDate);
  }

  if (normalized === 'Net 30 Days') {
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate;
  }

  if (normalized === 'Net 15th of Next Month') {
    const dueDate = new Date(invoiceDate);
    dueDate.setMonth(dueDate.getMonth() + 1);
    dueDate.setDate(15);
    return dueDate;
  }

  if (normalized === 'Net 30th of Next Month') {
    const dueDate = new Date(invoiceDate);
    dueDate.setMonth(dueDate.getMonth() + 2);
    dueDate.setDate(0);
    return dueDate;
  }

  if (normalized === 'Net 32 Days') {
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 32);
    return dueDate;
  }

  if (normalized === 'Net 45 Days') {
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 45);
    return dueDate;
  }

  console.warn(
    `Unhandled payment terms after normalization: "${termsInput}". Defaulting to C.O.D. Valid terms: ${VALID_PAYMENT_TERMS.join(', ')}`
  );
  return new Date(invoiceDate);
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

/**
 * Validate order data before export
 *
 * @param order - Order with all required relations
 * @returns Array of validation errors (empty if valid)
 */
function validateOrder(order: OrderWithRelations): ValidationError[] {
  const errors: ValidationError[] = [];

  // Skip orders with no non-sample line items (valid scenario)
  const nonSampleLines = order.lines.filter(line => !line.isSample);
  if (nonSampleLines.length === 0) {
    // Order has only samples or is empty - will be skipped during export
    return errors; // Return empty errors (not an error)
  }

  // Check if invoice exists
  if (!order.invoices || order.invoices.length === 0) {
    errors.push({
      type: 'INVALID_DATE',
      message: 'Order has no invoice',
      orderId: order.id,
    });
    return errors; // Can't continue without invoice
  }

  const invoice = order.invoices[0];

  // Validate invoice number
  if (!invoice.invoiceNumber) {
    errors.push({
      type: 'INVALID_DATE',
      message: 'Invoice number is missing',
      orderId: order.id,
      invoiceId: invoice.id,
    });
  }

  // Validate invoice date
  if (!invoice.issuedAt) {
    errors.push({
      type: 'INVALID_DATE',
      message: 'Invoice date is missing',
      orderId: order.id,
      invoiceId: invoice.id,
    });
  }

  // Validate customer
  if (!order.customer) {
    errors.push({
      type: 'MISSING_CUSTOMER',
      message: 'Customer not found',
      orderId: order.id,
      customerId: order.customerId,
    });
    return errors; // Can't continue without customer
  }

  // Validate payment terms
  if (!order.customer.paymentTerms) {
    errors.push({
      type: 'INVALID_PAYMENT_TERMS',
      message: `Customer "${order.customer.name}" has no payment terms assigned`,
      orderId: order.id,
      customerId: order.customer.id,
    });
  } else if (!normalizePaymentTerms(order.customer.paymentTerms)) {
    errors.push({
      type: 'INVALID_PAYMENT_TERMS',
      message: `Customer "${order.customer.name}" has unsupported payment terms "${order.customer.paymentTerms}"`,
      orderId: order.id,
      customerId: order.customer.id,
    });
  }

  // Validate sales rep (warning only)
  if (!order.customer.salesRep) {
    console.warn(`Warning: Customer "${order.customer.name}" has no sales rep assigned (order ${order.id})`);
  }

  // Validate order lines
  for (const line of order.lines) {
    // Skip sample items
    if (line.isSample) {
      continue;
    }

    // Validate SKU
    if (!line.sku) {
      errors.push({
        type: 'MISSING_SKU',
        message: 'SKU not found',
        orderId: order.id,
        skuId: line.skuId,
      });
      continue;
    }

    // Validate SKU code
    if (!line.sku.code) {
      errors.push({
        type: 'MISSING_SKU',
        message: 'SKU has no code',
        orderId: order.id,
        skuId: line.skuId,
      });
    }

    // Validate product
    if (!line.sku.product || !line.sku.product.name) {
      errors.push({
        type: 'MISSING_SKU',
        message: 'SKU has no product or product name',
        orderId: order.id,
        skuId: line.skuId,
      });
    }

    // Validate amounts
    if (line.quantity <= 0) {
      errors.push({
        type: 'INVALID_AMOUNT',
        message: `Invalid quantity: ${line.quantity}`,
        orderId: order.id,
        skuId: line.skuId,
      });
    }

    // Allow $0 prices (promotional/closeout items), just check it's numeric
    const unitPrice = Number(line.unitPrice);
    if (!line.unitPrice || isNaN(unitPrice)) {
      errors.push({
        type: 'INVALID_AMOUNT',
        message: `Invalid unit price: ${line.unitPrice}`,
        orderId: order.id,
        skuId: line.skuId,
      });
    }
  }

  return errors;
}

// ============================================================================
// CSV FORMATTING
// ============================================================================

// Date formatting now handled by centralized /lib/dates.ts utility
// Using formatDateForSAGE() which formats in UTC to prevent timezone shifts

/**
 * Format amount as negative (SAGE accounting convention)
 */
function formatAmount(quantity: number, unitPrice: number): number {
  const total = quantity * unitPrice;
  return -Math.abs(total); // Always negative
}

/**
 * Convert order to SAGE export rows
 *
 * @param order - Order with all relations
 * @param distributionCounts - Map of invoice number to line item count
 * @returns Array of SAGE export rows
 */
function orderToSageRows(
  order: OrderWithRelations,
  distributionCounts: Map<string, number>
): SageExportRow[] {
  const invoice = order.invoices[0];
  const invoiceDate = invoice.issuedAt!;
  const invoiceNumber = invoice.invoiceNumber!;
  const poNumber = invoice.poNumber || '';

  // Calculate due date
  const dueDate = calculateDueDate(invoiceDate, order.customer.paymentTerms);

  // Sales rep name
  const salesRepName = order.customer.salesRep
    ? order.customer.salesRep.user.fullName
    : '';

  // Number of distributions (line items per invoice)
  const numberOfDistributions = distributionCounts.get(invoiceNumber) || 0;

  // Create a row for each non-sample line item
  const rows: SageExportRow[] = [];
  for (const line of order.lines) {
    // Skip sample items
    if (line.isSample) {
      continue;
    }

    const unitPrice = Number(line.unitPrice);
    const amount = formatAmount(line.quantity, unitPrice);

    rows.push({
      date: formatDateForSAGE(invoiceDate),
      customerIdSage: order.customer.name,
      dueDate: formatDateForSAGE(dueDate),
      invoiceNumber: invoiceNumber,
      customerPO: poNumber,
      salesRepId: salesRepName,
      upcSku: line.sku.code,
      description: line.sku.product.name,
      quantity: line.quantity,
      unitPrice: unitPrice,
      amount: amount,
      accountsReceivableAccount: 11000,
      taxType: 1,
      glAccount: 40000,
      creditMemo: false,
      itemId: line.sku.code,
      numberOfDistributions: numberOfDistributions,
    });
  }

  return rows;
}

/**
 * Convert SAGE rows to CSV format
 *
 * @param rows - Array of SAGE export rows
 * @returns CSV string with header
 */
function rowsToCSV(rows: SageExportRow[]): string {
  // CSV header (matches SAGE format exactly)
  const header = [
    'Date',
    'Customer ID Sage',
    'Due Date',
    'Invoice/CM #',
    'Customer PO',
    'Sales Representative ID',
    'UPC / SKU',
    'Description',
    'Quanitity', // Note: Typo matches SAGE system
    'Unit Price',
    'Amount ', // Note: Extra space matches SAGE system
    'Accounts Receivable Account',
    'Tax Type',
    'G/L Account',
    'Credit Memo',
    'Item ID',
    'Number of Distributions',
  ];

  const lines = [header.join(',')];

  for (const row of rows) {
    const values = [
      row.date,
      row.customerIdSage,
      row.dueDate,
      row.invoiceNumber,
      row.customerPO,
      row.salesRepId,
      row.upcSku,
      row.description,
      row.quantity.toString(),
      row.unitPrice.toFixed(2),
      row.amount.toFixed(2),
      row.accountsReceivableAccount.toString(),
      row.taxType.toString(),
      row.glAccount.toString(),
      row.creditMemo ? 'TRUE' : 'FALSE',
      row.itemId,
      row.numberOfDistributions.toString(),
    ];

    lines.push(values.join(','));
  }

  return lines.join('\n');
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Export HAL invoices to SAGE format
 *
 * This is the main orchestration function that:
 * 1. Creates a SageExport record
 * 2. Queries orders with invoices in the date range
 * 3. Validates all data
 * 4. Transforms to SAGE format
 * 5. Generates CSV
 * 6. Updates export record
 *
 * @param tenantId - Tenant UUID
 * @param startDate - Start of date range (invoice date)
 * @param endDate - End of date range (invoice date)
 * @param exportedBy - User ID performing the export
 * @returns Export result with CSV content
 *
 * @throws Error if validation fails or database error occurs
 *
 * @example
 * ```typescript
 * const result = await exportToSage(
 *   '018f8326-3ce5-7b5e-b0be-f65a28cdfe7a',
 *   new Date('2025-11-05'),
 *   new Date('2025-11-05'),
 *   'user-uuid'
 * );
 *
 * if (result.success) {
 *   await fs.writeFile(result.fileName, result.csvContent);
 *   console.log(`Exported ${result.invoiceCount} invoices (${result.recordCount} line items)`);
 * }
 * ```
 */
async function exportToSage(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  exportedBy: string
): Promise<SageExportResult> {
  let exportRecord: any = null;

  try {
    // ========================================================================
    // STEP 1: Create SageExport record
    // ========================================================================

    exportRecord = await prisma.sageExport.create({
      data: {
        tenantId,
        startDate,
        endDate,
        status: 'VALIDATING',
        exportedBy,
      },
    });

    console.log(`Created export record: ${exportRecord.id}`);
    console.log(`Date range: ${formatDateForSAGE(startDate)} - ${formatDateForSAGE(endDate)}`);

    // ========================================================================
    // STEP 2: Query orders with invoices in date range
    // ========================================================================

    console.log('Querying database...');
    console.log('  Start date:', startDate.toISOString());
    console.log('  End date:', endDate.toISOString());

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        invoices: {
          some: {
            issuedAt: {
              gte: startDate,
              lte: endDate,
            },
            status: {
              not: 'DRAFT', // Only export finalized invoices
            },
          },
        },
      },
      include: {
        customer: {
          include: {
            salesRep: {
              include: {
                user: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        invoices: {
          where: {
            issuedAt: {
              gte: startDate,
              lte: endDate,
            },
            status: {
              not: 'DRAFT',
            },
          },
          select: {
            id: true,
            invoiceNumber: true,
            issuedAt: true,
            poNumber: true,
          },
        },
        lines: {
          include: {
            sku: {
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }) as OrderWithRelations[];

    console.log(`Found ${orders.length} orders with invoices`);

    // ========================================================================
    // STEP 3: Validate all orders
    // ========================================================================

    await prisma.sageExport.update({
      where: { id: exportRecord.id },
      data: { status: 'VALIDATING' },
    });

    const allErrors: ValidationError[] = [];

    for (const order of orders) {
      const errors = validateOrder(order);
      if (errors.length > 0) {
        allErrors.push(...errors);
      }
    }

    // Save validation errors to database
    if (allErrors.length > 0) {
      console.error(`Found ${allErrors.length} validation errors`);

      // Create error records
      for (const error of allErrors) {
        await prisma.sageExportError.create({
          data: {
            tenantId,
            exportId: exportRecord.id,
            orderId: error.orderId,
            invoiceId: error.invoiceId,
            customerId: error.customerId,
            skuId: error.skuId,
            errorType: error.type,
            errorMessage: error.message,
            rowData: error.rowData || {},
          },
        });
      }

      // Update export status
      await prisma.sageExport.update({
        where: { id: exportRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: `Validation failed with ${allErrors.length} errors`,
          completedAt: new Date(),
        },
      });

      throw new Error(
        `Export validation failed with ${allErrors.length} errors. ` +
        `Check SageExportError table for details (exportId: ${exportRecord.id})`
      );
    }

    console.log('Validation passed ✓');

    // ========================================================================
    // STEP 4: Calculate number of distributions
    // ========================================================================

    console.log('Calculating distributions...');

    const distributionCounts = new Map<string, number>();

    for (const order of orders) {
      const invoice = order.invoices[0];
      if (!invoice || !invoice.invoiceNumber) continue;

      // Count non-sample line items
      const lineCount = order.lines.filter(line => !line.isSample).length;
      distributionCounts.set(invoice.invoiceNumber, lineCount);
    }

    console.log(`Calculated distributions for ${distributionCounts.size} invoices`);

    // ========================================================================
    // STEP 5: Transform to SAGE format
    // ========================================================================

    await prisma.sageExport.update({
      where: { id: exportRecord.id },
      data: { status: 'EXPORTING' },
    });

    console.log('Transforming to SAGE format...');

    const allRows: SageExportRow[] = [];
    const invoiceSet = new Set<string>();

    for (const order of orders) {
      const rows = orderToSageRows(order, distributionCounts);
      allRows.push(...rows);

      // Track unique invoices
      if (order.invoices[0]?.invoiceNumber) {
        invoiceSet.add(order.invoices[0].invoiceNumber);
      }
    }

    console.log(`Generated ${allRows.length} line items for ${invoiceSet.size} invoices`);

    // ========================================================================
    // STEP 6: Generate CSV
    // ========================================================================

    console.log('Generating CSV...');

    const csvContent = rowsToCSV(allRows);

    // Generate filename: SAGE_Export_YYYY-MM-DD.csv (using UTC to prevent timezone shift)
    const dateStr = formatUTCDate(startDate);
    const fileName = `SAGE_Export_${dateStr}.csv`;

    // ========================================================================
    // STEP 7: Update export record
    // ========================================================================

    await prisma.sageExport.update({
      where: { id: exportRecord.id },
      data: {
        status: 'COMPLETED',
        recordCount: allRows.length,
        invoiceCount: invoiceSet.size,
        fileName: fileName,
        completedAt: new Date(),
      },
    });

    console.log('Export completed successfully ✓');

    return {
      success: true,
      exportId: exportRecord.id,
      recordCount: allRows.length,
      invoiceCount: invoiceSet.size,
      csvContent,
      fileName,
    };

  } catch (error) {
    // Update export record with error
    if (exportRecord) {
      await prisma.sageExport.update({
        where: { id: exportRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });
    }

    throw error;
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

/**
 * Parse command line arguments
 */
function parseArgs(): {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  userId: string;
  outputDir?: string;
} {
  const args = process.argv.slice(2);

  const getArg = (name: string): string | undefined => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg?.split('=')[1];
  };

  const tenantId = getArg('tenant');
  const startDateStr = getArg('start');
  const endDateStr = getArg('end');
  const userId = getArg('user');
  const outputDir = getArg('output');

  if (!tenantId || !startDateStr || !endDateStr || !userId) {
    console.error('Usage: npx tsx scripts/export-to-sage.ts --tenant=<uuid> --start=YYYY-MM-DD --end=YYYY-MM-DD --user=<uuid> [--output=/path/to/dir]');
    console.error('\nExample:');
    console.error('  npx tsx scripts/export-to-sage.ts \\');
    console.error('    --tenant=018f8326-3ce5-7b5e-b0be-f65a28cdfe7a \\');
    console.error('    --start=2025-11-05 \\');
    console.error('    --end=2025-11-05 \\');
    console.error('    --user=<user-uuid>');
    process.exit(1);
  }

  const startDate = parse(startDateStr, 'yyyy-MM-dd', new Date());
  startDate.setUTCHours(0, 0, 0, 0); // Start of day in UTC

  const endDate = parse(endDateStr, 'yyyy-MM-dd', new Date());
  endDate.setUTCHours(23, 59, 59, 999); // End of day in UTC

  return { tenantId, startDate, endDate, userId, outputDir };
}

/**
 * Main CLI execution
 */
async function main() {
  try {
    const { tenantId, startDate, endDate, userId, outputDir } = parseArgs();

    console.log('════════════════════════════════════════════════════════════');
    console.log('  SAGE Export - HAL Invoices to SAGE Accounting Format');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    const result = await exportToSage(tenantId, startDate, endDate, userId);

    if (result.success) {
      // Determine output path
      const outputPath = outputDir
        ? path.join(outputDir, result.fileName)
        : path.join(process.cwd(), 'exports', result.fileName);

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Write CSV file
      await fs.writeFile(outputPath, result.csvContent, 'utf-8');

      console.log('');
      console.log('════════════════════════════════════════════════════════════');
      console.log('  Export Summary');
      console.log('════════════════════════════════════════════════════════════');
      console.log(`Export ID:      ${result.exportId}`);
      console.log(`Invoices:       ${result.invoiceCount}`);
      console.log(`Line Items:     ${result.recordCount}`);
      console.log(`File:           ${outputPath}`);
      console.log(`File Size:      ${Buffer.byteLength(result.csvContent, 'utf-8')} bytes`);
      console.log('════════════════════════════════════════════════════════════');
      console.log('');
      console.log('✓ Export completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Review the CSV file for accuracy');
      console.log('2. Compare with previous exports if available');
      console.log('3. Import into SAGE accounting system');
      console.log('');
    } else {
      console.error('Export failed. Check logs for details.');
      process.exit(1);
    }

  } catch (error) {
    console.error('');
    console.error('════════════════════════════════════════════════════════════');
    console.error('  Export Failed');
    console.error('════════════════════════════════════════════════════════════');
    console.error('');
    console.error(error instanceof Error ? error.message : String(error));
    console.error('');

    if (error instanceof Error && error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  exportToSage,
  calculateDueDate,
  validateOrder,
  orderToSageRows,
  rowsToCSV,
  formatDateForSAGE,
  formatAmount,
};

export type {
  SageExportResult,
  ValidationError,
  SageExportRow,
  OrderWithRelations,
};
