#!/usr/bin/env ts-node

/**
 * Well Crafted Database Export using MCP Supabase Tool
 *
 * This script uses the wellcrafted-supabase MCP server to export all data
 * from the Well Crafted database for migration purposes.
 */

import * as fs from 'fs';
import * as path from 'path';

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
 * Main export function - instructions for manual MCP tool usage
 */
async function exportWellCraftedData(): Promise<void> {
  console.log('🚀 Well Crafted Database Export - MCP Tool Instructions');
  console.log(`📅 ${new Date().toISOString()}\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const exportDir = `/Users/greghogue/Leora2/exports/wellcrafted-complete-${timestamp}`;

  console.log('📋 MANUAL EXPORT INSTRUCTIONS:');
  console.log('='.repeat(80));
  console.log('\nUse the following MCP tool calls to export each table:\n');

  const tables = [
    { name: 'Customer', filename: 'customer.json', expectedCount: undefined },
    { name: 'Product', filename: 'product.json', expectedCount: undefined },
    { name: 'Sku', filename: 'sku.json', expectedCount: undefined },
    { name: 'Order', filename: 'order.json', expectedCount: undefined },
    { name: 'OrderLine', filename: 'orderline.json', expectedCount: EXPECTED_ORDERLINES }
  ];

  tables.forEach((table, index) => {
    console.log(`${index + 1}. Export ${table.name}:`);
    console.log(`   mcp__wellcrafted-supabase__supabase_query_table({`);
    console.log(`     params: {`);
    console.log(`       table_name: "${table.name}",`);
    console.log(`       limit: 10000,`);
    console.log(`       response_format: "json"`);
    console.log(`     }`);
    console.log(`   })\n`);
  });

  console.log('='.repeat(80));
  console.log('\n💡 After getting the data from MCP tools:');
  console.log(`   - Save each result to: ${exportDir}/<tablename>.json`);
  console.log('   - Verify OrderLine count equals 7,774');
  console.log('   - Run data quality checks');
  console.log('\n' + '='.repeat(80));
}

// Run export instructions
exportWellCraftedData().catch(console.error);
