#!/usr/bin/env tsx

/**
 * HAL Sales Report Importer
 *
 * This script ingests one or more HAL sales report CSV files and materializes
 * Orders + Invoices (with line items) inside the Supabase database. It fully
 * deduplicates by invoice number, can optionally run in dry-run mode, and will
 * auto-create placeholder suppliers/products/SKUs whenever a code has not been
 * set up yet. This lets us backfill historical data repeatedly without manual
 * prep work.
 *
 * Usage examples:
 *   npx tsx scripts/import-csv-data.ts --file "../Sales report 2022-01-01 to 2025-10-26.csv"
 *   npx tsx scripts/import-csv-data.ts --file ../Sales\ report\ 2025-11-01\ to\ 2025-11-11.csv --dry-run
 *
 * Flags:
 *   --file <path>         CSV file to import (repeat for multiple files)
 *   --dry-run             Parse + validate but do not write to the database
 *   --no-auto-create-skus Require every SKU to exist ahead of time
 *   --start-date <yyyy-mm-dd>  Only import invoices on/after this date
 *   --end-date <yyyy-mm-dd>    Only import invoices on/before this date
 */

import { PrismaClient, Prisma, InvoiceStatus } from '@prisma/client';
import Decimal from 'decimal.js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
let ACTIVE_TENANT_ID = TENANT_ID;
const DEFAULT_FILE = path.resolve('/Users/greghogue/Leora2', 'Sales report 2025-11-01 to 2025-11-11.csv');
const TRANSACTION_TIMEOUT_MS = 20000;

type CliOptions = {
  files: string[];
  dryRun: boolean;
  autoCreateSkus: boolean;
  startDate?: Date;
  endDate?: Date;
  tenantId?: string;
};

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

interface InvoiceBundle {
  invoiceNumber: string;
  rows: SalesReportRow[];
  invoiceDate: Date;
  postedDate: Date | null;
  dueDate: Date | null;
  customerName: string;
  salesperson: string;
  specialInstructions: string[];
}

interface ImportStats {
  files: Array<{ file: string; invoicesCreated: number; invoicesSkipped: number; invoicesFailed: number }>;
  invoicesCreated: number;
  invoicesSkipped: number;
  invoicesFailed: number;
  linesCreated: number;
  productsCreated: number;
  skusCreated: number;
  suppliersCreated: number;
  missingCustomers: Map<string, number>;
  missingSkus: Map<string, number>;
  errors: string[];
}

let stats: ImportStats = createEmptyStats();

function createEmptyStats(): ImportStats {
  return {
    files: [],
    invoicesCreated: 0,
    invoicesSkipped: 0,
    invoicesFailed: 0,
    linesCreated: 0,
    productsCreated: 0,
    skusCreated: 0,
    suppliersCreated: 0,
    missingCustomers: new Map(),
    missingSkus: new Map(),
    errors: [],
  };
}

function resetState() {
  stats = createEmptyStats();
  customerCache = new Map();
  customerAliasCache = new Map();
  skuCache = new Map();
  supplierCache = new Map();
  productCache = new Map();
  salesRepCache = new Map();
}

// Entity caches (avoid thousands of duplicate lookups)
let customerCache = new Map<string, string>(); // normalized name -> id
let customerAliasCache = new Map<string, string>();
let skuCache = new Map<string, string>(); // normalized code -> id
let supplierCache = new Map<string, string>(); // normalized name -> id
let productCache = new Map<string, string>(); // normalized key -> id
let salesRepCache = new Map<string, string>(); // normalized name -> id

