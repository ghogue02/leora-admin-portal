#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Database credentials
const SUPABASE_URL = 'https://zqezunzlyjkseugujkrl.supabase.co';
const SUPABASE_SERVICE_KEY = '<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>';

// Expected counts for verification
const EXPECTED_ORDERLINES = 7774;

interface ExportStats {
  tableName: string;
  recordCount: number;
  expectedCount?: number;
  verified: boolean;
  sampleRecord?: any;
}

interface ExportReport {
  timestamp: string;
  exportPath: string;
  tables: ExportStats[];
  totalRecords: number;
  verificationStatus: 'PASSED' | 'FAILED';
  errors: string[];
  warnings: string[];
}

/**
 * Export data from a table with pagination
 */
async function exportTable(
  supabase: any,
  tableName: string,
  pageSize: number = 1000
): Promise<any[]> {
  console.log(`\n📊 Exporting table: ${tableName}`);

  const allRecords: any[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Error exporting ${tableName}: ${error.message}`);
    }

    if (data && data.length > 0) {
      allRecords.push(...data);
      offset += data.length;
      console.log(`  ✓ Fetched ${data.length} records (total: ${allRecords.length})`);

      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Completed ${tableName}: ${allRecords.length} records exported`);
  return allRecords;
}

/**
 * Save data to JSON file
 */
function saveToFile(data: any[], filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2),
    'utf-8'
  );
  console.log(`💾 Saved to: ${filePath}`);
}

/**
 * Generate export report
 */
function generateReport(stats: ExportStats[], exportPath: string): ExportReport {
  const report: ExportReport = {
    timestamp: new Date().toISOString(),
    exportPath,
    tables: stats,
    totalRecords: stats.reduce((sum, s) => sum + s.recordCount, 0),
    verificationStatus: 'PASSED',
    errors: [],
    warnings: []
  };

  // Verify OrderLine count
  const orderLineStats = stats.find(s => s.tableName === 'OrderLine');
  if (orderLineStats) {
    if (orderLineStats.recordCount !== EXPECTED_ORDERLINES) {
      report.verificationStatus = 'FAILED';
      report.errors.push(
        `❌ OrderLine count mismatch! Expected: ${EXPECTED_ORDERLINES}, Got: ${orderLineStats.recordCount}`
      );
    } else {
      console.log(`\n✅ CRITICAL VERIFICATION PASSED: Exported exactly ${EXPECTED_ORDERLINES} OrderLines`);
    }
  } else {
    report.verificationStatus = 'FAILED';
    report.errors.push('❌ OrderLine table not found in export');
  }

  // Check for empty tables
  stats.forEach(stat => {
    if (stat.recordCount === 0) {
      report.warnings.push(`⚠️  ${stat.tableName} is empty`);
    }
  });

  return report;
}

/**
 * Print export report
 */
