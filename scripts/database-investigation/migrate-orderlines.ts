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
const WC_ORDERS_PATH = path.join(BASE_PATH, 'Order.csv');
const WC_CUSTOMERS_PATH = path.join(BASE_PATH, 'Customer.csv');
const WC_ORDERLINES_PATH = path.join(BASE_PATH, 'OrderLine.csv');
const PRODUCT_UUID_MAP_PATH = path.join(BASE_PATH, 'product-uuid-map.json');
const SKU_UUID_MAP_PATH = path.join(BASE_PATH, 'sku-uuid-map.json');

interface WCOrder {
  id: string;
  customerId: string;
  total: string;
  shippingCost: string;
  tax: string;
  orderDate: string;
  createdAt: string;
  updatedAt: string;
}

interface WCCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface WCOrderLine {
  id: string;
  orderId: string;
  skuId: string;
  quantity: string;
  unitPrice: string;
  isSample: string;
  discount: string;
  createdAt: string;
  updatedAt: string;
}

interface LovableOrder {
  id: string;
  customerid: string;
  total: number;
  shippingcost: number;
  tax: number;
  orderdate: string;
  createdat: string;
}

interface LovableCustomer {
  id: string;
  email: string;
  firstname: string;
  lastname: string;
}

interface OrderMatch {
  lovableOrderId: string;
  wellCraftedOrderId: string;
  matchStrategy: 'uuid+date+total' | 'email+date+total' | 'name+date+total' | 'name+date';
  confidence: number;
}

interface MigrationStats {
  totalWCOrders: number;
  totalWCOrderLines: number;
  ordersMatched: number;
  orderLinesImported: number;
  orderLinesSkipped: number;
  skipReasons: Map<string, number>;
  matchStrategies: Map<string, number>;
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

// Fuzzy name matching (Levenshtein distance)
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function namesMatch(name1: string, name2: string, threshold: number = 0.85): boolean {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);

  if (n1 === n2) return true;

  const distance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);
  const similarity = 1 - (distance / maxLength);

  return similarity >= threshold;
}

// Date normalization
function normalizeDate(dateStr: string): string {
  if (!dateStr || dateStr.trim() === '') return '';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  return date.toISOString().split('T')[0];
}

// Match orders using 4-strategy algorithm
function matchOrders(
  wcOrders: WCOrder[],
  lovableOrders: LovableOrder[],
  wcCustomers: WCCustomer[],
  lovableCustomers: LovableCustomer[],
  productUuidMap: Map<string, string>
): OrderMatch[] {
  const matches: OrderMatch[] = [];
  const stats: MigrationStats['matchStrategies'] = new Map();

  // Build customer lookups
  const wcCustomerMap = new Map(wcCustomers.map(c => [c.id, c]));
  const lovableCustomerMap = new Map(lovableCustomers.map(c => [c.id, c]));
  const lovableCustomerByEmail = new Map(
    lovableCustomers
      .filter(c => c.email && c.email.trim())
      .map(c => [c.email.toLowerCase(), c])
  );

  for (const wcOrder of wcOrders) {
    const wcCustomer = wcCustomerMap.get(wcOrder.customerId);
    if (!wcCustomer) continue;

    const wcDate = normalizeDate(wcOrder.orderDate);
    if (!wcDate) continue; // Skip orders with invalid dates

    const wcTotal = parseFloat(wcOrder.total);
    const wcFullName = `${wcCustomer.firstName} ${wcCustomer.lastName}`;

    let matchFound = false;

    // Strategy 1: Customer UUID + Date + Total
    const lovableCustomerId = productUuidMap.get(wcOrder.customerId);
    if (lovableCustomerId) {
      const candidate = lovableOrders.find(lo => {
        const loDate = normalizeDate(lo.orderdate);
        return lo.customerid === lovableCustomerId &&
               loDate === wcDate &&
               Math.abs(lo.total - wcTotal) < 0.01;
      });

      if (candidate) {
        matches.push({
          lovableOrderId: candidate.id,
          wellCraftedOrderId: wcOrder.id,
          matchStrategy: 'uuid+date+total',
          confidence: 1.0
        });
        stats.set('uuid+date+total', (stats.get('uuid+date+total') || 0) + 1);
        matchFound = true;
        continue;
      }
    }

    // Strategy 2: Customer Email + Date + Total
    const lovableCustomer = wcCustomer.email && wcCustomer.email.trim()
      ? lovableCustomerByEmail.get(wcCustomer.email.toLowerCase())
      : undefined;
    if (lovableCustomer) {
      const candidate = lovableOrders.find(lo => {
        const loDate = normalizeDate(lo.orderdate);
        return lo.customerid === lovableCustomer.id &&
               loDate === wcDate &&
               Math.abs(lo.total - wcTotal) < 0.01;
      });

      if (candidate) {
        matches.push({
          lovableOrderId: candidate.id,
          wellCraftedOrderId: wcOrder.id,
          matchStrategy: 'email+date+total',
          confidence: 0.95
        });
        stats.set('email+date+total', (stats.get('email+date+total') || 0) + 1);
        matchFound = true;
        continue;
      }
    }

    // Strategy 3: Customer Name + Date + Total (fuzzy)
    const candidatesByDate = lovableOrders.filter(lo => normalizeDate(lo.orderdate) === wcDate);
    for (const candidate of candidatesByDate) {
      const loCustomer = lovableCustomerMap.get(candidate.customerid);
      if (!loCustomer) continue;

      const loFullName = `${loCustomer.firstname} ${loCustomer.lastname}`;
      if (namesMatch(wcFullName, loFullName, 0.85) && Math.abs(candidate.total - wcTotal) < 0.01) {
        matches.push({
          lovableOrderId: candidate.id,
          wellCraftedOrderId: wcOrder.id,
          matchStrategy: 'name+date+total',
          confidence: 0.85
        });
        stats.set('name+date+total', (stats.get('name+date+total') || 0) + 1);
        matchFound = true;
        break;
      }
    }

    if (matchFound) continue;

    // Strategy 4: Customer Name + Date (for $0 orders or total mismatches)
    for (const candidate of candidatesByDate) {
      const loCustomer = lovableCustomerMap.get(candidate.customerid);
      if (!loCustomer) continue;

      const loFullName = `${loCustomer.firstname} ${loCustomer.lastname}`;
      if (namesMatch(wcFullName, loFullName, 0.9)) {
        matches.push({
          lovableOrderId: candidate.id,
          wellCraftedOrderId: wcOrder.id,
          matchStrategy: 'name+date',
          confidence: 0.75
        });
        stats.set('name+date', (stats.get('name+date') || 0) + 1);
        break;
      }
    }
  }

  console.log('\n=== Order Matching Strategies ===');
  stats.forEach((count, strategy) => {
    console.log(`${strategy}: ${count} matches`);
  });

  return matches;
}