async function main() {
  const options = parseCliArgs();
  if (options.files.length === 0) {
    options.files.push(DEFAULT_FILE);
  }

  try {
    await prisma.$connect();
    console.log('🚀 HAL Sales Report Importer');
    console.log(`Tenant: ${options.tenantId ?? TENANT_ID}`);
    console.log(`Files: ${options.files.join(', ')}`);
    if (options.dryRun) {
      console.log('Mode: DRY RUN (no database writes)');
    }
    console.log('============================================\n');

    const result = await importSalesReports(options);
    printSummary(options, result);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

export async function importSalesReports(options: CliOptions) {
  if (!options.files || options.files.length === 0) {
    throw new Error('No files provided');
  }

  ACTIVE_TENANT_ID = options.tenantId ?? TENANT_ID;
  resetState();
  await warmEntityCaches();

  for (const file of options.files) {
    const result = await importFile(file, options);
    stats.files.push(result);
  }

  return {
    ...stats,
    missingCustomers: new Map(stats.missingCustomers),
    missingSkus: new Map(stats.missingSkus),
  };
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    files: [],
    dryRun: false,
    autoCreateSkus: true,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--file':
        if (!args[i + 1]) throw new Error('--file requires a path');
        options.files.push(path.resolve(args[i + 1]!));
        i += 1;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--no-auto-create-skus':
        options.autoCreateSkus = false;
        break;
      case '--tenant':
        if (!args[i + 1]) throw new Error('--tenant requires an ID');
        options.tenantId = args[i + 1]!;
        i += 1;
        break;
      case '--start-date':
        if (!args[i + 1]) throw new Error('--start-date requires a value');
        options.startDate = parseDateOnly(args[i + 1]!);
        i += 1;
        break;
      case '--end-date':
        if (!args[i + 1]) throw new Error('--end-date requires a value');
        options.endDate = parseDateOnly(args[i + 1]!);
        i += 1;
        break;
      default:
        console.warn(`Unknown argument ignored: ${arg}`);
    }
  }

  return options;
}

async function warmEntityCaches() {
  const [customers, skus, salesReps] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      select: { id: true, name: true },
    }),
    prisma.sku.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      select: { id: true, code: true },
    }),
    prisma.salesRep.findMany({
      where: { tenantId: ACTIVE_TENANT_ID },
      include: {
        user: {
          select: { fullName: true },
        },
      },
    }),
  ]);

  customers.forEach((customer) => {
    if (!customer.name) return;
    customerCache.set(normalize(customer.name), customer.id);
  });

  skus.forEach((sku) => {
    if (!sku.code) return;
    skuCache.set(normalizeSku(sku.code), sku.id);
  });

  salesReps.forEach((rep) => {
    const name = rep.user?.fullName;
    if (!name) return;
    salesRepCache.set(normalize(name), rep.id);
  });
}

async function importFile(filePath: string, options: CliOptions) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  console.log(`Parsing ${filePath} ...`);
  const rows = parseSalesReport(filePath);
  const bundles = buildInvoiceBundles(rows, options);
  console.log(`   Found ${bundles.length.toLocaleString()} invoices within requested window.`);

  const existingSet = await loadExistingInvoiceNumbers(bundles.map((bundle) => bundle.invoiceNumber));

  let processed = 0;
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const bundle of bundles) {
    processed += 1;
    if (existingSet.has(bundle.invoiceNumber)) {
      skipped += 1;
      stats.invoicesSkipped += 1;
      continue;
    }

    const invoiceTotal = bundle.rows.reduce((sum, row) => sum.plus(parseMoney(row['Net price'])), new Decimal(0));

    const customerId = await resolveCustomerId(bundle.customerName);
    if (!customerId) {
      recordMissing(stats.missingCustomers, bundle.customerName);
      failed += 1;
      stats.invoicesFailed += 1;
      continue;
    }

    try {
      if (!options.dryRun) {
        await prisma.$transaction(
          async (tx) => {
            const { order, linesCreated } = await createOrderWithLines(tx, bundle, customerId, invoiceTotal, options);
            await createInvoiceRecord(tx, order.id, customerId, bundle, invoiceTotal);
            stats.linesCreated += linesCreated;
          },
          { timeout: TRANSACTION_TIMEOUT_MS },
        );
      }

      created += 1;
      stats.invoicesCreated += 1;
      existingSet.add(bundle.invoiceNumber);
    } catch (error) {
      failed += 1;
      stats.invoicesFailed += 1;
      const message = error instanceof Error ? error.message : String(error);
      stats.errors.push(`Invoice ${bundle.invoiceNumber}: ${message}`);
      console.error(`   ❌ Invoice ${bundle.invoiceNumber} failed: ${message}`);
    }

    if (processed % 250 === 0) {
      console.log(`   … processed ${processed}/${bundles.length} invoices`);
    }
  }

  console.log(`Finished ${filePath}: ${created} created, ${skipped} skipped, ${failed} failed.`);

  return {
    file: filePath,
    invoicesCreated: created,
    invoicesSkipped: skipped,
    invoicesFailed: failed,
  };
}

