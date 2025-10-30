#!/usr/bin/env ts-node

/**
 * VERIFY ORDER MIGRATION
 * Check the actual state of orders in Lovable database
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

async function main() {
  console.log('🔍 VERIFYING ORDER MIGRATION\n');

  // Get total order count
  const { count: totalOrders, error: countError } = await lovable
    .from('order')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Error counting orders:', countError);
    return;
  }

  console.log(`📊 Total orders in Lovable: ${totalOrders}`);

  // Check for orphaned orders
  const { data: allOrders } = await lovable
    .from('order')
    .select('id, customerid, orderdate, total');

  if (!allOrders) {
    console.error('Failed to fetch orders');
    return;
  }

  // Get all customers
  const { data: customers } = await lovable
    .from('customer')
    .select('id');

  const customerIds = new Set(customers?.map(c => c.id) || []);
  const orphanedOrders = allOrders.filter(o => !customerIds.has(o.customerid));

  console.log(`✅ Valid orders (with customers): ${allOrders.length - orphanedOrders.length}`);
  console.log(`⚠️  Orphaned orders (no customer): ${orphanedOrders.length}`);

  if (orphanedOrders.length > 0) {
    console.log('\n🔍 Sample orphaned orders:');
    orphanedOrders.slice(0, 5).forEach(o => {
      console.log(`  - Order ${o.id.substring(0, 8)}... for customer ${o.customerid.substring(0, 8)}...`);
    });
  }

  // Check mapping files
  const orderMapPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/order-uuid-map.json';
  const customerMapPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/customer-uuid-map.json';

  if (fs.existsSync(orderMapPath)) {
    const orderMap = JSON.parse(fs.readFileSync(orderMapPath, 'utf-8'));
    console.log(`\n🗺️  Order UUID mappings created: ${orderMap.length}`);
  }

  if (fs.existsSync(customerMapPath)) {
    const customerMap = JSON.parse(fs.readFileSync(customerMapPath, 'utf-8'));
    console.log(`🗺️  Customer UUID mappings created: ${customerMap.length}`);
  }

  // Get date range of orders
  const orderDates = allOrders.map(o => new Date(o.orderdate)).sort((a, b) => a.getTime() - b.getTime());
  if (orderDates.length > 0) {
    console.log(`\n📅 Order date range:`);
    console.log(`   Oldest: ${orderDates[0].toISOString().split('T')[0]}`);
    console.log(`   Newest: ${orderDates[orderDates.length - 1].toISOString().split('T')[0]}`);
  }

  console.log('\n✅ VERIFICATION COMPLETE\n');
}

main();
