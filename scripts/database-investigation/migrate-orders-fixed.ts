#!/usr/bin/env ts-node

/**
 * FIXED ORDER MIGRATION SCRIPT
 *
 * Fixes the pagination bug that only loaded 1,000 customers instead of all 4,947
 * Then re-migrates ALL orders with complete customer matching
 *
 * Key Fixes:
 * 1. Load ALL Lovable customers with pagination (not just 1,000)
 * 2. Use Levenshtein distance for better fuzzy name matching
 * 3. Delete 486 orphaned orders from previous run
 * 4. Import all orders with complete customer mapping
 * 5. Verify 0 orphaned orders at the end
 *
 * Expected Results:
 * - 4,947 Lovable customers loaded (not 1,000!)
 * - ~2,050 new orders imported
 * - 0 orphaned orders (was 486)
 * - 90%+ customer match rate (was 23%)
 * - Complete UUID mappings for OrderLine migration
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Lovable database credentials
const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

// Paths
const BASE_PATH = '/Users/greghogue/Leora2/exports/wellcrafted-manual';
const WC_ORDERS_PATH = path.join(BASE_PATH, 'Order.csv');
const WC_CUSTOMERS_PATH = path.join(BASE_PATH, 'Customer.csv');
const CUSTOMER_MAP_PATH = path.join(BASE_PATH, 'customer-uuid-map.json');
const ORDER_MAP_PATH = path.join(BASE_PATH, 'order-uuid-map.json');

interface WellCraftedOrder {
  id: string;
  tenantId: string;
  customerId: string;
  status: string;
  orderedAt: string;
  fulfilledAt?: string;
  deliveredAt?: string;
  total: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface WellCraftedCustomer {
  id: string;
  tenantId: string;
  name: string;
  billingEmail: string;
}

interface LovableCustomer {
  id: string;
  name: string;
  billingemail: string;
}

interface CustomerMapping {
  wellCraftedId: string;
  lovableId: string;
  matchType: 'email' | 'name' | 'manual';
}

interface OrderMapping {
  wellCraftedId: string;
  lovableId: string;
}

interface MigrationStats {
  lovableCustomersLoaded: number;
  wellCraftedCustomersLoaded: number;
  wellCraftedOrdersLoaded: number;
  customersMatched: number;
  customersUnmatched: number;
  orphanedOrdersDeleted: number;
  ordersImported: number;
  ordersSkippedExisting: number;
  ordersSkippedNoCustomer: number;
  finalOrderCount: number;
  orphanedOrdersFinal: number;
}

/**
 * FIXED: Load ALL Lovable customers with pagination
 * This was the critical bug - previous version only loaded 1,000!
 */
async function loadAllLovableCustomers(): Promise<LovableCustomer[]> {
  console.log('🔄 Loading ALL Lovable customers with pagination...');

  const allCustomers: LovableCustomer[] = [];
  let from = 0;
  const pageSize = 1000;
  let pageNum = 1;

  while (true) {
    console.log(`   Loading page ${pageNum} (${from} to ${from + pageSize - 1})...`);

    const { data, error } = await lovable
      .from('customer')
      .select('id, name, billingemail')
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to load Lovable customers: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break; // No more data
    }

    allCustomers.push(...data);
    console.log(`   ✅ Loaded ${data.length} customers (total: ${allCustomers.length})`);

    if (data.length < pageSize) {
      break; // Last page
    }

    from += pageSize;
    pageNum++;
  }

  console.log(`✅ Loaded ALL ${allCustomers.length} Lovable customers (expected: 4,947)`);
  return allCustomers;
}

/**
 * Levenshtein distance for better fuzzy matching
 */
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

/**
 * Fuzzy match with Levenshtein distance
 */
function fuzzyMatch(str1: string, str2: string): boolean {
  if (!str1 || !str2) return false;

  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  // Exact match
  if (s1 === s2) return true;

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return true;

  // Levenshtein distance threshold (allow 2 character differences)
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const similarity = 1 - (distance / maxLength);

  return similarity >= 0.85; // 85% similar
}

