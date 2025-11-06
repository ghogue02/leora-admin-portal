#!/usr/bin/env tsx

/**
 * CSV Data Import Script - SALES REPORT ONLY
 *
 * ⚠️  CRITICAL: HAL Inventory CSV SKUs DO NOT match Wellcrafted's system!
 *     This script ONLY imports sales reports. SKU/inventory imports are DISABLED.
 *
 * Import strategy:
 * 1. Import invoices with PAID status (sales report only)
 * 2. Skip duplicate invoice numbers
 * 3. Skip line items with missing SKUs (report errors)
 * 4. DO NOT create/update SKUs from HAL inventory CSV
 *
 * Run: npx tsx scripts/import-csv-data.ts
 */

import { PrismaClient, InvoiceStatus } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

// File paths
const SALES_REPORT_PATH = '/Users/greghogue/Leora2/Sales report 2025-10-27 to 2025-11-02.csv';
const INVENTORY_PATH = '/Users/greghogue/Leora2/Well Crafted Wine & Beverage Co. inventory as at 2025-11-03.csv';

// Tenant ID
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

// Types
interface SalesReportRow {
  'Invoice number': string;
  'Invoice date': string;
  'Posted date': string;
  'Due date': string;
  'Purchase order number': string;
  'Delivery start time': string;
  'Delivery end time': string;
  'Special instrcutions': string;
  'Status': string;
  'Customer': string;
  'Salesperson': string;
  'Shipping address line 1': string;
  'Shipping address line 2': string;
  'Shipping address city': string;
  'Shipping address province': string;
  'Shipping address country': string;
  'Shipping address postal code': string;
  'Item number': string;
  'SKU': string;
  'Item': string;
  'Supplier': string;
  'Qty.': string;
  'Cases': string;
  'Liters': string;
  'Unit price': string;
  'Net price': string;
}

interface InventoryRow {
  'Warehouse': string;
  'Account': string;
  'Item number': string;
  'Item type': string;
  'Supplier': string;
  'Category': string;
  'Brand': string;
  'Name': string;
  'Batch': string;
  'SKU': string;
  'Vintage': string;
  'Style': string;
  'Colour': string;
  'Varieties': string;
  'Cases': string;
  'Items per case': string;
  'Unit quantity': string;
  'Unit': string;
  'Barrel or tank': string;
  'Liters': string;
  'Unit COGS': string;
  'COGS': string;
  'Pending orders (cases)': string;
  'Pending orders (unit quantity)': string;
  'Pending goods received (cases)': string;
  'Pending goods received (unit quantity)': string;
}

interface ImportStats {
  productsCreated: number;
  skusCreated: number;
  invoicesCreated: number;
  invoiceItemsCreated: number;
  invoicesSkipped: number;
  inventoryUpdated: number;
  errors: string[];
}