// Main migration function
async function migrateOrderLines() {
  console.log('🚀 Starting OrderLine Migration...\n');

  const stats: MigrationStats = {
    totalWCOrders: 0,
    totalWCOrderLines: 0,
    ordersMatched: 0,
    orderLinesImported: 0,
    orderLinesSkipped: 0,
    skipReasons: new Map(),
    matchStrategies: new Map(),
    revenueAccuracy: {
      perfectMatches: 0,
      minorDifferences: 0,
      majorDifferences: 0
    }
  };

  // Load mapping files
  console.log('📂 Loading UUID mappings...');
  const productUuidMap = new Map<string, string>(
    Object.entries(JSON.parse(fs.readFileSync(PRODUCT_UUID_MAP_PATH, 'utf-8'))) as [string, string][]
  );
  const skuUuidMap = new Map<string, string>(
    Object.entries(JSON.parse(fs.readFileSync(SKU_UUID_MAP_PATH, 'utf-8'))) as [string, string][]
  );

  console.log(`  - Product mappings: ${productUuidMap.size}`);
  console.log(`  - SKU mappings: ${skuUuidMap.size}`);

  // Load Well Crafted data
  console.log('\n📊 Loading Well Crafted data...');
  const wcOrders = parseCSV<WCOrder>(WC_ORDERS_PATH);
  const wcCustomers = parseCSV<WCCustomer>(WC_CUSTOMERS_PATH);
  const wcOrderLines = parseCSV<WCOrderLine>(WC_ORDERLINES_PATH);

  stats.totalWCOrders = wcOrders.length;
  stats.totalWCOrderLines = wcOrderLines.length;

  console.log(`  - Orders: ${wcOrders.length}`);
  console.log(`  - Customers: ${wcCustomers.length}`);
  console.log(`  - OrderLines: ${wcOrderLines.length}`);

  // Load Lovable data
  console.log('\n🎯 Loading Lovable data...');
  const { data: lovableOrders } = await lovable.from('order').select('*');
  const { data: lovableCustomers } = await lovable.from('customer').select('*');
  const { count: initialOrderLines } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  console.log(`  - Orders: ${lovableOrders?.length || 0}`);
  console.log(`  - Customers: ${lovableCustomers?.length || 0}`);
  console.log(`  - Existing OrderLines: ${initialOrderLines || 0}`);

  // Match orders
  console.log('\n🔍 Matching orders using 4-strategy algorithm...');
  const orderMatches = matchOrders(
    wcOrders,
    lovableOrders || [],
    wcCustomers,
    lovableCustomers || [],
    productUuidMap
  );

  stats.ordersMatched = orderMatches.length;
  console.log(`\n✅ Matched ${orderMatches.length} orders (${((orderMatches.length / wcOrders.length) * 100).toFixed(1)}%)`);

  // Build order match lookup
  const orderMatchMap = new Map(orderMatches.map(m => [m.wellCraftedOrderId, m]));

  // Prepare orderlines for import
  console.log('\n📦 Preparing OrderLines for import...');
  const orderLinesToImport: any[] = [];
  const skippedOrderLines: Array<{ orderLine: WCOrderLine; reason: string }> = [];

  for (const wcOL of wcOrderLines) {
    // Check if order is matched
    const orderMatch = orderMatchMap.get(wcOL.orderId);
    if (!orderMatch) {
      skippedOrderLines.push({ orderLine: wcOL, reason: 'Order not matched' });
      stats.skipReasons.set('Order not matched', (stats.skipReasons.get('Order not matched') || 0) + 1);
      continue;
    }

    // Map SKU ID
    const lovableSkuId = skuUuidMap.get(wcOL.skuId);
    if (!lovableSkuId) {
      skippedOrderLines.push({ orderLine: wcOL, reason: 'SKU not in mapping' });
      stats.skipReasons.set('SKU not in mapping', (stats.skipReasons.get('SKU not in mapping') || 0) + 1);
      continue;
    }

    // Verify SKU exists in Lovable
    const { data: skuExists } = await lovable
      .from('skus')
      .select('id')
      .eq('id', lovableSkuId)
      .single();

    if (!skuExists) {
      skippedOrderLines.push({ orderLine: wcOL, reason: 'SKU not in Lovable' });
      stats.skipReasons.set('SKU not in Lovable', (stats.skipReasons.get('SKU not in Lovable') || 0) + 1);
      continue;
    }

    // Transform to Lovable schema
    orderLinesToImport.push({
      orderid: orderMatch.lovableOrderId,
      skuid: lovableSkuId,
      quantity: parseInt(wcOL.quantity),
      unitprice: parseFloat(wcOL.unitPrice),
      issample: wcOL.isSample === 'true' || wcOL.isSample === '1',
      discount: parseFloat(wcOL.discount || '0'),
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
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} failed:`, error);
      stats.orderLinesSkipped += batch.length;
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
    const revenue = (ol.quantity * ol.unitprice) - ol.discount;
    orderRevenues.set(ol.orderid, (orderRevenues.get(ol.orderid) || 0) + revenue);
  }

  for (const [orderId, calculatedTotal] of orderRevenues) {
    const order = lovableOrders?.find(o => o.id === orderId);
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
  console.log(`  Well Crafted Orders: ${stats.totalWCOrders}`);
  console.log(`  Well Crafted OrderLines: ${stats.totalWCOrderLines}`);
  console.log(`  Orders Matched: ${stats.ordersMatched} (${((stats.ordersMatched / stats.totalWCOrders) * 100).toFixed(1)}%)`);
  console.log(`  OrderLines Imported: ${stats.orderLinesImported}`);
  console.log(`  OrderLines Skipped: ${stats.orderLinesSkipped}`);

  console.log('\n📊 Coverage Analysis:');
  console.log(`  Total Lovable Orders: ${totalLovableOrders}`);
  console.log(`  Orders with OrderLines: ${ordersWithLines}`);
  console.log(`  Coverage: ${coverage.toFixed(1)}% ${coverage >= 70 ? '✅' : '❌'}`);
  console.log(`  Target: 70% (434+ orders)`);

  console.log('\n🎯 Matching Strategies:');
  orderMatches.forEach(match => {
    stats.matchStrategies.set(match.matchStrategy, (stats.matchStrategies.get(match.matchStrategy) || 0) + 1);
  });
  stats.matchStrategies.forEach((count, strategy) => {
    console.log(`  ${strategy}: ${count} (${((count / stats.ordersMatched) * 100).toFixed(1)}%)`);
  });

  console.log('\n❌ Skip Reasons:');
  stats.skipReasons.forEach((count, reason) => {
    console.log(`  ${reason}: ${count} (${((count / stats.orderLinesSkipped) * 100).toFixed(1)}%)`);
  });

  console.log('\n💰 Revenue Accuracy:');
  const totalAnalyzed = stats.revenueAccuracy.perfectMatches + stats.revenueAccuracy.minorDifferences + stats.revenueAccuracy.majorDifferences;
  console.log(`  Perfect matches (<$0.01): ${stats.revenueAccuracy.perfectMatches} (${((stats.revenueAccuracy.perfectMatches / totalAnalyzed) * 100).toFixed(1)}%)`);
  console.log(`  Minor differences (<$1.00): ${stats.revenueAccuracy.minorDifferences} (${((stats.revenueAccuracy.minorDifferences / totalAnalyzed) * 100).toFixed(1)}%)`);
  console.log(`  Major differences (>$1.00): ${stats.revenueAccuracy.majorDifferences} (${((stats.revenueAccuracy.majorDifferences / totalAnalyzed) * 100).toFixed(1)}%)`);

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
  const reportPath = '/Users/greghogue/Leora2/scripts/database-investigation/orderline-migration-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats,
    coverage: `${coverage.toFixed(1)}%`,
    success: coverage >= 70,
    orderMatches: orderMatches.map(m => ({
      wellCraftedOrderId: m.wellCraftedOrderId,
      lovableOrderId: m.lovableOrderId,
      strategy: m.matchStrategy,
      confidence: m.confidence
    })),
    skippedOrderLines: skippedOrderLines.map(s => ({
      orderLineId: s.orderLine.id,
      orderId: s.orderLine.orderId,
      reason: s.reason
    }))
  }, null, 2));

  console.log(`📄 Detailed report saved to: ${reportPath}`);
}

// Run migration
migrateOrderLines().catch(console.error);