/**
 * Load Well Crafted data from CSV
 */
function loadWellCraftedData(): { orders: WellCraftedOrder[], customers: WellCraftedCustomer[] } {
  console.log('\n📂 Loading Well Crafted data from CSV...');

  const ordersCSV = fs.readFileSync(WC_ORDERS_PATH, 'utf-8');
  const customersCSV = fs.readFileSync(WC_CUSTOMERS_PATH, 'utf-8');

  const orders = parse(ordersCSV, { columns: true, skip_empty_lines: true }) as WellCraftedOrder[];
  const customers = parse(customersCSV, { columns: true, skip_empty_lines: true }) as WellCraftedCustomer[];

  console.log(`✅ Loaded ${orders.length} orders`);
  console.log(`✅ Loaded ${customers.length} customers`);

  return { orders, customers };
}

/**
 * Match customers between Well Crafted and Lovable
 */
async function matchCustomers(
  wcCustomers: WellCraftedCustomer[],
  lovableCustomers: LovableCustomer[]
): Promise<CustomerMapping[]> {
  console.log('\n🔍 Matching customers with fuzzy name matching...');

  const mappings: CustomerMapping[] = [];
  let emailMatched = 0;
  let nameMatched = 0;
  let unmatched = 0;

  for (const wcCustomer of wcCustomers) {
    let lovableCustomer: LovableCustomer | undefined;
    let matchType: 'email' | 'name' | 'manual' = 'email';

    // Try email match first (exact)
    if (wcCustomer.billingEmail) {
      lovableCustomer = lovableCustomers.find(
        (lc: LovableCustomer) => lc.billingemail?.toLowerCase() === wcCustomer.billingEmail.toLowerCase()
      );

      if (lovableCustomer) {
        emailMatched++;
      }
    }

    // Try name match with Levenshtein distance if email failed
    if (!lovableCustomer && wcCustomer.name) {
      lovableCustomer = lovableCustomers.find(
        (lc: LovableCustomer) => fuzzyMatch(lc.name, wcCustomer.name)
      );

      if (lovableCustomer) {
        matchType = 'name';
        nameMatched++;
      }
    }

    if (lovableCustomer) {
      mappings.push({
        wellCraftedId: wcCustomer.id,
        lovableId: lovableCustomer.id,
        matchType
      });
    } else {
      unmatched++;
      if (unmatched <= 10) {
        console.log(`⚠️  Unmatched: ${wcCustomer.name} (${wcCustomer.billingEmail || 'no email'})`);
      }
    }
  }

  console.log(`✅ Email matches: ${emailMatched}`);
  console.log(`✅ Name matches: ${nameMatched}`);
  console.log(`✅ Total matched: ${mappings.length}`);
  console.log(`⚠️  Unmatched: ${unmatched}`);
  console.log(`📊 Match rate: ${((mappings.length / wcCustomers.length) * 100).toFixed(1)}%`);

  // Save customer mapping
  fs.writeFileSync(CUSTOMER_MAP_PATH, JSON.stringify(mappings, null, 2));
  console.log(`💾 Customer mapping saved to: ${CUSTOMER_MAP_PATH}`);

  return mappings;
}

/**
 * Delete orphaned orders from previous migration
 */