function parseSalesReport(filePath: string): SalesReportRow[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const csvContent = lines.slice(3).join('\n');
  return parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as SalesReportRow[];
}

function buildInvoiceBundles(rows: SalesReportRow[], options: CliOptions): InvoiceBundle[] {
  const bundles = new Map<string, InvoiceBundle>();

  for (const row of rows) {
    const invoiceNumber = safeTrim(row['Invoice number']);
    if (!invoiceNumber) continue;
    const invoiceDate = parseDate(row['Invoice date']);
    if (!invoiceDate) continue;
    if (options.startDate && invoiceDate < options.startDate) continue;
    if (options.endDate && invoiceDate > options.endDate) continue;

    let bundle = bundles.get(invoiceNumber);
    if (!bundle) {
      bundle = {
        invoiceNumber,
        rows: [],
        invoiceDate,
        postedDate: parseDate(row['Posted date']),
        dueDate: parseDate(row['Due date']),
        customerName: safeTrim(row['Customer']) ?? 'Unknown customer',
        salesperson: safeTrim(row['Salesperson']) ?? '',
        specialInstructions: [],
      };
      bundles.set(invoiceNumber, bundle);
    }

    const special = safeTrim(row['Special instrcutions']);
    if (special) {
      bundle.specialInstructions.push(special);
    }

    bundle.rows.push(row);
  }

  return Array.from(bundles.values()).sort((a, b) => a.invoiceDate.getTime() - b.invoiceDate.getTime());
}

async function loadExistingInvoiceNumbers(invoiceNumbers: string[]) {
  const existing = new Set<string>();
  const chunkSize = 1000;
  for (let i = 0; i < invoiceNumbers.length; i += chunkSize) {
    const chunk = invoiceNumbers.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const rows = await prisma.invoice.findMany({
      where: {
        tenantId: ACTIVE_TENANT_ID,
        invoiceNumber: { in: chunk },
      },
      select: { invoiceNumber: true },
    });
    rows.forEach((row) => {
      if (row.invoiceNumber) {
        existing.add(row.invoiceNumber);
      }
    });
  }
  return existing;
}

async function createOrderWithLines(
  tx: Prisma.TransactionClient,
  bundle: InvoiceBundle,
  customerId: string,
  invoiceTotal: Decimal,
  options: CliOptions,
) {
  const salespersonId = resolveSalesRepId(bundle.salesperson);
  const poNumber = safeTrim(bundle.rows[0]?.['Purchase order number']);
  const specialInstructions = bundle.specialInstructions.join('; ');

  const order = await tx.order.create({
    data: {
      tenantId: ACTIVE_TENANT_ID,
      customerId,
      salesRepId: salespersonId,
      status: 'FULFILLED',
      orderedAt: bundle.invoiceDate,
      deliveredAt: bundle.postedDate ?? bundle.invoiceDate,
      deliveryDate: bundle.dueDate ?? bundle.invoiceDate,
      total: invoiceTotal,
      poNumber: poNumber || null,
      specialInstructions: specialInstructions || null,
    },
  });

  let linesCreated = 0;

  for (const row of bundle.rows) {
    const skuId = await ensureSku(row, tx, options.autoCreateSkus);
    if (!skuId) {
      recordMissing(stats.missingSkus, deriveSkuCode(row));
      throw new Error(`Missing SKU ${row['SKU']}`);
    }

    const quantity = Math.max(1, Math.round(parseNumber(row['Qty.'])));
    const unitPrice = parseMoney(row['Unit price']).toDecimalPlaces(2);

    await tx.orderLine.create({
      data: {
        tenantId: ACTIVE_TENANT_ID,
        orderId: order.id,
        skuId,
        quantity,
        unitPrice,
        casesQuantity: parseDecimal(row['Cases']),
        totalLiters: parseDecimal(row['Liters']),
      },
    });

    linesCreated += 1;
  }

  return { order, linesCreated };
}

