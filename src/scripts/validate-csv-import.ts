#!/usr/bin/env tsx

/**
 * CSV Import Validation Script
 *
 * Analyzes sales report and inventory CSV files to:
 * 1. Parse and validate CSV structure
 * 2. Map customers, sales reps, and products to database
 * 3. Identify missing records that need to be created
 * 4. Generate comprehensive validation report
 *
 * Run: npx tsx scripts/validate-csv-import.ts
 */

import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// File paths
const SALES_REPORT_PATH = '/Users/greghogue/Leora2/Sales report 2025-10-27 to 2025-11-02.csv';
const INVENTORY_PATH = '/Users/greghogue/Leora2/Well Crafted Wine & Beverage Co. inventory as at 2025-11-03.csv';

// Tenant ID (from database)
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

// Types for CSV data
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

interface InvoiceGroup {
  invoiceNumber: string;
  invoiceDate: Date;
  postedDate: Date;
  dueDate: Date | null;
  purchaseOrderNumber: string;
  status: string;
  customer: string;
  salesperson: string;
  shippingAddress: {
    line1: string;
    line2: string;
    city: string;
    province: string;
    country: string;
    postalCode: string;
  };
  items: Array<{
    itemNumber: string;
    sku: string;
    itemName: string;
    supplier: string;
    quantity: number;
    cases: number;
    liters: number;
    unitPrice: number;
    netPrice: number;
  }>;
  total: number;
}

interface ValidationReport {
  salesReport: {
    totalRows: number;
    uniqueInvoices: number;
    dateRange: { earliest: Date; latest: Date };
    customers: string[];
    salespeople: string[];
    skus: string[];
  };
  inventory: {
    totalRows: number;
    uniqueSkus: number;
    warehouses: string[];
    totalStockValue: number;
  };
  mappings: {
    customers: {
      found: Array<{ csvName: string; dbId: string; dbName: string }>;
      notFound: string[];
    };
    salesReps: {
      found: Array<{ csvName: string; dbId: string; dbName: string }>;
      notFound: string[];
    };
    products: {
      found: Array<{ csvSku: string; dbId: string; dbName: string }>;
      notFound: string[];
    };
  };
  recommendations: string[];
  warnings: string[];
}