async function deleteOrphanedOrders(): Promise<number> {
  console.log('\n🗑️  Deleting orphaned orders from previous migration...');

  // Find orphaned orders
  const { data: orphanedOrders, error: findError } = await lovable
    .from('order')
    .select('id, customerid')
    .is('customerid', null)
    .limit(1000);

  if (findError) {
    console.log(`   Note: Could not find orphaned orders with null customerid: ${findError.message}`);
  }

  const nullCustomerIds = orphanedOrders?.length || 0;
  console.log(`   Found ${nullCustomerIds} orders with null customerid`);

  // Also check for orders referencing non-existent customers
  const { data: allOrders } = await lovable
    .from('order')
    .select('id, customerid');

  const { data: allCustomers } = await lovable
    .from('customer')
    .select('id');

  const customerIdSet = new Set((allCustomers || []).map(c => c.id));
  const orphanedByReference = (allOrders || []).filter(o => o.customerid && !customerIdSet.has(o.customerid));

  console.log(`   Found ${orphanedByReference.length} orders referencing non-existent customers`);

  // Delete both types of orphaned orders
  let totalDeleted = 0;

  // Delete null customer orders
  if (nullCustomerIds > 0) {
    const { error: deleteError1 } = await lovable
      .from('order')
      .delete()
      .is('customerid', null);

    if (!deleteError1) {
      totalDeleted += nullCustomerIds;
      console.log(`   ✅ Deleted ${nullCustomerIds} orders with null customerid`);
    }
  }

  // Delete orphaned by reference orders in batches
  if (orphanedByReference.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < orphanedByReference.length; i += batchSize) {
      const batch = orphanedByReference.slice(i, i + batchSize);
      const ids = batch.map(o => o.id);

      const { error: deleteError2 } = await lovable
        .from('order')
        .delete()
        .in('id', ids);

      if (!deleteError2) {
        totalDeleted += ids.length;
      }
    }
    console.log(`   ✅ Deleted ${orphanedByReference.length} orders referencing non-existent customers`);
  }

  console.log(`✅ Total orphaned orders deleted: ${totalDeleted}`);
  return totalDeleted;
}

/**
 * Check if order already exists in Lovable
 */
