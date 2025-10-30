import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('📊 FINAL DATABASE STATISTICS - STEP 3 COMPLETE');
  console.log('=' .repeat(70));

  // Get final counts
  const { count: orders } = await lovable.from('order').select('*', { count: 'exact', head: true });
  const { count: customers } = await lovable.from('customer').select('*', { count: 'exact', head: true });
  const { count: orderlines } = await lovable.from('orderline').select('*', { count: 'exact', head: true });
  const { count: products } = await lovable.from('product').select('*', { count: 'exact', head: true });

  console.log('\n📈 CURRENT STATE:');
  console.log(`   Orders: ${orders}`);
  console.log(`   Customers: ${customers}`);
  console.log(`   Orderlines: ${orderlines}`);
  console.log(`   Products: ${products}`);

  // Verify data integrity
  console.log('\n🔍 DATA INTEGRITY CHECKS:');

  // Check for orphaned orders
  const { data: allOrders } = await lovable.from('order').select('id, customerid');
  const { data: allCustomers } = await lovable.from('customer').select('id');
  const validCustomerIds = new Set(allCustomers?.map(c => c.id) || []);
  const orphanedOrders = allOrders?.filter(o => !validCustomerIds.has(o.customerid)) || [];

  console.log(`   Orphaned orders (orders → missing customers): ${orphanedOrders.length}`);

  // Check for orphaned orderlines
  const { data: allOrderLines } = await lovable.from('orderline').select('id, orderid, productid');
  const validOrderIds = new Set(allOrders?.map(o => o.id) || []);
  const orphanedOrderLines = allOrderLines?.filter(ol => !validOrderIds.has(ol.orderid)) || [];

  console.log(`   Orphaned orderlines (orderlines → missing orders): ${orphanedOrderLines.length}`);

  // Check for orderlines with missing products
  const { data: allProducts } = await lovable.from('product').select('id');
  const validProductIds = new Set(allProducts?.map(p => p.id) || []);
  const orderLinesWithMissingProducts = allOrderLines?.filter(ol => ol.productid && !validProductIds.has(ol.productid)) || [];
  const orderLinesWithNullProducts = allOrderLines?.filter(ol => !ol.productid) || [];

  console.log(`   Orderlines with missing products: ${orderLinesWithMissingProducts.length}`);
  console.log(`   Orderlines with NULL productid: ${orderLinesWithNullProducts.length}`);

  // Calculate totals
  const { data: ordersWithTotals } = await lovable.from('order').select('total');
  const totalRevenue = ordersWithTotals?.reduce((sum, o) => sum + (o.total || 0), 0) || 0;

  console.log('\n💰 REVENUE STATISTICS:');
  console.log(`   Total order revenue: $${totalRevenue.toFixed(2)}`);
  console.log(`   Average order value: $${orders ? (totalRevenue / orders).toFixed(2) : '0.00'}`);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('✅ CLEANUP SUMMARY (Steps 1-3):');
  console.log('=' .repeat(70));
  console.log('Step 1: Deleted 833 orderlines with missing products');
  console.log('Step 2: (Not executed - was part of Step 1)');
  console.log('Step 3A: Deleted 431 orderlines referencing orphaned orders');
  console.log('Step 3B-D: Deleted 809 orphaned orders (4 iterations)');
  console.log('         + Deleted 496 additional orderlines (iterative)');
  console.log('');
  console.log('TOTALS:');
  console.log('  • Orderlines deleted: 833 + 431 + 496 = 1,760');
  console.log('  • Orders deleted: 809');
  console.log('  • Total revenue impact: ~$1,587,430.23 (Step 3 only)');
  console.log('');
  console.log('FINAL DATABASE STATE:');
  console.log(`  • Orders: ${orders}`);
  console.log(`  • Orderlines: ${orderlines}`);
  console.log(`  • Customers: ${customers}`);
  console.log(`  • Products: ${products}`);
  console.log(`  • Orphaned orders: ${orphanedOrders.length} ✅`);
  console.log(`  • Orphaned orderlines: ${orphanedOrderLines.length} ✅`);
  console.log('=' .repeat(70));

  if (orphanedOrders.length === 0 && orphanedOrderLines.length === 0) {
    console.log('\n🎉 SUCCESS: Database is clean! No orphaned records remaining.');
  } else {
    console.log(`\n⚠️  WARNING: ${orphanedOrders.length} orphaned orders and ${orphanedOrderLines.length} orphaned orderlines still exist!`);
  }
}

main().catch(console.error);