async function createInvoiceRecord(
  tx: Prisma.TransactionClient,
  orderId: string,
  customerId: string,
  bundle: InvoiceBundle,
  invoiceTotal: Decimal,
) {
  await tx.invoice.create({
    data: {
      tenantId: ACTIVE_TENANT_ID,
      orderId,
      customerId,
      invoiceNumber: bundle.invoiceNumber,
      status: InvoiceStatus.PAID,
      issuedAt: bundle.invoiceDate,
      dueDate: bundle.dueDate ?? bundle.invoiceDate,
      total: invoiceTotal,
      subtotal: invoiceTotal,
      salesperson: bundle.salesperson || null,
      specialInstructions: bundle.specialInstructions.join('; ') || null,
    },
  });
}

async function resolveCustomerId(name: string) {
  const normalized = normalize(name);
  if (customerCache.has(normalized)) {
    return customerCache.get(normalized)!;
  }
  if (customerAliasCache.has(normalized)) {
    return customerAliasCache.get(normalized)!;
  }

  const fallback = await prisma.customer.findFirst({
    where: {
      tenantId: ACTIVE_TENANT_ID,
      name: {
        contains: name,
        mode: 'insensitive',
      },
    },
    select: { id: true, name: true },
  });

  if (fallback) {
    customerAliasCache.set(normalized, fallback.id);
    return fallback.id;
  }

  return null;
}

function resolveSalesRepId(name: string): string | null {
  if (!name) return null;
  const normalized = normalize(name);
  return salesRepCache.get(normalized) ?? null;
}

async function ensureSku(row: SalesReportRow, tx: Prisma.TransactionClient, autoCreate: boolean) {
  const code = deriveSkuCode(row);
  const key = normalizeSku(code);
  if (skuCache.has(key)) {
    return skuCache.get(key)!;
  }

  if (!autoCreate) {
    return null;
  }

  const productId = await ensureProduct(row, tx);
  const sku = await tx.sku.create({
    data: {
      tenantId: ACTIVE_TENANT_ID,
      productId,
      code,
      size: row['Qty.'] || null,
      unitOfMeasure: 'bottle',
      pricePerUnit: parseMoney(row['Unit price']).toDecimalPlaces(2),
      itemsPerCase: deriveItemsPerCase(row),
      liters: parseDecimal(row['Liters']),
    },
  });

  skuCache.set(key, sku.id);
  stats.skusCreated += 1;
  return sku.id;
}