async function main() {
  console.log('📊 CSV Import Validation Tool\n');
  console.log('=' .repeat(80));

  try {
    // Connect to database
    console.log('\n🔌 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected\n');

    // Step 1: Parse Sales Report
    console.log('📄 Step 1: Parsing Sales Report CSV...');
    const salesData = await parseSalesReport();
    console.log(`✅ Parsed ${salesData.length} invoice line items`);

    // Step 2: Parse Inventory
    console.log('\n📦 Step 2: Parsing Inventory CSV...');
    const inventoryData = await parseInventory();
    console.log(`✅ Parsed ${inventoryData.length} inventory records`);

    // Step 3: Group invoices
    console.log('\n🧾 Step 3: Grouping invoice line items...');
    const invoices = groupInvoices(salesData);
    console.log(`✅ Grouped into ${invoices.length} unique invoices`);

    // Step 4: Extract unique entities
    console.log('\n🔍 Step 4: Extracting unique entities...');
    const uniqueCustomers = [...new Set(salesData.map(r => r.Customer))];
    const uniqueSalesReps = [...new Set(salesData.map(r => r.Salesperson).filter(Boolean))];
    const uniqueSkus = [...new Set(salesData.map(r => r.SKU))];
    console.log(`   - ${uniqueCustomers.length} unique customers`);
    console.log(`   - ${uniqueSalesReps.length} unique sales reps`);
    console.log(`   - ${uniqueSkus.length} unique SKUs in sales report`);
    console.log(`   - ${inventoryData.length} SKUs in inventory`);

    // Step 5: Map customers
    console.log('\n👥 Step 5: Mapping customers to database...');
    const customerMapping = await mapCustomers(uniqueCustomers);
    console.log(`   - Found: ${customerMapping.found.length}`);
    console.log(`   - Not found: ${customerMapping.notFound.length}`);

    // Step 6: Map sales reps
    console.log('\n👔 Step 6: Mapping sales reps to database...');
    const salesRepMapping = await mapSalesReps(uniqueSalesReps);
    console.log(`   - Found: ${salesRepMapping.found.length}`);
    console.log(`   - Not found: ${salesRepMapping.notFound.length}`);

    // Step 7: Map products/SKUs
    console.log('\n🍷 Step 7: Mapping products/SKUs to database...');
    const productMapping = await mapProducts(uniqueSkus, inventoryData);
    console.log(`   - Found: ${productMapping.found.length}`);
    console.log(`   - Not found: ${productMapping.notFound.length}`);

    // Step 8: Generate validation report
    console.log('\n📋 Step 8: Generating validation report...');
    const report = generateReport(
      salesData,
      inventoryData,
      invoices,
      uniqueCustomers,
      uniqueSalesReps,
      uniqueSkus,
      customerMapping,
      salesRepMapping,
      productMapping
    );

    // Step 9: Display report
    displayReport(report);

    // Step 10: Save report to file
    const reportPath = path.join(process.cwd(), 'validation-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

  } catch (error) {
    console.error('\n❌ Error during validation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function parseSalesReport(): Promise<SalesReportRow[]> {
  const content = fs.readFileSync(SALES_REPORT_PATH, 'utf-8');

  // Skip first 3 lines (sep=, title, blank line)
  const lines = content.split('\n');
  const csvContent = lines.slice(3).join('\n');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records;
}

async function parseInventory(): Promise<InventoryRow[]> {
  const content = fs.readFileSync(INVENTORY_PATH, 'utf-8');

  // Skip first 3 lines
  const lines = content.split('\n');
  const csvContent = lines.slice(3).join('\n');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  return records;
}

function groupInvoices(salesData: SalesReportRow[]): InvoiceGroup[] {
  const invoiceMap = new Map<string, InvoiceGroup>();

  for (const row of salesData) {
    const invoiceNum = row['Invoice number'];

    if (!invoiceMap.has(invoiceNum)) {
      const invoiceDate = row['Invoice date'] ? new Date(row['Invoice date']) : new Date();
      const postedDate = row['Posted date'] ? new Date(row['Posted date']) : new Date();
      const dueDate = row['Due date'] ? new Date(row['Due date']) : null;

      invoiceMap.set(invoiceNum, {
        invoiceNumber: invoiceNum,
        invoiceDate: invoiceDate,
        postedDate: postedDate,
        dueDate: dueDate,
        purchaseOrderNumber: row['Purchase order number'] || '',
        status: row.Status,
        customer: row.Customer,
        salesperson: row.Salesperson,
        shippingAddress: {
          line1: row['Shipping address line 1'],
          line2: row['Shipping address line 2'],
          city: row['Shipping address city'],
          province: row['Shipping address province'],
          country: row['Shipping address country'],
          postalCode: row['Shipping address postal code'],
        },
        items: [],
        total: 0,
      });
    }

    const invoice = invoiceMap.get(invoiceNum)!;
    const netPrice = parseFloat(row['Net price']) || 0;

    invoice.items.push({
      itemNumber: row['Item number'],
      sku: row.SKU,
      itemName: row.Item,
      supplier: row.Supplier,
      quantity: parseFloat(row['Qty.']) || 0,
      cases: parseFloat(row.Cases) || 0,
      liters: parseFloat(row.Liters) || 0,
      unitPrice: parseFloat(row['Unit price']) || 0,
      netPrice: netPrice,
    });

    invoice.total += netPrice;
  }

  return Array.from(invoiceMap.values());
}

async function mapCustomers(customerNames: string[]) {
  const found: Array<{ csvName: string; dbId: string; dbName: string }> = [];
  const notFound: string[] = [];

  for (const name of customerNames) {
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId: TENANT_ID,
        name: {
          contains: name,
          mode: 'insensitive',
        },
      },
    });

    if (customer) {
      found.push({
        csvName: name,
        dbId: customer.id,
        dbName: customer.name,
      });
    } else {
      notFound.push(name);
    }
  }

  return { found, notFound };
}

