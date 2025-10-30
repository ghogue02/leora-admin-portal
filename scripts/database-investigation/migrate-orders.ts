#!/usr/bin/env ts-node

/**
 * ORDER MIGRATION SCRIPT
 *
 * Migrates orders from Well Crafted to Lovable with customer matching and UUID mapping
 *
 * Tasks:
 * 1. Load Well Crafted orders and customers from CSV
 * 2. Load Lovable customers for matching
 * 3. Match customers by email (exact) or name (fuzzy)
 * 4. Transform and import orders
 * 5. Create UUID mappings for OrderLine migration
 *
 * Expected Results:
 * - ~2,050 new orders imported
 * - Final count ~2,669 in Lovable
 * - 0 orphaned orders (all reference valid customers)
 * - order-uuid-map.json and customer-uuid-map.json created
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
  ordersImported: number;
  ordersSkipped: number;
  customersMatched: number;
  customersUnmatched: number;
  finalOrderCount: number;
}

/**
 * Fuzzy match two strings (for name matching)
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

  return false;
}

/**
 * Load Well Crafted data from CSV
 */
function loadWellCraftedData(): { orders: WellCraftedOrder[], customers: WellCraftedCustomer[] } {
  console.log('📂 Loading Well Crafted data from CSV...');

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
async function matchCustomers(wcCustomers: WellCraftedCustomer[]): Promise<CustomerMapping[]> {
  console.log('\n🔍 Matching customers...');

  // Load Lovable customers
  const { data: lovableCustomers, error } = await lovable
    .from('customer')
    .select('id, name, billingemail');

  if (error) {
    throw new Error(`Failed to load Lovable customers: ${error.message}`);
  }

  console.log(`✅ Loaded ${lovableCustomers?.length || 0} Lovable customers`);

  const mappings: CustomerMapping[] = [];
  let matched = 0;
  let unmatched = 0;

  for (const wcCustomer of wcCustomers) {
    let lovableCustomer: LovableCustomer | undefined;
    let matchType: 'email' | 'name' | 'manual' = 'email';

    // Try email match first (exact)
    if (wcCustomer.billingEmail) {
      lovableCustomer = lovableCustomers?.find(
        (lc: LovableCustomer) => lc.billingemail?.toLowerCase() === wcCustomer.billingEmail.toLowerCase()
      );
    }

    // Try name match if email failed
    if (!lovableCustomer && wcCustomer.name) {
      lovableCustomer = lovableCustomers?.find(
        (lc: LovableCustomer) => fuzzyMatch(lc.name, wcCustomer.name)
      );
      matchType = 'name';
    }

    if (lovableCustomer) {
      mappings.push({
        wellCraftedId: wcCustomer.id,
        lovableId: lovableCustomer.id,
        matchType
      });
      matched++;
    } else {
      unmatched++;
      console.log(`⚠️  Unmatched: ${wcCustomer.name} (${wcCustomer.billingEmail || 'no email'})`);
    }
  }

  console.log(`✅ Matched ${matched} customers`);
  console.log(`⚠️  Unmatched ${unmatched} customers`);

  // Save customer mapping
  fs.writeFileSync(CUSTOMER_MAP_PATH, JSON.stringify(mappings, null, 2));
  console.log(`💾 Customer mapping saved to: ${CUSTOMER_MAP_PATH}`);

  return mappings;
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
    console.error(`Error checking order existence: ${error.message}`);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Transform Well Crafted order to Lovable format
 */
function transformOrder(wcOrder: WellCraftedOrder, lovableCustomerId: string): any {
  // Parse total (remove any non-numeric characters)
  const total = parseFloat(wcOrder.total?.replace(/[^0-9.-]/g, '') || '0');

  return {
    customerid: lovableCustomerId,
    orderedat: wcOrder.orderedAt,
    orderdate: wcOrder.orderedAt, // Same as orderedat
    total: total,
    subtotal: total, // We'll use total as subtotal (no tax/shipping in WC data)
    tax: 0,
    status: wcOrder.status || 'FULFILLED',
    notes: null,
    createdat: wcOrder.createdAt || new Date().toISOString(),
    // Only include updatedat if the field exists in Lovable
    // updatedat: wcOrder.updatedAt || wcOrder.createdAt || new Date().toISOString()
  };
}

/**
 * Import orders in batches
 */
async function importOrders(
  wcOrders: WellCraftedOrder[],
  customerMappings: CustomerMapping[]
): Promise<{ stats: MigrationStats, orderMappings: OrderMapping[] }> {
  console.log('\n🚀 Starting order import...');

  const stats: MigrationStats = {
    ordersImported: 0,
    ordersSkipped: 0,
    customersMatched: customerMappings.length,
    customersUnmatched: 0,
    finalOrderCount: 0
  };

  const orderMappings: OrderMapping[] = [];
  const BATCH_SIZE = 100;

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
        stats.ordersSkipped++;
        console.log(`⏭️  Skipped (no customer): Order ${wcOrder.id}`);
        continue;
      }

      // Check if order already exists
      const total = parseFloat(wcOrder.total?.replace(/[^0-9.-]/g, '') || '0');
      const exists = await orderExists(lovableCustomerId, wcOrder.orderedAt, total);

      if (exists) {
        stats.ordersSkipped++;
        console.log(`⏭️  Skipped (exists): Order ${wcOrder.id}`);
        continue;
      }

      // Transform and add to batch
      const transformedOrder = transformOrder(wcOrder, lovableCustomerId);
      ordersToInsert.push({
        ...transformedOrder,
        _wcOrderId: wcOrder.id // Temporary field for mapping
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
        console.error(`   Details: ${JSON.stringify(error, null, 2)}`);
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

      stats.ordersImported += data?.length || 0;
      console.log(`✅ Imported ${data?.length || 0} orders`);
    } else {
      console.log(`⏭️  No orders to import in this batch`);
    }
  }

  return { stats, orderMappings };
}

/**
 * Main migration function
 */
async function main() {
  console.log('🚀 ORDER MIGRATION STARTING...\n');
  console.log('═'.repeat(60));

  try {
    // Step 1: Load data
    const { orders: wcOrders, customers: wcCustomers } = loadWellCraftedData();

    // Step 2: Match customers
    const customerMappings = await matchCustomers(wcCustomers);

    // Step 3: Get current Lovable order count
    const { count: initialCount, error: countError } = await lovable
      .from('order')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw new Error(`Failed to count orders: ${countError.message}`);
    }

    console.log(`\n📊 Initial Lovable order count: ${initialCount || 0}`);

    // Step 4: Import orders
    const { stats, orderMappings } = await importOrders(wcOrders, customerMappings);

    // Step 5: Verify final count
    const { count: finalCount, error: finalCountError } = await lovable
      .from('order')
      .select('*', { count: 'exact', head: true });

    if (finalCountError) {
      throw new Error(`Failed to count final orders: ${finalCountError.message}`);
    }

    stats.finalOrderCount = finalCount || 0;

    // Step 6: Save order mapping
    fs.writeFileSync(ORDER_MAP_PATH, JSON.stringify(orderMappings, null, 2));
    console.log(`\n💾 Order mapping saved to: ${ORDER_MAP_PATH}`);

    // Step 7: Generate report
    console.log('\n═'.repeat(60));
    console.log('📊 MIGRATION COMPLETE - FINAL REPORT');
    console.log('═'.repeat(60));
    console.log(`\n✅ Orders imported: ${stats.ordersImported}`);
    console.log(`⏭️  Orders skipped (already existed): ${stats.ordersSkipped}`);
    console.log(`👥 Customers matched: ${stats.customersMatched}`);
    console.log(`⚠️  Customers unmatched: ${stats.customersUnmatched}`);
    console.log(`\n📊 Initial order count: ${initialCount || 0}`);
    console.log(`📊 Final order count: ${stats.finalOrderCount}`);
    console.log(`📊 Expected count: ~2,669`);
    console.log(`\n🗺️  Order UUID mappings: ${orderMappings.length}`);
    console.log(`🗺️  Customer UUID mappings: ${customerMappings.length}`);

    // Verify no orphaned orders
    const { data: orphanedOrders, error: orphanError } = await lovable.rpc(
      'sql',
      {
        query: `
          SELECT COUNT(*) as count
          FROM "order" o
          LEFT JOIN customer c ON o.customerid = c.id
          WHERE c.id IS NULL
        `
      }
    );

    if (!orphanError && orphanedOrders) {
      console.log(`\n✅ Orphaned orders: ${orphanedOrders[0]?.count || 0} (should be 0)`);
    }

    console.log('\n✅ ORDER MIGRATION COMPLETE!');
    console.log('📋 Ready for OrderLine migration\n');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
main();