async function ensureProduct(row: SalesReportRow, tx: Prisma.TransactionClient) {
  const skuCode = deriveSkuCode(row);
  const baseName = safeTrim(row['Item']) || `Imported SKU ${skuCode}`;
  const productName = `Imported ${skuCode} - ${baseName}`;
  const key = normalize(productName);
  if (productCache.has(key)) {
    return productCache.get(key)!;
  }

  const existing = await tx.product.findFirst({
    where: {
      tenantId: ACTIVE_TENANT_ID,
      name: {
        equals: productName,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });

  if (existing) {
    productCache.set(key, existing.id);
    return existing.id;
  }

  const supplierId = await ensureSupplier(row['Supplier'], tx);

  const product = await tx.product.create({
    data: {
      tenantId: ACTIVE_TENANT_ID,
      supplierId,
      name: productName,
      brand: safeTrim(row['Supplier']) || null,
      category: null,
      vintage: parseVintage(row['Item']),
    },
  });

  productCache.set(key, product.id);
  stats.productsCreated += 1;
  return product.id;
}

async function ensureSupplier(name: string | undefined, tx: Prisma.TransactionClient) {
  const supplierName = safeTrim(name) || 'Imported Supplier';
  const key = normalize(supplierName);
  if (supplierCache.has(key)) {
    return supplierCache.get(key)!;
  }

  const existing = await tx.supplier.findFirst({
    where: {
      tenantId: ACTIVE_TENANT_ID,
      name: {
        equals: supplierName,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  });

  if (existing) {
    supplierCache.set(key, existing.id);
    return existing.id;
  }

  const supplier = await tx.supplier.create({
    data: {
      tenantId: ACTIVE_TENANT_ID,
      name: supplierName,
    },
  });

  supplierCache.set(key, supplier.id);
  stats.suppliersCreated += 1;
  return supplier.id;
}

function deriveItemsPerCase(row: SalesReportRow) {
  const qty = parseNumber(row['Qty.']);
  const cases = parseNumber(row['Cases']);
  if (cases <= 0) return null;
  const perCase = qty / cases;
  if (!Number.isFinite(perCase) || perCase <= 0) return null;
  return Math.round(perCase);
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseDateOnly(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed;
}

function parseMoney(value: string | undefined) {
  if (!value) return new Decimal(0);
  const clean = value.replace(/[$,]/g, '').trim();
  if (!clean) return new Decimal(0);
  return new Decimal(clean);
}

function parseNumber(value: string | undefined) {
  if (!value) return 0;
  const clean = value.replace(/,/g, '').trim();
  const num = Number(clean);
  return Number.isFinite(num) ? num : 0;
}

function parseDecimal(value: string | undefined) {
  const num = parseNumber(value);
  return num === 0 ? null : new Decimal(num);
}

function safeTrim(value: string | undefined) {
  if (!value) return '';
  return value.replace(/\u0000/g, '').trim();
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSku(code: string) {
  return code.trim().toUpperCase();
}

function recordMissing(map: Map<string, number>, key: string) {
  const existing = map.get(key) ?? 0;
  map.set(key, existing + 1);
}

function deriveSkuCode(row: SalesReportRow) {
  const raw = safeTrim(row['SKU']);
  if (raw) return raw;
  const item = safeTrim(row['Item']) || 'Imported';
  const slug = item
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `AUTO-${slug || 'ITEM'}`;
}

function parseVintage(item: string | undefined) {
  if (!item) return null;
  const match = item.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function printSummary(options: CliOptions, summary: ImportStats = stats) {
  console.log('\n================ SUMMARY ================');
  console.log(`Invoices created: ${summary.invoicesCreated.toLocaleString()}`);
  console.log(`Invoices skipped: ${summary.invoicesSkipped.toLocaleString()}`);
  console.log(`Invoices failed: ${summary.invoicesFailed.toLocaleString()}`);
  console.log(`Order lines created: ${summary.linesCreated.toLocaleString()}`);
  console.log(`Suppliers created: ${summary.suppliersCreated}`);
  console.log(`Products created: ${summary.productsCreated}`);
  console.log(`SKUs created: ${summary.skusCreated}`);
  console.log('-----------------------------------------');
  summary.files.forEach((file) => {
    console.log(`${path.basename(file.file)} → +${file.invoicesCreated} / skipped ${file.invoicesSkipped} / failed ${file.invoicesFailed}`);
  });

  if (summary.missingCustomers.size) {
    console.log('\nMissing customers:');
    for (const [name, count] of summary.missingCustomers.entries()) {
      console.log(`  • ${name} (${count})`);
    }
  }

  if (summary.missingSkus.size) {
    console.log('\nMissing SKUs:');
    for (const [sku, count] of summary.missingSkus.entries()) {
      console.log(`  • ${sku} (${count})`);
    }
  }

  if (summary.errors.length) {
    console.log('\nErrors:');
    summary.errors.slice(0, 20).forEach((err) => console.log(`  - ${err}`));
    if (summary.errors.length > 20) {
      console.log(`  ...and ${summary.errors.length - 20} more`);
    }
  }

  if (options.dryRun) {
    console.log('\nDry run complete. No changes were written.');
  } else {
    console.log('\nImport complete.');
  }
}

if (require.main === module) {
  main();
}

export type { ImportStats };
