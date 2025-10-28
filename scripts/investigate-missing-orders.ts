#!/usr/bin/env tsx
/**
 * Investigate Missing Orders
 * Analyzes the ~15,000 missing orders from import
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:9gpGHuAIr2vKf4hO@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres'
    }
  }
});

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

async function investigateMissingOrders() {
  console.log('🔍 Investigating Missing Orders...\n');

  try {
    // Count current orders
    const currentOrderCount = await prisma.order.count({
      where: { tenantId: TENANT_ID }
    });

    console.log(`📊 Current Database Status:`);
    console.log(`  Orders in database: ${currentOrderCount.toLocaleString()}`);
    console.log(`  Expected from report: ~35,302`);
    console.log(`  Missing: ~${(35302 - currentOrderCount).toLocaleString()}\n`);

    // Check for sample orders in different tables
    console.log('🔍 Checking for sample-related data...\n');

    try {
      const sampleUsageCount = await prisma.sampleUsage.count({
        where: { tenantId: TENANT_ID }
      });
      console.log(`  Sample Usage records: ${sampleUsageCount.toLocaleString()}`);
    } catch (e) {
      console.log('  Sample Usage table: Not accessible or empty');
    }

    // Check order distribution by year
    console.log('\n📅 Order Distribution by Year:');
    const ordersByYear = await prisma.$queryRaw<Array<{year: number, count: bigint, total: number}>>`
      SELECT
        EXTRACT(YEAR FROM "orderDate")::int as year,
        COUNT(*)::bigint as count,
        SUM(total)::numeric as total
      FROM "Order"
      WHERE "tenantId" = ${TENANT_ID}::uuid
      GROUP BY EXTRACT(YEAR FROM "orderDate")
      ORDER BY year DESC
    `;

    ordersByYear.forEach(row => {
      console.log(`  ${row.year}: ${Number(row.count).toLocaleString()} orders ($${Number(row.total).toLocaleString()})`);
    });

    // Check for orders with special flags
    console.log('\n🏷️  Order Type Analysis:');

    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: { tenantId: TENANT_ID },
      _count: true
    });

    statusCounts.forEach(stat => {
      console.log(`  ${stat.status}: ${stat._count.toLocaleString()} orders`);
    });

    // Check for invoices without orders
    console.log('\n📄 Invoice Analysis:');
    const invoiceCount = await prisma.invoice.count({
      where: { tenantId: TENANT_ID }
    });
    console.log(`  Total invoices: ${invoiceCount.toLocaleString()}`);

    const invoicesWithOrders = await prisma.invoice.count({
      where: {
        tenantId: TENANT_ID,
        orderId: { not: null }
      }
    });
    console.log(`  Invoices linked to orders: ${invoicesWithOrders.toLocaleString()}`);
    console.log(`  Invoices without orders: ${(invoiceCount - invoicesWithOrders).toLocaleString()}`);

    // Check the original CSV file
    console.log('\n📁 Checking Sales Report CSV...');
    try {
      const csvPath = '/Users/greghogue/Leora2/data/Sales report 2022-01-01 to 2025-10-26.csv';
      const csvContent = readFileSync(csvPath, 'utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
      });

      console.log(`  CSV file records: ${records.length.toLocaleString()}`);

      // Count unique invoices
      const uniqueInvoices = new Set(records.map((r: any) => r['Invoice #']));
      console.log(`  Unique invoices in CSV: ${uniqueInvoices.size.toLocaleString()}`);

      // Sample some records that might not have been imported
      const sampleRecords = records.filter((r: any) => {
        const customerName = r['Sold to Customer Name']?.toLowerCase() || '';
        return customerName.includes('sample') ||
               customerName.includes('promotional') ||
               customerName.includes('marketing');
      });

      if (sampleRecords.length > 0) {
        console.log(`\n  Sample/Promotional records in CSV: ${sampleRecords.length.toLocaleString()}`);
        console.log('  Example records:');
        sampleRecords.slice(0, 5).forEach((r: any) => {
          console.log(`    - Invoice ${r['Invoice #']}: ${r['Sold to Customer Name']}`);
        });
      }

    } catch (e) {
      console.log('  Could not read CSV file:', e.message);
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    console.log('  1. Check if sample orders need separate import logic');
    console.log('  2. Verify invoice records without orders');
    console.log('  3. Review import script filters/exclusions');
    console.log('  4. Consider if some orders are in draft/pending status');

  } catch (error) {
    console.error('❌ Error investigating orders:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

investigateMissingOrders().catch(console.error);
