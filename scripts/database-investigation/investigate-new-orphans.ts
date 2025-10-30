import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔍 INVESTIGATING NEW ORPHANED ORDERS');
  console.log('=' .repeat(60));

  // Get current counts
  const { count: orderCount } = await lovable
    .from('order')
    .select('*', { count: 'exact', head: true });

  const { count: customerCount } = await lovable
    .from('customer')
    .select('*', { count: 'exact', head: true });

  const { count: orderLineCount } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Current State:`);
  console.log(`   Orders: ${orderCount}`);
  console.log(`   Customers: ${customerCount}`);
  console.log(`   Orderlines: ${orderLineCount}\n`);

  // Find orphaned orders
  const { data: allOrders } = await lovable
    .from('order')
    .select('id, customerid, createdat, updatedat, ordernumber');

  const { data: allCustomers } = await lovable
    .from('customer')
    .select('id');

  const validCustomerIds = new Set(allCustomers?.map(c => c.id) || []);
  const orphanedOrders = allOrders?.filter(o => !validCustomerIds.has(o.customerid)) || [];

  console.log(`🚨 Orphaned Orders: ${orphanedOrders.length}\n`);

  // Sample some orphaned orders
  console.log(`📋 Sample orphaned orders (first 10):`);
  orphanedOrders.slice(0, 10).forEach((order, idx) => {
    console.log(`\n${idx + 1}. Order: ${order.ordernumber || order.id.substring(0, 8)}`);
    console.log(`   Customer ID: ${order.customerid}`);
    console.log(`   Created: ${order.createdat}`);
    console.log(`   Updated: ${order.updatedat}`);
  });

  // Check if these orders have orderlines
  console.log(`\n\n🔍 Checking if orphaned orders have orderlines...`);

  const orphanedOrderIds = orphanedOrders.map(o => o.id);
  let totalOrderLines = 0;

  const checkBatchSize = 100;
  for (let i = 0; i < orphanedOrderIds.length; i += checkBatchSize) {
    const batch = orphanedOrderIds.slice(i, i + checkBatchSize);

    const { data: relatedOrderLines } = await lovable
      .from('orderline')
      .select('id')
      .in('orderid', batch);

    if (relatedOrderLines && relatedOrderLines.length > 0) {
      totalOrderLines += relatedOrderLines.length;
    }
  }

  console.log(`   Orderlines referencing orphaned orders: ${totalOrderLines}`);

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total orders: ${orderCount}`);
  console.log(`Total customers: ${customerCount}`);
  console.log(`Total orderlines: ${orderLineCount}`);
  console.log(`Orphaned orders (orders → missing customers): ${orphanedOrders.length}`);
  console.log(`Orderlines → orphaned orders: ${totalOrderLines}`);
  console.log(`\n💡 CONCLUSION:`);
  console.log(`   The 614 orphaned orders likely existed BEFORE the initial cleanup`);
  console.log(`   The original 801 count may have been incorrect or data changed`);
  console.log(`   Need to delete these ${totalOrderLines} orderlines first (if any)`);
  console.log(`   Then delete the ${orphanedOrders.length} orphaned orders`);
  console.log('=' .repeat(60));
}

main().catch(console.error);
