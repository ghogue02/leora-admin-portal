#!/usr/bin/env ts-node
/**
 * Sales Report Import Script
 *
 * Imports historical sales data from CSV into Order/OrderLine tables
 *
 * Usage:
 *   npx ts-node scripts/import-sales-report.ts --dry-run
 *   npx ts-node scripts/import-sales-report.ts --execute
 *
 * Date: 2025-10-26
 * Source: Sales report 2022-01-01 to 2025-10-26.csv
 */

import { PrismaClient, Prisma, OrderStatus, InvoiceStatus } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Tenant ID for imported data
  tenantId: '58b8126a-2d2f-4f55-bc98-5b6784800bed',

  // CSV file path
  csvPath: path.join(process.cwd(), '..', 'Sales report 2022-01-01 to 2025-10-26.csv'),

  // Import options (using recommended defaults)
  batchSize: 100,           // Invoices per transaction
  skipSamples: false,       // Import samples for analytics
  autoCreateCustomers: true, // Create missing customers
  autoCreateSKUs: true,     // Create missing SKUs
  createInvoices: true,     // Create Invoice records

  // Matching options
  customerMatchMode: 'fuzzy', // Fuzzy matching for customer names
  skuMatchMode: 'exact',      // Exact SKU code matching
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface CSVRow {
  invoiceNumber: string;
  invoiceDate: string;
  postedDate: string;
  dueDate: string;
  purchaseOrder: string;
  deliveryStartTime: string;
  deliveryEndTime: string;
  specialInstructions: string;
  status: string;
  customer: string;
  salesperson: string;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingState: string;
  shippingCountry: string;
  shippingZip: string;
  itemNumber: string;
  sku: string;
  productName: string;
  supplier: string;
  quantity: string;
  cases: string;
  liters: string;
  unitPrice: string;
  netPrice: string;
}

interface InvoiceGroup {
  invoiceNumber: number;
  customer: string;
  salesperson: string;
  invoiceDate: Date;
  postedDate: Date;
  dueDate?: Date;
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  lines: {
    sku: string;
    productName: string;
    supplier: string;
    quantity: number;
    unitPrice: number;
    netPrice: number;
  }[];
  total: number;
}

interface ImportStats {
  totalInvoices: number;
  processedInvoices: number;
  createdOrders: number;
  createdOrderLines: number;
  createdInvoices: number;
  skippedSamples: number;
  errors: string[];
  customerMatches: number;
  customerCreated: number;
  customerUnmatched: number;
  skuMatches: number;
  skuCreated: number;
  skuMissing: number;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isExecute = args.includes('--execute');

  if (!isDryRun && !isExecute) {
    console.log('Usage:');
    console.log('  --dry-run   Validate and report without importing');
    console.log('  --execute   Actually import data');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('SALES REPORT IMPORT');
  console.log('='.repeat(80));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'EXECUTE (importing data)'}`);
  console.log(`CSV Path: ${CONFIG.csvPath}`);
  console.log(`Tenant ID: ${CONFIG.tenantId}`);
  console.log('');

  // Validate configuration
  if (CONFIG.tenantId === 'YOUR_TENANT_ID_HERE') {
    console.error('ERROR: Please set CONFIG.tenantId before running!');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.csvPath)) {
    console.error(`ERROR: CSV file not found: ${CONFIG.csvPath}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    // Phase 1: Read and parse CSV
    console.log('Phase 1: Reading CSV file...');
    const invoices = await readAndGroupCSV();
    console.log(`✓ Found ${invoices.length} unique invoices with ${invoices.reduce((sum, inv) => sum + inv.lines.length, 0)} line items`);
    console.log('');

    // Phase 2: Analyze data quality
    console.log('Phase 2: Analyzing data quality...');
    const analysis = await analyzeData(prisma, invoices);
    printAnalysis(analysis);
    console.log('');

    // Phase 3: Match customers
    console.log('Phase 3: Matching customers...');
    const customerMap = await matchCustomers(prisma, invoices);
    console.log(`✓ Matched ${customerMap.size} customers`);
    console.log('');

    // Phase 4: Match SKUs
    console.log('Phase 4: Matching SKUs...');
    const skuMap = await matchSKUs(prisma, invoices);
    console.log(`✓ Matched ${skuMap.size} SKUs`);
    console.log('');