async function orderExists(customerId: string, orderDate: string, total: number): Promise<boolean> {
  const { data, error } = await lovable
    .from('order')
    .select('id')
    .eq('customerid', customerId)
    .eq('orderdate', orderDate)
    .eq('total', total)
    .limit(1);

  if (error) {
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Transform Well Crafted order to Lovable format
 */
function transformOrder(wcOrder: WellCraftedOrder, lovableCustomerId: string): any {
  const total = parseFloat(wcOrder.total?.replace(/[^0-9.-]/g, '') || '0');

  return {
    customerid: lovableCustomerId,
    orderedat: wcOrder.orderedAt,
    orderdate: wcOrder.orderedAt,
    total: total,
    subtotal: total,
    tax: 0,
    status: wcOrder.status || 'FULFILLED',
    notes: null,
    createdat: wcOrder.createdAt || new Date().toISOString()
  };
}

/**
 * Import orders in batches
 */
async function importOrders(
  wcOrders: WellCraftedOrder[],
  customerMappings: CustomerMapping[]
): Promise<{ ordersImported: number, ordersSkippedExisting: number, ordersSkippedNoCustomer: number, orderMappings: OrderMapping[] }> {
  console.log('\n🚀 Starting order import...');

  const orderMappings: OrderMapping[] = [];
  const BATCH_SIZE = 100;
  let ordersImported = 0;
  let ordersSkippedExisting = 0;
  let ordersSkippedNoCustomer = 0;

  // Create customer mapping lookup
  const customerMap = new Map(
    customerMappings.map(cm => [cm.wellCraftedId, cm.lovableId])
  );

  for (let i = 0; i < wcOrders.length; i += BATCH_SIZE) {
    const batch = wcOrders.slice(i, i + BATCH_SIZE);
    const ordersToInsert: any[] = [];

    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(wcOrders.length / BATCH_SIZE)} (${batch.length} orders)`);

    for (const wcOrder of batch) {
      // Check if customer exists
      const lovableCustomerId = customerMap.get(wcOrder.customerId);

      if (!lovableCustomerId) {
        ordersSkippedNoCustomer++;
        continue;
      }

      // Check if order already exists
      const total = parseFloat(wcOrder.total?.replace(/[^0-9.-]/g, '') || '0');
      const exists = await orderExists(lovableCustomerId, wcOrder.orderedAt, total);

      if (exists) {
        ordersSkippedExisting++;
        continue;
      }

      // Transform and add to batch
      const transformedOrder = transformOrder(wcOrder, lovableCustomerId);
      ordersToInsert.push({
        ...transformedOrder,
        _wcOrderId: wcOrder.id
      });
    }

    // Insert batch
    if (ordersToInsert.length > 0) {
      const { data, error } = await lovable
        .from('order')
        .insert(ordersToInsert.map(o => {
          const { _wcOrderId, ...order } = o;
          return order;
        }))
        .select('id');

      if (error) {
        console.error(`❌ Error importing batch: ${error.message}`);
        continue;
      }

      // Create order mappings
      if (data) {
        for (let j = 0; j < data.length; j++) {
          orderMappings.push({
            wellCraftedId: ordersToInsert[j]._wcOrderId,
            lovableId: data[j].id
          });
        }
      }

      ordersImported += data?.length || 0;
      console.log(`✅ Imported ${data?.length || 0} orders`);
    }
  }

  return { ordersImported, ordersSkippedExisting, ordersSkippedNoCustomer, orderMappings };
}

/**
 * Verify no orphaned orders remain
 */
async function verifyNoOrphans(): Promise<number> {
  console.log('\n🔍 Verifying no orphaned orders...');

  const { data: allOrders } = await lovable
    .from('order')
    .select('id, customerid');

  const { data: allCustomers } = await lovable
    .from('customer')
    .select('id');

  const customerIdSet = new Set((allCustomers || []).map(c => c.id));
  const orphaned = (allOrders || []).filter(o => !o.customerid || !customerIdSet.has(o.customerid));

  if (orphaned.length === 0) {
    console.log('✅ No orphaned orders found!');
  } else {
    console.log(`⚠️  Found ${orphaned.length} orphaned orders (should be 0!)`);
  }

  return orphaned.length;
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 FIXED ORDER MIGRATION STARTING...\n');
  console.log('═'.repeat(70));

  const stats: MigrationStats = {
    lovableCustomersLoaded: 0,
    wellCraftedCustomersLoaded: 0,
    wellCraftedOrdersLoaded: 0,
    customersMatched: 0,
    customersUnmatched: 0,
    orphanedOrdersDeleted: 0,
    ordersImported: 0,
    ordersSkippedExisting: 0,
    ordersSkippedNoCustomer: 0,
    finalOrderCount: 0,
    orphanedOrdersFinal: 0
  };

  try {
    // Step 1: Load ALL Lovable customers with pagination (FIXED!)
    const lovableCustomers = await loadAllLovableCustomers();
    stats.lovableCustomersLoaded = lovableCustomers.length;

    // Step 2: Load Well Crafted data
    const { orders: wcOrders, customers: wcCustomers } = loadWellCraftedData();
    stats.wellCraftedCustomersLoaded = wcCustomers.length;
    stats.wellCraftedOrdersLoaded = wcOrders.length;

    // Step 3: Match customers with complete data
    const customerMappings = await matchCustomers(wcCustomers, lovableCustomers);
    stats.customersMatched = customerMappings.length;
    stats.customersUnmatched = wcCustomers.length - customerMappings.length;

    // Step 4: Delete orphaned orders from previous migration
    stats.orphanedOrdersDeleted = await deleteOrphanedOrders();

    // Step 5: Get current order count
    const { count: initialCount } = await lovable
      .from('order')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Initial order count (after cleanup): ${initialCount || 0}`);

    // Step 6: Import ALL orders
    const importResult = await importOrders(wcOrders, customerMappings);
    stats.ordersImported = importResult.ordersImported;
    stats.ordersSkippedExisting = importResult.ordersSkippedExisting;
    stats.ordersSkippedNoCustomer = importResult.ordersSkippedNoCustomer;

    // Step 7: Verify final counts
    const { count: finalCount } = await lovable
      .from('order')
      .select('*', { count: 'exact', head: true });

    stats.finalOrderCount = finalCount || 0;
    stats.orphanedOrdersFinal = await verifyNoOrphans();

    // Step 8: Save order mapping
    fs.writeFileSync(ORDER_MAP_PATH, JSON.stringify(importResult.orderMappings, null, 2));
    console.log(`\n💾 Order mapping saved to: ${ORDER_MAP_PATH}`);
    console.log(`💾 Customer mapping saved to: ${CUSTOMER_MAP_PATH}`);

    // Step 9: Generate final report
    console.log('\n═'.repeat(70));
    console.log('📊 MIGRATION COMPLETE - FINAL REPORT');
    console.log('═'.repeat(70));

    console.log('\n🔧 FIX APPLIED:');
    console.log(`✅ Lovable customers loaded: ${stats.lovableCustomersLoaded} (was 1,000, now ALL!)`);
    console.log(`✅ Match rate: ${((stats.customersMatched / stats.wellCraftedCustomersLoaded) * 100).toFixed(1)}% (was 23.6%)`);

    console.log('\n📥 SOURCE DATA:');
    console.log(`   Well Crafted customers: ${stats.wellCraftedCustomersLoaded}`);
    console.log(`   Well Crafted orders: ${stats.wellCraftedOrdersLoaded}`);

    console.log('\n🔗 CUSTOMER MATCHING:');
    console.log(`   Customers matched: ${stats.customersMatched}`);
    console.log(`   Customers unmatched: ${stats.customersUnmatched}`);
    console.log(`   Match rate: ${((stats.customersMatched / stats.wellCraftedCustomersLoaded) * 100).toFixed(1)}%`);

    console.log('\n🗑️  CLEANUP:');
    console.log(`   Orphaned orders deleted: ${stats.orphanedOrdersDeleted}`);

    console.log('\n📦 ORDER IMPORT:');
    console.log(`   Orders imported: ${stats.ordersImported}`);
    console.log(`   Orders skipped (existed): ${stats.ordersSkippedExisting}`);
    console.log(`   Orders skipped (no customer): ${stats.ordersSkippedNoCustomer}`);

    console.log('\n📊 FINAL COUNTS:');
    console.log(`   Initial order count: ${initialCount || 0}`);
    console.log(`   Final order count: ${stats.finalOrderCount}`);
    console.log(`   Orphaned orders: ${stats.orphanedOrdersFinal} (should be 0!)`);

    console.log('\n🗺️  UUID MAPPINGS:');
    console.log(`   Order mappings: ${importResult.orderMappings.length}`);
    console.log(`   Customer mappings: ${customerMappings.length}`);

    // Success criteria
    console.log('\n✅ SUCCESS CRITERIA:');
    console.log(`   ${stats.lovableCustomersLoaded >= 4900 ? '✅' : '❌'} ALL customers loaded: ${stats.lovableCustomersLoaded} / 4,947`);
    console.log(`   ${stats.orphanedOrdersFinal === 0 ? '✅' : '❌'} Zero orphaned orders: ${stats.orphanedOrdersFinal}`);
    console.log(`   ${(stats.customersMatched / stats.wellCraftedCustomersLoaded) >= 0.9 ? '✅' : '❌'} 90%+ match rate: ${((stats.customersMatched / stats.wellCraftedCustomersLoaded) * 100).toFixed(1)}%`);
    console.log(`   ${importResult.orderMappings.length >= 2000 ? '✅' : '❌'} Order mappings created: ${importResult.orderMappings.length}`);

    if (stats.orphanedOrdersFinal === 0 && stats.lovableCustomersLoaded >= 4900) {
      console.log('\n🎉 MIGRATION SUCCESSFUL! Ready for OrderLine migration.');
    } else {
      console.log('\n⚠️  Migration completed with warnings. Review above.');
    }

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
main();
