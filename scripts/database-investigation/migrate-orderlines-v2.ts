#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Lovable Database Connection
const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

// File paths
const BASE_PATH = '/Users/greghogue/Leora2/exports/wellcrafted-manual';
const WC_ORDERLINES_PATH = path.join(BASE_PATH, 'OrderLine.csv');
const SKU_UUID_MAP_PATH = path.join(BASE_PATH, 'sku-uuid-map.json');

interface WCOrderLine {
  id: string;
  orderId: string;
  skuId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  createdAt: string;
  updatedAt: string;
}

interface MigrationStats {
  totalWCOrderLines: number;
  orderLinesImported: number;
  orderLinesSkipped: number;
  skipReasons: Map<string, number>;
  revenueAccuracy: {
    perfectMatches: number;
    minorDifferences: number;
    majorDifferences: number;
  };
}

// Parse CSV files
function parseCSV<T>(filePath: string): T[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj: any = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    return obj as T;
  });
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  return values;
}

// Main migration function
async function migrateOrderLines() {
  console.log('🚀 Starting OrderLine Migration (Well Crafted -> Lovable)...\n');

  const stats: MigrationStats = {
    totalWCOrderLines: 0,
    orderLinesImported: 0,
    orderLinesSkipped: 0,
    skipReasons: new Map(),
    revenueAccuracy: {
      perfectMatches: 0,
      minorDifferences: 0,
      majorDifferences: 0
    }
  };

  // Load SKU UUID mapping
  console.log('📂 Loading SKU UUID mappings...');
  const skuUuidMap = new Map<string, string>(
    Object.entries(JSON.parse(fs.readFileSync(SKU_UUID_MAP_PATH, 'utf-8'))) as [string, string][]
  );
  console.log(`  - SKU mappings: ${skuUuidMap.size}`);

  // Load Well Crafted OrderLines
  console.log('\n📊 Loading Well Crafted OrderLines...');
  const wcOrderLines = parseCSV<WCOrderLine>(WC_ORDERLINES_PATH);
  stats.totalWCOrderLines = wcOrderLines.length;
  console.log(`  - OrderLines: ${wcOrderLines.length}`);

  // Load Lovable data
  console.log('\n🎯 Loading Lovable data...');
  const { data: lovableOrders } = await lovable.from('order').select('id, total');
  const { count: initialOrderLines } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  console.log(`  - Orders: ${lovableOrders?.length || 0}`);
  console.log(`  - Existing OrderLines: ${initialOrderLines || 0}`);

  // Build order lookup
  const lovableOrderIds = new Set(lovableOrders?.map(o => o.id) || []);
  const lovableOrderMap = new Map((lovableOrders || []).map(o => [o.id, o]));

  // Prepare orderlines for import
  console.log('\n📦 Preparing OrderLines for import...');
  const orderLinesToImport: any[] = [];
  const skippedOrderLines: Array<{ orderLine: WCOrderLine; reason: string }> = [];

  for (const wcOL of wcOrderLines) {
    // Check if order exists in Lovable (direct UUID match)
    if (!lovableOrderIds.has(wcOL.orderId)) {
      skippedOrderLines.push({ orderLine: wcOL, reason: 'Order not in Lovable' });
      stats.skipReasons.set('Order not in Lovable', (stats.skipReasons.get('Order not in Lovable') || 0) + 1);
      continue;
    }

    // Map SKU ID using sku-uuid-map.json
    const lovableSkuId = skuUuidMap.get(wcOL.skuId);
    if (!lovableSkuId) {
      skippedOrderLines.push({ orderLine: wcOL, reason: 'SKU not in mapping' });
      stats.skipReasons.set('SKU not in mapping', (stats.skipReasons.get('SKU not in mapping') || 0) + 1);
      continue;
    }

    // Transform to Lovable schema
    orderLinesToImport.push({
      orderid: wcOL.orderId,
      skuid: lovableSkuId,
      quantity: parseInt(wcOL.quantity),
      unitprice: parseFloat(wcOL.unitPrice),
      createdat: wcOL.createdAt,
      updatedat: wcOL.updatedAt
    });
  }

  console.log(`  - Ready to import: ${orderLinesToImport.length}`);
  console.log(`  - Skipped: ${skippedOrderLines.length}`);

  // Import in batches
  console.log('\n🚀 Importing OrderLines in batches of 100...');
  const batchSize = 100;
  let imported = 0;

  for (let i = 0; i < orderLinesToImport.length; i += batchSize) {
    const batch = orderLinesToImport.slice(i, i + batchSize);
    const { error } = await lovable.from('orderline').insert(batch);

    if (error) {
      console.error(`\n❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
      stats.orderLinesSkipped += batch.length;

      // Try to add more detailed error info
      if (error.details) {
        console.error('Details:', error.details);
      }
    } else {
      imported += batch.length;
      process.stdout.write(`\r  Imported: ${imported} / ${orderLinesToImport.length}`);
    }
  }

  stats.orderLinesImported = imported;
  console.log('\n');

  // Verify final count
  const { count: finalOrderLines } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  // Calculate coverage
  const totalLovableOrders = lovableOrders?.length || 0;
  const ordersWithLines = new Set(orderLinesToImport.map(ol => ol.orderid)).size;
  const coverage = (ordersWithLines / totalLovableOrders) * 100;

  // Revenue accuracy analysis
  console.log('\n💰 Analyzing revenue accuracy...');
  const orderRevenues = new Map<string, number>();

  for (const ol of orderLinesToImport) {
    const revenue = ol.quantity * ol.unitprice;
    orderRevenues.set(ol.orderid, (orderRevenues.get(ol.orderid) || 0) + revenue);
  }

  for (const [orderId, calculatedTotal] of orderRevenues) {
    const order = lovableOrderMap.get(orderId);
    if (!order) continue;

    const diff = Math.abs(order.total - calculatedTotal);
    if (diff < 0.01) {
      stats.revenueAccuracy.perfectMatches++;
    } else if (diff < 1.00) {
      stats.revenueAccuracy.minorDifferences++;
    } else {
      stats.revenueAccuracy.majorDifferences++;
    }
  }

  // Print comprehensive report
  console.log('\n' + '='.repeat(60));
  console.log('📊 ORDERLINE MIGRATION REPORT');
  console.log('='.repeat(60));

  console.log('\n📈 Migration Statistics:');
  console.log(`  Well Crafted OrderLines: ${stats.totalWCOrderLines}`);
  console.log(`  OrderLines Imported: ${stats.orderLinesImported}`);
  console.log(`  OrderLines Skipped: ${stats.orderLinesSkipped}`);

  console.log('\n📊 Coverage Analysis:');
  console.log(`  Total Lovable Orders: ${totalLovableOrders}`);
  console.log(`  Orders with OrderLines: ${ordersWithLines}`);
  console.log(`  Coverage: ${coverage.toFixed(1)}% ${coverage >= 70 ? '✅' : '❌'}`);
  console.log(`  Target: 70% (434+ orders)`);

  console.log('\n❌ Skip Reasons:');
  stats.skipReasons.forEach((count, reason) => {
    console.log(`  ${reason}: ${count} (${((count / stats.orderLinesSkipped) * 100).toFixed(1)}%)`);
  });

  console.log('\n💰 Revenue Accuracy:');
  const totalAnalyzed = stats.revenueAccuracy.perfectMatches + stats.revenueAccuracy.minorDifferences + stats.revenueAccuracy.majorDifferences;
  if (totalAnalyzed > 0) {
    console.log(`  Perfect matches (<$0.01): ${stats.revenueAccuracy.perfectMatches} (${((stats.revenueAccuracy.perfectMatches / totalAnalyzed) * 100).toFixed(1)}%)`);
    console.log(`  Minor differences (<$1.00): ${stats.revenueAccuracy.minorDifferences} (${((stats.revenueAccuracy.minorDifferences / totalAnalyzed) * 100).toFixed(1)}%)`);
    console.log(`  Major differences (>$1.00): ${stats.revenueAccuracy.majorDifferences} (${((stats.revenueAccuracy.majorDifferences / totalAnalyzed) * 100).toFixed(1)}%)`);
  }

  console.log('\n📊 Final OrderLine Counts:');
  console.log(`  Before: ${initialOrderLines}`);
  console.log(`  After: ${finalOrderLines}`);
  console.log(`  Increase: +${(finalOrderLines || 0) - (initialOrderLines || 0)}`);

  console.log('\n' + '='.repeat(60));

  if (coverage >= 70) {
    console.log('✅ SUCCESS: 70%+ coverage achieved!');
  } else {
    console.log('❌ FAILED: Coverage below 70% target');
  }

  console.log('='.repeat(60) + '\n');

  // Save detailed report
  const reportPath = '/Users/greghogue/Leora2/scripts/database-investigation/orderline-migration-report-v2.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats: {
      ...stats,
      skipReasons: Object.fromEntries(stats.skipReasons)
    },
    coverage: `${coverage.toFixed(1)}%`,
    success: coverage >= 70,
    skippedOrderLines: skippedOrderLines.slice(0, 100).map(s => ({
      orderLineId: s.orderLine.id,
      orderId: s.orderLine.orderId,
      skuId: s.orderLine.skuId,
      reason: s.reason
    }))
  }, null, 2));

  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

// Run migration
migrateOrderLines().catch(console.error);