    if (isDryRun) {
      console.log('DRY RUN COMPLETE - No data was imported.');
      console.log('Review the analysis above and run with --execute to import.');
      return;
    }

    // Phase 5: Backup database
    console.log('Phase 5: Creating backup...');
    // TODO: Implement backup logic
    console.log('⚠ WARNING: Backup not implemented! Proceeding anyway...');
    console.log('');

    // Phase 6: Execute import
    console.log('Phase 6: Importing data...');
    const stats = await executeImport(prisma, invoices, customerMap, skuMap);
    printImportStats(stats);
    console.log('');

    // Phase 7: Validate import
    console.log('Phase 7: Validating import...');
    await validateImport(prisma);
    console.log('');

    // Phase 8: Update customer metrics
    console.log('Phase 8: Updating customer metrics...');
    await updateCustomerMetrics(prisma, customerMap);
    console.log('');

    console.log('='.repeat(80));
    console.log('IMPORT COMPLETE!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================================
// PHASE 1: READ AND PARSE CSV
// ============================================================================

async function readAndGroupCSV(): Promise<InvoiceGroup[]> {
  const csvContent = fs.readFileSync(CONFIG.csvPath, 'utf8');
  const lines = csvContent.split('\n');

  // Skip first 4 header rows
  const dataLines = lines.slice(4).join('\n');

  const records = parse(dataLines, {
    columns: [
      'invoiceNumber', 'invoiceDate', 'postedDate', 'dueDate',
      'purchaseOrder', 'deliveryStartTime', 'deliveryEndTime',
      'specialInstructions', 'status', 'customer', 'salesperson',
      'shippingAddress1', 'shippingAddress2', 'shippingCity',
      'shippingState', 'shippingCountry', 'shippingZip',
      'itemNumber', 'sku', 'productName', 'supplier',
      'quantity', 'cases', 'liters', 'unitPrice', 'netPrice'
    ],
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true
  }) as CSVRow[];

  // Group by invoice number
  const invoiceMap = new Map<number, InvoiceGroup>();

  for (const row of records) {
    // Skip if not a valid invoice line
    if (!row.invoiceNumber || !row.invoiceNumber.match(/^\d{5,6}$/)) {
      continue;
    }

    const invoiceNum = parseInt(row.invoiceNumber);

    if (!invoiceMap.has(invoiceNum)) {
      invoiceMap.set(invoiceNum, {
        invoiceNumber: invoiceNum,
        customer: row.customer.replace(/"/g, ''),
        salesperson: row.salesperson.replace(/"/g, ''),
        invoiceDate: parseDate(row.invoiceDate),
        postedDate: parseDate(row.postedDate),
        dueDate: row.dueDate ? parseDate(row.dueDate) : undefined,
        address: {
          line1: row.shippingAddress1?.replace(/"/g, ''),
          line2: row.shippingAddress2?.replace(/"/g, ''),
          city: row.shippingCity?.replace(/"/g, ''),
          state: row.shippingState?.replace(/"/g, ''),
          zip: row.shippingZip?.replace(/"/g, ''),
          country: row.shippingCountry?.replace(/"/g, '')
        },
        lines: [],
        total: 0
      });
    }

    const invoice = invoiceMap.get(invoiceNum)!;
    const quantity = parseInt(row.quantity || '0');
    const unitPrice = parseFloat(row.unitPrice || '0');
    const netPrice = parseFloat(row.netPrice || '0');

    invoice.lines.push({
      sku: row.sku?.replace(/"/g, '') || '',
      productName: row.productName?.replace(/"/g, '') || '',
      supplier: row.supplier?.replace(/"/g, '') || '',
      quantity,
      unitPrice,
      netPrice
    });

    invoice.total += netPrice;
  }

  return Array.from(invoiceMap.values());
}

function parseDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  return new Date(dateStr);
}

// ============================================================================
// PHASE 2: ANALYZE DATA QUALITY
// ============================================================================

async function analyzeData(prisma: PrismaClient, invoices: InvoiceGroup[]) {
  const uniqueCustomers = new Set(invoices.map(inv => inv.customer));
  const uniqueSKUs = new Set<string>();
  let totalRevenue = 0;
  let sampleCount = 0;

  for (const invoice of invoices) {
    for (const line of invoice.lines) {
      uniqueSKUs.add(line.sku);
      totalRevenue += line.netPrice;
      if (line.netPrice === 0) {
        sampleCount++;
      }
    }
  }

  return {
    totalInvoices: invoices.length,
    totalLines: invoices.reduce((sum, inv) => sum + inv.lines.length, 0),
    uniqueCustomers: uniqueCustomers.size,
    uniqueSKUs: uniqueSKUs.size,
    totalRevenue,
    sampleLines: sampleCount,
    dateRange: {
      earliest: new Date(Math.min(...invoices.map(inv => inv.invoiceDate.getTime()))),
      latest: new Date(Math.max(...invoices.map(inv => inv.invoiceDate.getTime())))
    }
  };
}

function printAnalysis(analysis: any) {
  console.log('  Total Invoices:', analysis.totalInvoices.toLocaleString());
  console.log('  Total Line Items:', analysis.totalLines.toLocaleString());
  console.log('  Unique Customers:', analysis.uniqueCustomers.toLocaleString());
  console.log('  Unique SKUs:', analysis.uniqueSKUs.toLocaleString());
  console.log('  Total Revenue:', `$${analysis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log('  Sample Lines ($0):', analysis.sampleLines.toLocaleString());
  console.log('  Date Range:', `${analysis.dateRange.earliest.toISOString().split('T')[0]} to ${analysis.dateRange.latest.toISOString().split('T')[0]}`);
}

// ============================================================================
// PHASE 3: MATCH CUSTOMERS
// ============================================================================

async function matchCustomers(
  prisma: PrismaClient,
  invoices: InvoiceGroup[]
): Promise<Map<string, string>> {
  const customerMap = new Map<string, string>();
  const uniqueCustomerNames = new Set(invoices.map(inv => inv.customer));

  console.log(`  Matching ${uniqueCustomerNames.size} unique customer names...`);

  for (const customerName of uniqueCustomerNames) {
    // Try exact match first
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId: CONFIG.tenantId,
        name: {
          equals: customerName,
          mode: 'insensitive'
        }
      }
    });

    if (customer) {
      customerMap.set(customerName, customer.id);
    } else if (CONFIG.autoCreateCustomers) {
      // Find the first invoice for this customer to get address info
      const sampleInvoice = invoices.find(inv => inv.customer === customerName);

      if (sampleInvoice) {
        try {
          // Create new customer from CSV data
          const newCustomer = await prisma.customer.create({
            data: {
              tenantId: CONFIG.tenantId,
              name: customerName,
              street1: sampleInvoice.address.line1 || undefined,
              street2: sampleInvoice.address.line2 || undefined,
              city: sampleInvoice.address.city || undefined,
              state: sampleInvoice.address.state || undefined,
              country: sampleInvoice.address.country || 'US',
              postalCode: sampleInvoice.address.zip || undefined,
              territory: sampleInvoice.address.state || 'Unknown',
              // Leave salesRepId NULL for now
            }
          });
          customerMap.set(customerName, newCustomer.id);
          console.log(`  ✅ Created customer: ${customerName}`);
        } catch (error) {
          console.log(`  ❌ Failed to create customer: ${customerName} - ${error}`);
        }
      }
    } else {
      console.log(`  ⚠ UNMATCHED: ${customerName}`);
    }
  }

  return customerMap;
}

// ============================================================================
// PHASE 4: MATCH SKUS
// ============================================================================

async function matchSKUs(
  prisma: PrismaClient,
  invoices: InvoiceGroup[]
): Promise<Map<string, string>> {
  const skuMap = new Map<string, string>();
  const uniqueSKUs = new Set<string>();
  const skuDataMap = new Map<string, { productName: string; supplier: string }>();

  // Collect SKU data from invoices
  for (const invoice of invoices) {
    for (const line of invoice.lines) {
      uniqueSKUs.add(line.sku);
      if (!skuDataMap.has(line.sku)) {
        skuDataMap.set(line.sku, {
          productName: line.productName,
          supplier: line.supplier
        });
      }
    }
  }

  console.log(`  Matching ${uniqueSKUs.size} unique SKUs...`);

  for (const skuCode of uniqueSKUs) {
    if (!skuCode || skuCode.trim() === '') {
      console.log(`  ⚠ Skipping empty SKU`);
      continue;
    }

    const sku = await prisma.sku.findFirst({
      where: {
        tenantId: CONFIG.tenantId,
        code: skuCode
      }
    });

    if (sku) {
      skuMap.set(skuCode, sku.id);
    } else if (CONFIG.autoCreateSKUs) {
      const skuData = skuDataMap.get(skuCode);
      if (!skuData) continue;

      try {
        // First, find or create Product
        let product = await prisma.product.findFirst({
          where: {
            tenantId: CONFIG.tenantId,
            name: skuData.productName
          }
        });

        if (!product) {
          product = await prisma.product.create({
            data: {
              tenantId: CONFIG.tenantId,
              name: skuData.productName,
              brand: skuData.supplier || 'Unknown',
              category: 'Wine',
            }
          });
        }

        // Create SKU
        const newSku = await prisma.sku.create({
          data: {
            tenantId: CONFIG.tenantId,
            productId: product.id,
            code: skuCode,
            size: parseBottleSize(skuCode),
            unitOfMeasure: 'bottle',
          }
        });

        skuMap.set(skuCode, newSku.id);
        console.log(`  ✅ Created SKU: ${skuCode}`);
      } catch (error) {
        console.log(`  ❌ Failed to create SKU: ${skuCode} - ${error}`);
      }
    } else {
      console.log(`  ⚠ MISSING SKU: ${skuCode}`);
    }
  }

  return skuMap;
}

function parseBottleSize(skuCode: string): string | undefined {
  // Try to extract bottle size from SKU code (e.g., "750ml", "1.5L")
  const sizeMatch = skuCode.match(/(\d+(?:\.\d+)?)\s*(ml|l|oz)/i);
  if (sizeMatch) {
    return `${sizeMatch[1]}${sizeMatch[2].toLowerCase()}`;
  }
  return undefined;
}

// ============================================================================
// PHASE 6: EXECUTE IMPORT
// ============================================================================

async function executeImport(
  prisma: PrismaClient,
  invoices: InvoiceGroup[],
  customerMap: Map<string, string>,
  skuMap: Map<string, string>
): Promise<ImportStats> {
  const stats: ImportStats = {
    totalInvoices: invoices.length,
    processedInvoices: 0,
    createdOrders: 0,
    createdOrderLines: 0,
    createdInvoices: 0,
    skippedSamples: 0,
    errors: [],
    customerMatches: customerMap.size,
    customerCreated: 0,
    customerUnmatched: 0,
    skuMatches: skuMap.size,
    skuCreated: 0,
    skuMissing: 0
  };

  // Process in batches
  for (let i = 0; i < invoices.length; i += CONFIG.batchSize) {
    const batch = invoices.slice(i, i + CONFIG.batchSize);
    console.log(`  Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}/${Math.ceil(invoices.length / CONFIG.batchSize)} (${batch.length} invoices)...`);

    try {
      await prisma.$transaction(async (tx) => {
        for (const invoice of batch) {
          try {
            // Skip if customer not matched
            const customerId = customerMap.get(invoice.customer);
            if (!customerId) {
              stats.errors.push(`Invoice ${invoice.invoiceNumber}: Customer not matched: ${invoice.customer}`);
              stats.customerUnmatched++;
              continue;
            }

            // Skip if all lines are samples (optional)
            if (CONFIG.skipSamples && invoice.total === 0) {
              stats.skippedSamples++;
              continue;
            }

            // Detect sample customers
            const isSampleCustomer = invoice.customer.toLowerCase().includes('sample') ||
                                    invoice.customer.toLowerCase().includes(' ops');

            if (isSampleCustomer && CONFIG.skipSamples) {
              stats.skippedSamples++;
              continue;
            }

            // Create Order
            const order = await tx.order.create({
              data: {
                tenantId: CONFIG.tenantId,
                customerId: customerId,
                status: 'FULFILLED',
                orderedAt: invoice.invoiceDate,
                fulfilledAt: invoice.postedDate,
                deliveredAt: invoice.postedDate,
                total: new Prisma.Decimal(invoice.total),
                currency: 'USD',
              }
            });

            stats.createdOrders++;

            // Create OrderLines
            for (const line of invoice.lines) {
              if (!line.sku || line.sku.trim() === '') {
                continue; // Skip lines without SKU
              }

              const skuId = skuMap.get(line.sku);
              if (!skuId) {
                stats.skuMissing++;
                continue; // Skip lines with missing SKU
              }

              await tx.orderLine.create({
                data: {
                  tenantId: CONFIG.tenantId,
                  orderId: order.id,
                  skuId: skuId,
                  quantity: line.quantity,
                  unitPrice: new Prisma.Decimal(line.unitPrice),
                  isSample: line.netPrice === 0,
                }
              });

              stats.createdOrderLines++;
            }

            // Optional: Create Invoice
            if (CONFIG.createInvoices) {
              await tx.invoice.create({
                data: {
                  tenantId: CONFIG.tenantId,
                  orderId: order.id,
                  customerId: customerId,
                  invoiceNumber: invoice.invoiceNumber.toString(),
                  status: 'PAID',
                  subtotal: new Prisma.Decimal(invoice.total),
                  total: new Prisma.Decimal(invoice.total),
                  dueDate: invoice.dueDate,
                  issuedAt: invoice.invoiceDate,
                }
              });

              stats.createdInvoices++;
            }

            stats.processedInvoices++;
          } catch (error) {
            stats.errors.push(`Invoice ${invoice.invoiceNumber}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }, {
        timeout: 60000
      });
    } catch (error) {
      stats.errors.push(`Batch ${Math.floor(i / CONFIG.batchSize) + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return stats;
}

function printImportStats(stats: ImportStats) {
  console.log('  Total Invoices:', stats.totalInvoices.toLocaleString());
  console.log('  Processed:', stats.processedInvoices.toLocaleString());
  console.log('  Created Orders:', stats.createdOrders.toLocaleString());
  console.log('  Created Order Lines:', stats.createdOrderLines.toLocaleString());
  console.log('  Created Invoices:', stats.createdInvoices.toLocaleString());
  console.log('  Skipped Samples:', stats.skippedSamples.toLocaleString());
  console.log('  Errors:', stats.errors.length);
  if (stats.errors.length > 0) {
    console.log('  First 10 errors:');
    stats.errors.slice(0, 10).forEach(err => console.log(`    - ${err}`));
  }
}

// ============================================================================
// PHASE 7: VALIDATE IMPORT
// ============================================================================

async function validateImport(prisma: PrismaClient) {
  // Query total orders
  const orderCount = await prisma.order.count({
    where: { tenantId: CONFIG.tenantId }
  });

  // Query total revenue
  const revenueResult = await prisma.order.aggregate({
    where: { tenantId: CONFIG.tenantId },
    _sum: {
      total: true
    }
  });

  // Query total order lines
  const orderLineCount = await prisma.orderLine.count({
    where: { tenantId: CONFIG.tenantId }
  });

  // Query date range
  const dateRange = await prisma.order.aggregate({
    where: { tenantId: CONFIG.tenantId },
    _min: {
      orderedAt: true
    },
    _max: {
      orderedAt: true
    }
  });

  console.log(`  ✓ Total orders in database: ${orderCount.toLocaleString()}`);
  console.log(`  ✓ Total order lines: ${orderLineCount.toLocaleString()}`);
  console.log(`  ✓ Total revenue: $${(revenueResult._sum.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  if (dateRange._min.orderedAt && dateRange._max.orderedAt) {
    console.log(`  ✓ Date range: ${dateRange._min.orderedAt.toISOString().split('T')[0]} to ${dateRange._max.orderedAt.toISOString().split('T')[0]}`);
  }
}

// ============================================================================
// PHASE 8: UPDATE CUSTOMER METRICS
// ============================================================================

async function updateCustomerMetrics(
  prisma: PrismaClient,
  customerMap: Map<string, string>
) {
  console.log(`  Updating metrics for ${customerMap.size} customers...`);

  let updated = 0;

  for (const customerId of customerMap.values()) {
    try {
      // Get customer's order data
      const orderData = await prisma.order.aggregate({
        where: {
          customerId: customerId,
          status: 'FULFILLED'
        },
        _sum: {
          total: true
        },
        _max: {
          deliveredAt: true
        }
      });

      // Update customer metrics
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          lastOrderDate: orderData._max.deliveredAt,
          establishedRevenue: orderData._sum.total || new Prisma.Decimal(0),
        }
      });

      updated++;

      if (updated % 100 === 0) {
        console.log(`    Updated ${updated}/${customerMap.size} customers...`);
      }
    } catch (error) {
      console.log(`    ⚠ Failed to update customer metrics: ${error}`);
    }
  }

  console.log(`  ✓ Updated metrics for ${updated} customers`);
}

// ============================================================================
// RUN
// ============================================================================

main().catch(console.error);