async function main() {
  console.log('🚀 CSV Data Import Tool - SALES REPORT ONLY\n');
  console.log('=' .repeat(80));
  console.log('⚠️  CRITICAL: HAL inventory SKUs disabled due to misalignment');
  console.log('   This script ONLY imports sales reports (invoices/orders)');
  console.log('   SKU/inventory updates are SKIPPED\n');
  console.log('=' .repeat(80) + '\n');

  const stats: ImportStats = {
    productsCreated: 0,
    skusCreated: 0,
    invoicesCreated: 0,
    invoiceItemsCreated: 0,
    invoicesSkipped: 0,
    inventoryUpdated: 0,
    errors: [],
  };

  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Step 1: Parse Sales Report CSV only
    console.log('📄 Step 1: Parsing sales report CSV...');
    const salesData = parseSalesReport();
    console.log(`   ✅ Parsed ${salesData.length} sales records\n`);

    // SKIP: Inventory parsing (HAL SKU misalignment)
    // const inventoryData = parseInventory();
    console.log('⏭️  SKIPPED: Inventory CSV parsing (HAL SKU misalignment issue)\n');

    // SKIP: Creating products/SKUs (HAL SKU misalignment)
    // console.log('🍷 Step 2: Creating missing products and SKUs...');
    // await createMissingProducts(inventoryData, stats);
    console.log('⏭️  SKIPPED: Product/SKU creation (HAL SKU misalignment issue)\n');

    // Step 2: Import invoices (ONLY safe operation)
    console.log('🧾 Step 2: Importing invoices from sales report...');
    await importInvoices(salesData, stats);
    console.log(`   ✅ Created ${stats.invoicesCreated} invoices with ${stats.invoiceItemsCreated} line items`);
    console.log(`   ⏭️  Skipped ${stats.invoicesSkipped} duplicate invoices\n`);

    // SKIP: Update inventory (HAL SKU misalignment)
    // console.log('📦 Step 4: Updating inventory...');
    // await updateInventory(inventoryData, stats);
    console.log('⏭️  SKIPPED: Inventory updates (HAL SKU misalignment issue)\n');

    // Step 3: Display final report
    displayFinalReport(stats);

  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
    stats.errors.push(`Fatal: ${error}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function parseSalesReport(): SalesReportRow[] {
  const content = fs.readFileSync(SALES_REPORT_PATH, 'utf-8');
  const lines = content.split('\n');
  const csvContent = lines.slice(3).join('\n');
  return parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function parseInventory(): InventoryRow[] {
  const content = fs.readFileSync(INVENTORY_PATH, 'utf-8');
  const lines = content.split('\n');
  const csvContent = lines.slice(3).join('\n');
  return parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

async function createMissingProducts(inventoryData: InventoryRow[], stats: ImportStats) {
  const skuMap = new Map<string, InventoryRow>();

  // Build map of SKUs to inventory data
  for (const row of inventoryData) {
    if (row.SKU && !skuMap.has(row.SKU)) {
      skuMap.set(row.SKU, row);
    }
  }

  // Process each SKU
  for (const [sku, row] of skuMap.entries()) {
    try {
      // Check if SKU already exists
      const existingSku = await prisma.sku.findFirst({
        where: { code: sku },
      });

      if (existingSku) {
        continue; // Skip existing SKUs
      }

      // Need to create product first, then SKU
      let productName = row.Name || row.Item || `Product for ${sku}`;
      const brand = row.Brand || null;
      const category = row.Category || null;
      const supplier = row.Supplier || null;

      // Find or create supplier if provided
      let supplierId: string | null = null;
      if (supplier) {
        const existingSupplier = await prisma.supplier.findFirst({
          where: {
            tenantId: TENANT_ID,
            name: {
              contains: supplier,
              mode: 'insensitive',
            },
          },
        });

        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          // Create new supplier
          const newSupplier = await prisma.supplier.create({
            data: {
              tenantId: TENANT_ID,
              name: supplier,
            },
          });
          supplierId = newSupplier.id;
        }
      }

      // Check if product with this name already exists
      const existingProduct = await prisma.product.findFirst({
        where: {
          tenantId: TENANT_ID,
          name: productName,
        },
      });

      let product;
      if (existingProduct) {
        // Use existing product or create unique name
        // If brand/category match, reuse; otherwise create new with unique name
        if (existingProduct.brand === brand && existingProduct.category === category) {
          product = existingProduct;
        } else {
          // Make unique name by appending SKU
          productName = `${productName} (${sku})`;
          product = await prisma.product.create({
            data: {
              tenantId: TENANT_ID,
              supplierId: supplierId,
              name: productName,
              brand: brand,
              category: category,
            },
          });
          stats.productsCreated++;
        }
      } else {
        // Create product
        product = await prisma.product.create({
          data: {
            tenantId: TENANT_ID,
            supplierId: supplierId,
            name: productName,
            brand: brand,
            category: category,
          },
        });
        stats.productsCreated++;
      }

      // Create SKU
      const itemsPerCase = parseInt(row['Items per case']) || 12;
      const unitOfMeasure = row.Unit || '750 ml';
      const pricePerUnit = row['Unit COGS'] ? new Decimal(row['Unit COGS']) : null;

      await prisma.sku.create({
        data: {
          tenantId: TENANT_ID,
          productId: product.id,
          code: sku,
          size: unitOfMeasure,
          unitOfMeasure: unitOfMeasure,
          casesPerPallet: itemsPerCase,
          pricePerUnit: pricePerUnit,
          isActive: true,
        },
      });
      stats.skusCreated++;

      console.log(`   ➕ Created: ${sku} - ${productName}`);

    } catch (error) {
      const errorMsg = `Failed to create SKU ${sku}: ${error}`;
      console.error(`   ❌ ${errorMsg}`);
      stats.errors.push(errorMsg);
    }
  }
}

async function importInvoices(salesData: SalesReportRow[], stats: ImportStats) {
  // Group sales data by invoice number
  const invoiceMap = new Map<string, SalesReportRow[]>();

  for (const row of salesData) {
    const invoiceNum = row['Invoice number'];
    if (!invoiceMap.has(invoiceNum)) {
      invoiceMap.set(invoiceNum, []);
    }
    invoiceMap.get(invoiceNum)!.push(row);
  }

  // Process each invoice
  for (const [invoiceNum, rows] of invoiceMap.entries()) {
    try {
      // Check if invoice already exists
      const existingInvoice = await prisma.invoice.findFirst({
        where: {
          tenantId: TENANT_ID,
          invoiceNumber: invoiceNum,
        },
      });

      if (existingInvoice) {
        stats.invoicesSkipped++;
        console.log(`   ⏭️  Skipped duplicate: ${invoiceNum}`);
        continue;
      }

      const firstRow = rows[0];

      // Find customer
      const customer = await prisma.customer.findFirst({
        where: {
          tenantId: TENANT_ID,
          name: {
            contains: firstRow.Customer,
            mode: 'insensitive',
          },
        },
      });

      if (!customer) {
        const errorMsg = `Customer not found: ${firstRow.Customer} for invoice ${invoiceNum}`;
        console.error(`   ❌ ${errorMsg}`);
        stats.errors.push(errorMsg);
        continue;
      }

      // Find sales rep
      let salesRepId: string | null = null;
      if (firstRow.Salesperson) {
        const user = await prisma.user.findFirst({
          where: {
            tenantId: TENANT_ID,
            fullName: {
              contains: firstRow.Salesperson,
              mode: 'insensitive',
            },
            salesRepProfile: {
              isNot: null,
            },
          },
          include: {
            salesRepProfile: true,
          },
        });

        if (user?.salesRepProfile) {
          salesRepId = user.salesRepProfile.id;
        }
      }

      // Calculate total
      const total = rows.reduce((sum, row) => {
        return sum + (parseFloat(row['Net price']) || 0);
      }, 0);

      // Parse dates
      const invoiceDate = firstRow['Invoice date'] ? new Date(firstRow['Invoice date']) : new Date();
      const postedDate = firstRow['Posted date'] ? new Date(firstRow['Posted date']) : new Date();
      const dueDate = firstRow['Due date'] ? new Date(firstRow['Due date']) : null;

      // Create order and invoice in transaction
      await prisma.$transaction(async (tx) => {
        // Create order first (required for invoice)
        const order = await tx.order.create({
          data: {
            tenantId: TENANT_ID,
            customerId: customer.id,
            status: 'FULFILLED', // Delivered/completed
            orderedAt: invoiceDate,
            deliveryDate: dueDate,
            total: new Decimal(total),
          },
        });

        // Create invoice linked to order
        const invoice = await tx.invoice.create({
          data: {
            tenantId: TENANT_ID,
            orderId: order.id,
            customerId: customer.id,
            salesperson: firstRow.Salesperson || null, // String field, not relation
            invoiceNumber: invoiceNum,
            status: InvoiceStatus.PAID, // As recommended - delivered/completed
            issuedAt: invoiceDate,
            dueDate: dueDate,
            total: new Decimal(total),
            subtotal: new Decimal(total),
          },
        });

        // Create invoice items (and corresponding order items)
        for (const row of rows) {
          // Find SKU
          const sku = await tx.sku.findFirst({
            where: { code: row.SKU },
          });

          if (!sku) {
            const errorMsg = `SKU not found: ${row.SKU} for invoice ${invoiceNum}`;
            stats.errors.push(errorMsg);
            continue;
          }

          const quantity = parseFloat(row['Qty.']) || 0;
          const unitPrice = parseFloat(row['Unit price']) || 0;
          const lineTotal = parseFloat(row['Net price']) || 0;

          // Create order line item (invoices use OrderLine, not InvoiceItem model)
          const orderItem = await tx.orderLine.create({
            data: {
              tenantId: TENANT_ID,
              orderId: order.id,
              skuId: sku.id,
              quantity: Math.round(quantity), // Must be Int
              unitPrice: new Decimal(unitPrice),
            },
          });

          stats.invoiceItemsCreated++;
        }

        stats.invoicesCreated++;
        console.log(`   ✅ Created order & invoice ${invoiceNum}: ${customer.name} - $${total.toFixed(2)} (${rows.length} items)`);
      });

    } catch (error) {
      const errorMsg = `Failed to import invoice ${invoiceNum}: ${error}`;
      console.error(`   ❌ ${errorMsg}`);
      if (error instanceof Error) {
        console.error(`   Stack: ${error.stack}`);
      }
      stats.errors.push(errorMsg);
    }
  }
}

async function updateInventory(inventoryData: InventoryRow[], stats: ImportStats) {
  for (const row of inventoryData) {
    try {
      const sku = row.SKU;
      if (!sku) continue;

      // Find SKU
      const skuRecord = await prisma.sku.findFirst({
        where: { code: sku },
      });

      if (!skuRecord) {
        const errorMsg = `SKU not found for inventory update: ${sku}`;
        stats.errors.push(errorMsg);
        continue;
      }

      // Parse inventory quantities
      const cases = parseFloat(row.Cases) || 0;
      const unitQuantity = parseFloat(row['Unit quantity']) || 0;
      const unitCogs = row['Unit COGS'] ? new Decimal(row['Unit COGS']) : null;

      // Update SKU with inventory data
      await prisma.sku.update({
        where: { id: skuRecord.id },
        data: {
          pricePerUnit: unitCogs,
          // Note: You may want to add inventory tracking fields to SKU model
          // For now, we're just updating the COGS price
        },
      });

      stats.inventoryUpdated++;

    } catch (error) {
      const errorMsg = `Failed to update inventory for ${row.SKU}: ${error}`;
      console.error(`   ❌ ${errorMsg}`);
      stats.errors.push(errorMsg);
    }
  }
}

function displayFinalReport(stats: ImportStats) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(80));

  console.log('\n✅ SUCCESSFULLY IMPORTED:');
  console.log(`   Products created: ${stats.productsCreated}`);
  console.log(`   SKUs created: ${stats.skusCreated}`);
  console.log(`   Invoices created: ${stats.invoicesCreated}`);
  console.log(`   Invoice items created: ${stats.invoiceItemsCreated}`);
  console.log(`   Inventory records updated: ${stats.inventoryUpdated}`);

  if (stats.invoicesSkipped > 0) {
    console.log(`\n⏭️  SKIPPED:`);
    console.log(`   Duplicate invoices: ${stats.invoicesSkipped}`);
  }

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ERRORS (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach(err => {
      console.log(`   - ${err}`);
    });
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Import completed!');
  console.log('=' .repeat(80));
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
