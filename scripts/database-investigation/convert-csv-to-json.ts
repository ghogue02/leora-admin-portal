#!/usr/bin/env tsx

/**
 * Convert CSV exports to JSON format for migration
 */

import * as fs from 'fs';
import * as path from 'path';

const EXPECTED_ORDERLINES = 7774;

interface ConversionResult {
  table: string;
  csvFile: string;
  jsonFile: string;
  recordCount: number;
  verified: boolean;
}

function csvToJson(csvPath: string): any[] {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');

  if (lines.length < 2) {
    console.log(`⚠️  ${csvPath} is empty or has no data rows`);
    return [];
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  // Parse data rows
  const records: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const record: any = {};

    header.forEach((key, index) => {
      let value = values[index]?.trim().replace(/^"|"$/g, '');

      // Type conversion
      if (value === '') {
        record[key] = null;
      } else if (value === 'true') {
        record[key] = true;
      } else if (value === 'false') {
        record[key] = false;
      } else if (!isNaN(Number(value)) && value !== '') {
        record[key] = Number(value);
      } else {
        record[key] = value;
      }
    });

    records.push(record);
  }

  return records;
}

function convertAllTables(): ConversionResult[] {
  console.log('🔄 Converting CSV files to JSON...\n');

  const csvDir = '/Users/greghogue/Leora2/exports/wellcrafted-manual';
  const jsonDir = `/Users/greghogue/Leora2/exports/wellcrafted-json-${new Date().toISOString().slice(0, 10)}`;

  if (!fs.existsSync(csvDir)) {
    console.error(`❌ CSV directory not found: ${csvDir}`);
    console.error('Please run the manual export first (see MANUAL_EXPORT_INSTRUCTIONS.md)');
    process.exit(1);
  }

  fs.mkdirSync(jsonDir, { recursive: true });

  const tables = [
    { name: 'Customer', csvFile: 'customer.csv', jsonFile: 'customer.json' },
    { name: 'Product', csvFile: 'product.csv', jsonFile: 'product.json' },
    { name: 'Sku', csvFile: 'sku.csv', jsonFile: 'sku.json' },
    { name: 'Order', csvFile: 'order.csv', jsonFile: 'order.json' },
    { name: 'OrderLine', csvFile: 'orderline.csv', jsonFile: 'orderline.json', expectedCount: EXPECTED_ORDERLINES }
  ];

  const results: ConversionResult[] = [];

  for (const table of tables) {
    const csvPath = path.join(csvDir, table.csvFile);
    const jsonPath = path.join(jsonDir, table.jsonFile);

    if (!fs.existsSync(csvPath)) {
      console.log(`❌ ${table.name}: CSV file not found - ${csvPath}`);
      results.push({
        table: table.name,
        csvFile: csvPath,
        jsonFile: jsonPath,
        recordCount: 0,
        verified: false
      });
      continue;
    }

    console.log(`📊 Converting ${table.name}...`);

    const records = csvToJson(csvPath);

    fs.writeFileSync(jsonPath, JSON.stringify(records, null, 2));

    const verified = table.expectedCount ? records.length === table.expectedCount : true;

    console.log(`  ✓ ${records.length} records → ${jsonPath}`);

    if (!verified) {
      console.log(`  ❌ Count mismatch! Expected ${table.expectedCount}, got ${records.length}`);
    }

    results.push({
      table: table.name,
      csvFile: csvPath,
      jsonFile: jsonPath,
      recordCount: records.length,
      verified
    });
  }

  return results;
}

function printReport(results: ConversionResult[]): void {
  console.log('\n' + '='.repeat(80));
  console.log('📋 CONVERSION REPORT');
  console.log('='.repeat(80));

  console.log('\n📊 Conversion Results:');
  console.log('-'.repeat(80));

  results.forEach(result => {
    const status = result.verified ? '✅' : '❌';
    console.log(`${status} ${result.table.padEnd(20)} ${result.recordCount.toLocaleString()} records`);
  });

  const totalRecords = results.reduce((sum, r) => sum + r.recordCount, 0);
  console.log('-'.repeat(80));
  console.log(`Total Records: ${totalRecords.toLocaleString()}`);

  const allVerified = results.every(r => r.verified);

  console.log('\n🎯 VERIFICATION STATUS:');
  console.log('-'.repeat(80));

  if (allVerified) {
    console.log('✅ ALL TABLES VERIFIED');
    console.log(`✅ OrderLine count matches: ${EXPECTED_ORDERLINES}`);
  } else {
    console.log('❌ VERIFICATION FAILED');
    results.filter(r => !r.verified).forEach(r => {
      console.log(`  ❌ ${r.table}: Verification failed`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

// Main execution
const results = convertAllTables();
printReport(results);

if (!results.every(r => r.verified)) {
  process.exit(1);
}