async function mapSalesReps(salesRepNames: string[]) {
  const found: Array<{ csvName: string; dbId: string; dbName: string }> = [];
  const notFound: string[] = [];

  for (const name of salesRepNames) {
    const user = await prisma.user.findFirst({
      where: {
        tenantId: TENANT_ID,
        fullName: {
          contains: name,
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

    if (user && user.salesRepProfile) {
      found.push({
        csvName: name,
        dbId: user.salesRepProfile.id,
        dbName: user.fullName,
      });
    } else {
      notFound.push(name);
    }
  }

  return { found, notFound };
}

async function mapProducts(skus: string[], inventoryData: InventoryRow[]) {
  const found: Array<{ csvSku: string; dbId: string; dbName: string }> = [];
  const notFound: string[] = [];

  // Combine SKUs from both sales report and inventory
  const allSkus = [...new Set([...skus, ...inventoryData.map(i => i.SKU)])];

  for (const sku of allSkus) {
    if (!sku) continue;

    const skuRecord = await prisma.sku.findFirst({
      where: {
        code: sku,
      },
      include: {
        product: true,
      },
    });

    if (skuRecord) {
      found.push({
        csvSku: sku,
        dbId: skuRecord.id,
        dbName: skuRecord.product.name,
      });
    } else {
      notFound.push(sku);
    }
  }

  return { found, notFound };
}

function generateReport(
  salesData: SalesReportRow[],
  inventoryData: InventoryRow[],
  invoices: InvoiceGroup[],
  uniqueCustomers: string[],
  uniqueSalesReps: string[],
  uniqueSkus: string[],
  customerMapping: any,
  salesRepMapping: any,
  productMapping: any
): ValidationReport {
  const invoiceDates = invoices.map(i => i.invoiceDate);
  const totalStockValue = inventoryData.reduce((sum, row) => {
    return sum + (parseFloat(row.COGS) || 0);
  }, 0);

  const recommendations: string[] = [];
  const warnings: string[] = [];

  // Generate recommendations
  if (customerMapping.notFound.length > 0) {
    recommendations.push(`Create ${customerMapping.notFound.length} new customer records`);
  }

  if (salesRepMapping.notFound.length > 0) {
    warnings.push(`${salesRepMapping.notFound.length} sales reps not found in database: ${salesRepMapping.notFound.join(', ')}`);
    recommendations.push('Manually map sales reps or create user accounts for them');
  }

  if (productMapping.notFound.length > 0) {
    recommendations.push(`Create ${productMapping.notFound.length} new product/SKU records`);
  }

  return {
    salesReport: {
      totalRows: salesData.length,
      uniqueInvoices: invoices.length,
      dateRange: {
        earliest: new Date(Math.min(...invoiceDates.map(d => d.getTime()))),
        latest: new Date(Math.max(...invoiceDates.map(d => d.getTime()))),
      },
      customers: uniqueCustomers,
      salespeople: uniqueSalesReps,
      skus: uniqueSkus,
    },
    inventory: {
      totalRows: inventoryData.length,
      uniqueSkus: [...new Set(inventoryData.map(i => i.SKU))].length,
      warehouses: [...new Set(inventoryData.map(i => i.Warehouse))],
      totalStockValue: totalStockValue,
    },
    mappings: {
      customers: customerMapping,
      salesReps: salesRepMapping,
      products: productMapping,
    },
    recommendations,
    warnings,
  };
}

function displayReport(report: ValidationReport) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION REPORT');
  console.log('='.repeat(80));

  console.log('\n📄 SALES REPORT SUMMARY:');
  console.log(`   Total line items: ${report.salesReport.totalRows}`);
  console.log(`   Unique invoices: ${report.salesReport.uniqueInvoices}`);
  const earliestDate = report.salesReport.dateRange.earliest;
  const latestDate = report.salesReport.dateRange.latest;
  const earliestStr = earliestDate && !isNaN(earliestDate.getTime()) ? earliestDate.toISOString().split('T')[0] : 'Invalid';
  const latestStr = latestDate && !isNaN(latestDate.getTime()) ? latestDate.toISOString().split('T')[0] : 'Invalid';
  console.log(`   Date range: ${earliestStr} to ${latestStr}`);
  console.log(`   Unique customers: ${report.salesReport.customers.length}`);
  console.log(`   Unique sales reps: ${report.salesReport.salespeople.length}`);
  console.log(`   Unique SKUs: ${report.salesReport.skus.length}`);

  console.log('\n📦 INVENTORY SUMMARY:');
  console.log(`   Total records: ${report.inventory.totalRows}`);
  console.log(`   Unique SKUs: ${report.inventory.uniqueSkus}`);
  console.log(`   Warehouses: ${report.inventory.warehouses.join(', ')}`);
  console.log(`   Total stock value: $${report.inventory.totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  console.log('\n👥 CUSTOMER MAPPING:');
  console.log(`   ✅ Found in database: ${report.mappings.customers.found.length}`);
  if (report.mappings.customers.found.length > 0) {
    report.mappings.customers.found.slice(0, 5).forEach(c => {
      console.log(`      - "${c.csvName}" → "${c.dbName}" (${c.dbId})`);
    });
    if (report.mappings.customers.found.length > 5) {
      console.log(`      ... and ${report.mappings.customers.found.length - 5} more`);
    }
  }
  console.log(`   ❌ Not found: ${report.mappings.customers.notFound.length}`);
  if (report.mappings.customers.notFound.length > 0) {
    report.mappings.customers.notFound.forEach(c => {
      console.log(`      - "${c}"`);
    });
  }

  console.log('\n👔 SALES REP MAPPING:');
  console.log(`   ✅ Found in database: ${report.mappings.salesReps.found.length}`);
  if (report.mappings.salesReps.found.length > 0) {
    report.mappings.salesReps.found.forEach(s => {
      console.log(`      - "${s.csvName}" → "${s.dbName}" (${s.dbId})`);
    });
  }
  console.log(`   ❌ Not found: ${report.mappings.salesReps.notFound.length}`);
  if (report.mappings.salesReps.notFound.length > 0) {
    report.mappings.salesReps.notFound.forEach(s => {
      console.log(`      - "${s}"`);
    });
  }

  console.log('\n🍷 PRODUCT/SKU MAPPING:');
  console.log(`   ✅ Found in database: ${report.mappings.products.found.length}`);
  if (report.mappings.products.found.length > 0) {
    report.mappings.products.found.slice(0, 5).forEach(p => {
      console.log(`      - ${p.csvSku} → "${p.dbName}" (${p.dbId})`);
    });
    if (report.mappings.products.found.length > 5) {
      console.log(`      ... and ${report.mappings.products.found.length - 5} more`);
    }
  }
  console.log(`   ❌ Not found: ${report.mappings.products.notFound.length}`);
  if (report.mappings.products.notFound.length > 0) {
    report.mappings.products.notFound.slice(0, 10).forEach(p => {
      console.log(`      - ${p}`);
    });
    if (report.mappings.products.notFound.length > 10) {
      console.log(`      ... and ${report.mappings.products.notFound.length - 10} more`);
    }
  }

  if (report.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    report.warnings.forEach(w => console.log(`   - ${w}`));
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    report.recommendations.forEach(r => console.log(`   - ${r}`));
  }

  console.log('\n' + '='.repeat(80));
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
