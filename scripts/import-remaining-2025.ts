#!/usr/bin/env ts-node
/**
 * Import Remaining 2025 Data (June-October)
 *
 * This script imports only orders from June 2025 onward to fill the gap
 * in the database without duplicating existing data.
 */

import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const CONFIG = {
  tenantId: '58b8126a-2d2f-4f55-bc98-5b6784800bed',
  csvPath: path.join(process.cwd(), '..', 'Sales report 2022-01-01 to 2025-10-26.csv'),
  startDate: new Date('2025-06-10'), // Start after June 9 (our last order)
  batchSize: 10, // Reduced for transaction timeout
  transactionTimeout: 30000, // 30 seconds
};

async function main() {
  console.log('🔍 Importing remaining 2025 data (June 10 - October 26)...\n');

  // Read CSV
  const csvContent = fs.readFileSync(CONFIG.csvPath, 'utf-8');
  const lines = csvContent.split('\n');
  const dataLines = lines.slice(3).join('\n'); // Skip first 3 metadata lines (line 4 is header)

  const records: any[] = parse(dataLines, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`📄 Total CSV rows: ${records.length.toLocaleString()}`);

  // Get customer and SKU maps
  const customers = await prisma.customer.findMany({
    where: { tenantId: CONFIG.tenantId },
    select: { id: true, name: true }
  });

  const skus = await prisma.sku.findMany({
    where: { tenantId: CONFIG.tenantId },
    select: { id: true, code: true }
  });

  const customerMap = new Map(customers.map(c => [c.name.toLowerCase().trim(), c.id]));
  const skuMap = new Map(skus.map(s => [s.code.toLowerCase().trim(), s.id]));

  console.log(`👥 Customers: ${customerMap.size.toLocaleString()}`);
  console.log(`📦 SKUs: ${skuMap.size.toLocaleString()}\n`);

  // Group by invoice
  const invoiceMap = new Map<string, any>();
  let skippedOld = 0;
  let processed = 0;

  for (const row of records) {
    const invoiceDateStr = row['Invoice date'];
    if (!invoiceDateStr) continue;

    const invoiceDate = new Date(invoiceDateStr);

    // Skip invalid dates
    if (isNaN(invoiceDate.getTime())) {
      continue;
    }

    // Skip orders before our cutoff date
    if (invoiceDate < CONFIG.startDate) {
      skippedOld++;
      continue;
    }

    processed++;

    const invoiceNumber = row['Invoice number'];
    if (!invoiceMap.has(invoiceNumber)) {
      invoiceMap.set(invoiceNumber, {
        invoiceNumber,
        customer: row['Customer'],
        invoiceDate,
        postedDate: new Date(row['Posted date']),
        lines: [],
        total: 0
      });
    }

    const invoice = invoiceMap.get(invoiceNumber)!;
    const netPrice = parseFloat(row['Net price'] || '0');

    invoice.lines.push({
      sku: row['SKU'],
      quantity: parseFloat(row['Qty.'] || '1'),
      unitPrice: parseFloat(row['Unit price'] || '0'),
      netPrice
    });

    invoice.total += netPrice;
  }

  const invoices = Array.from(invoiceMap.values());
  console.log(`📊 Debug:`);
  console.log(`   Total rows processed: ${processed.toLocaleString()}`);
  console.log(`   Rows skipped (before June 10): ${skippedOld.toLocaleString()}`);
  console.log(`   Unique invoices (June 10 - Oct 26): ${invoices.length.toLocaleString()}\n`);

  if (invoices.length === 0) {
    console.log('✅ No new data to import!');
    await prisma.$disconnect();
    return;
  }

  // Import in batches
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < invoices.length; i += CONFIG.batchSize) {
    const batch = invoices.slice(i, i + CONFIG.batchSize);

    try {
      await prisma.$transaction(async (tx) => {
        for (const invoice of batch) {
          if (!invoice.customer) {
            skipped++;
            continue;
          }

          const customerId = customerMap.get(invoice.customer.toLowerCase().trim());
          if (!customerId) {
            skipped++;
            continue;
          }

          // Create order
          const order = await tx.order.create({
            data: {
              tenantId: CONFIG.tenantId,
              customerId,
              status: 'FULFILLED',
              orderedAt: invoice.invoiceDate,
              fulfilledAt: invoice.postedDate,
              deliveredAt: invoice.postedDate,
              total: invoice.total,
              currency: 'USD'
            }
          });

          // Create order lines
          for (const line of invoice.lines) {
            if (!line.sku) continue;

            const skuId = skuMap.get(line.sku.toLowerCase().trim());
            if (!skuId) continue;

            await tx.orderLine.create({
              data: {
                tenantId: CONFIG.tenantId,
                orderId: order.id,
                skuId,
                quantity: line.quantity,
                unitPrice: line.unitPrice
              }
            });
          }

          imported++;
        }
      });

      console.log(`  Batch ${Math.floor(i / CONFIG.batchSize) + 1}: ${imported} imported, ${skipped} skipped`);
    } catch (error) {
      console.error('  Error in batch:', error);
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Imported: ${imported.toLocaleString()} orders`);
  console.log(`   Skipped: ${skipped.toLocaleString()} orders\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