function printReport(report: ExportReport): void {
  console.log('\n' + '='.repeat(80));
  console.log('📋 EXPORT REPORT');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Export Path: ${report.exportPath}`);
  console.log(`\nVerification Status: ${report.verificationStatus === 'PASSED' ? '✅ PASSED' : '❌ FAILED'}`);

  console.log('\n📊 Table Statistics:');
  console.log('-'.repeat(80));
  report.tables.forEach(stat => {
    const status = stat.verified ? '✅' : '⚠️';
    const expected = stat.expectedCount ? ` (expected: ${stat.expectedCount})` : '';
    console.log(`${status} ${stat.tableName.padEnd(20)} ${stat.recordCount.toLocaleString()} records${expected}`);
  });

  console.log('-'.repeat(80));
  console.log(`Total Records: ${report.totalRecords.toLocaleString()}`);

  if (report.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    report.errors.forEach(err => console.log(`  ${err}`));
  }

  if (report.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    report.warnings.forEach(warn => console.log(`  ${warn}`));
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Main export function
 */
async function exportWellCraftedData(): Promise<void> {
  console.log('🚀 Starting Well Crafted Database Export');
  console.log(`📅 ${new Date().toISOString()}\n`);

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Create export directory
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const exportDir = `/Users/greghogue/Leora2/exports/wellcrafted-complete-${timestamp}`;

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const stats: ExportStats[] = [];

  try {
    // Export all tables in order (respecting foreign key dependencies)
    const tables = [
      { name: 'Customer', filename: 'customer.json' },
      { name: 'Product', filename: 'product.json' },
      { name: 'Sku', filename: 'sku.json' },
      { name: 'Order', filename: 'order.json' },
      { name: 'OrderLine', filename: 'orderline.json', expectedCount: EXPECTED_ORDERLINES }
    ];

    for (const table of tables) {
      const data = await exportTable(supabase, table.name);
      const filePath = path.join(exportDir, table.filename);
      saveToFile(data, filePath);

      const stat: ExportStats = {
        tableName: table.name,
        recordCount: data.length,
        expectedCount: table.expectedCount,
        verified: table.expectedCount ? data.length === table.expectedCount : true,
        sampleRecord: data.length > 0 ? data[0] : null
      };

      stats.push(stat);
    }

    // Generate and save report
    const report = generateReport(stats, exportDir);
    const reportPath = path.join(exportDir, 'export-report.json');
    saveToFile(report, reportPath);

    // Print summary
    printReport(report);

    // Data quality checks
    console.log('\n🔍 DATA QUALITY CHECKS:');
    console.log('-'.repeat(80));

    const customers = JSON.parse(fs.readFileSync(path.join(exportDir, 'customer.json'), 'utf-8'));
    const orders = JSON.parse(fs.readFileSync(path.join(exportDir, 'order.json'), 'utf-8'));
    const orderLines = JSON.parse(fs.readFileSync(path.join(exportDir, 'orderline.json'), 'utf-8'));
    const skus = JSON.parse(fs.readFileSync(path.join(exportDir, 'sku.json'), 'utf-8'));
    const products = JSON.parse(fs.readFileSync(path.join(exportDir, 'product.json'), 'utf-8'));

    // Sample customer data
    if (customers.length > 0) {
      console.log('✓ Sample Customer:', {
        name: customers[0].name,
        email: customers[0].email,
        accountNumber: customers[0].accountNumber
      });
    }

    // Sample order data
    if (orders.length > 0) {
      console.log('✓ Sample Order:', {
        date: orders[0].date,
        total: orders[0].total,
        customerId: orders[0].customerId
      });
    }

    // Sample orderline data
    if (orderLines.length > 0) {
      console.log('✓ Sample OrderLine:', {
        orderId: orderLines[0].orderId,
        skuId: orderLines[0].skuId,
        quantity: orderLines[0].quantity,
        price: orderLines[0].price
      });
    }

    // Sample SKU data
    if (skus.length > 0) {
      console.log('✓ Sample SKU:', {
        code: skus[0].code,
        size: skus[0].size,
        productId: skus[0].productId
      });
    }

    // Sample product data
    if (products.length > 0) {
      console.log('✓ Sample Product:', {
        name: products[0].name,
        producer: products[0].producer
      });
    }

    console.log('-'.repeat(80));

    // Migration readiness check
    console.log('\n🎯 MIGRATION READINESS:');
    console.log('-'.repeat(80));

    const readinessChecks = [
      { check: 'OrderLine count matches psql verification', passed: orderLines.length === EXPECTED_ORDERLINES },
      { check: 'All 5 tables exported', passed: stats.length === 5 },
      { check: 'Customer data includes names and emails', passed: customers.length > 0 && customers[0].name && customers[0].email },
      { check: 'Order data includes dates and totals', passed: orders.length > 0 && orders[0].date && orders[0].total !== undefined },
      { check: 'OrderLine data includes quantities and prices', passed: orderLines.length > 0 && orderLines[0].quantity !== undefined && orderLines[0].price !== undefined },
      { check: 'SKU data includes codes and sizes', passed: skus.length > 0 && skus[0].code },
      { check: 'Product data includes names and producers', passed: products.length > 0 && products[0].name }
    ];

    const allPassed = readinessChecks.every(c => c.passed);

    readinessChecks.forEach(check => {
      console.log(`${check.passed ? '✅' : '❌'} ${check.check}`);
    });

    console.log('-'.repeat(80));
    console.log(`\n${allPassed ? '✅ READY FOR MIGRATION' : '❌ NOT READY FOR MIGRATION'}`);
    console.log(`\n📁 Export completed successfully!`);
    console.log(`📂 Files saved to: ${exportDir}\n`);

    if (report.verificationStatus === 'FAILED') {
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    process.exit(1);
  }
}

// Run export
exportWellCraftedData().catch(console.error);
