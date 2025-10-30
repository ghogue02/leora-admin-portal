import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Quick integrity verification script
 * Run this anytime to verify database integrity
 */

async function getCount(table: string): Promise<number> {
  const { count } = await lovable
    .from(table)
    .select('*', { count: 'exact', head: true });
  return count || 0;
}

async function checkOrphanedOrders(): Promise<number> {
  console.log('Checking orphaned orders...');

  const allOrders: any[] = [];
  const allCustomerIds: any[] = [];
  let start = 0;
  const batchSize = 1000;

  // Fetch all orders
  while (true) {
    const { data: orders } = await lovable
      .from('order')
      .select('id, customerid')
      .range(start, start + batchSize - 1);

    if (!orders || orders.length === 0) break;
    allOrders.push(...orders);
    if (orders.length < batchSize) break;
    start += batchSize;
  }

  // Fetch all customers
  start = 0;
  while (true) {
    const { data: customers } = await lovable
      .from('customer')
      .select('id')
      .range(start, start + batchSize - 1);

    if (!customers || customers.length === 0) break;
    allCustomerIds.push(...customers);
    if (customers.length < batchSize) break;
    start += batchSize;
  }

  const customerIds = new Set(allCustomerIds.map(c => c.id));
  const orphaned = allOrders.filter(o => !customerIds.has(o.customerid));

  return orphaned.length;
}

async function checkOrphanedOrderlines(): Promise<number> {
  console.log('Checking orphaned orderlines...');

  const allOrderlines: any[] = [];
  const allOrderIds: any[] = [];
  let start = 0;
  const batchSize = 1000;

  // Fetch all orderlines
  while (true) {
    const { data: orderlines } = await lovable
      .from('orderline')
      .select('id, orderid')
      .range(start, start + batchSize - 1);

    if (!orderlines || orderlines.length === 0) break;
    allOrderlines.push(...orderlines);
    if (orderlines.length < batchSize) break;
    start += batchSize;
  }

  // Fetch all orders
  start = 0;
  while (true) {
    const { data: orders } = await lovable
      .from('order')
      .select('id')
      .range(start, start + batchSize - 1);

    if (!orders || orders.length === 0) break;
    allOrderIds.push(...orders);
    if (orders.length < batchSize) break;
    start += batchSize;
  }

  const orderIds = new Set(allOrderIds.map(o => o.id));
  const orphaned = allOrderlines.filter(ol => !orderIds.has(ol.orderid));

  return orphaned.length;
}

async function checkOrphanedSkus(): Promise<number> {
  console.log('Checking orphaned SKUs...');

  const allSkus: any[] = [];
  const allProductIds: any[] = [];
  let start = 0;
  const batchSize = 1000;

  // Fetch all SKUs
  while (true) {
    const { data: skus } = await lovable
      .from('skus')
      .select('id, productid')
      .range(start, start + batchSize - 1);

    if (!skus || skus.length === 0) break;
    allSkus.push(...skus);
    if (skus.length < batchSize) break;
    start += batchSize;
  }

  // Fetch all products
  start = 0;
  while (true) {
    const { data: products } = await lovable
      .from('product')
      .select('id')
      .range(start, start + batchSize - 1);

    if (!products || products.length === 0) break;
    allProductIds.push(...products);
    if (products.length < batchSize) break;
    start += batchSize;
  }

  const productIds = new Set(allProductIds.map(p => p.id));
  const orphaned = allSkus.filter(s => !productIds.has(s.productid));

  return orphaned.length;
}

async function getCoverage(): Promise<{ total: number; withLines: number; coverage: number }> {
  console.log('Calculating coverage...');

  const totalOrders = await getCount('order');

  const uniqueOrderIds = new Set<string>();
  let start = 0;
  const batchSize = 1000;

  while (true) {
    const { data: orderlines } = await lovable
      .from('orderline')
      .select('orderid')
      .range(start, start + batchSize - 1);

    if (!orderlines || orderlines.length === 0) break;
    orderlines.forEach(ol => uniqueOrderIds.add(ol.orderid));
    if (orderlines.length < batchSize) break;
    start += batchSize;
  }

  const ordersWithLines = uniqueOrderIds.size;
  const coverage = (ordersWithLines / totalOrders) * 100;

  return { total: totalOrders, withLines: ordersWithLines, coverage };
}

async function verifyIntegrity() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔍 DATABASE INTEGRITY VERIFICATION');
  console.log('═══════════════════════════════════════════════════════\n');

  const startTime = Date.now();

  // Record counts
  console.log('📊 Record Counts:');
  const counts = {
    customers: await getCount('customer'),
    products: await getCount('product'),
    skus: await getCount('skus'),
    orders: await getCount('order'),
    orderlines: await getCount('orderline')
  };

  console.log(`  Customers:  ${counts.customers.toLocaleString()}`);
  console.log(`  Products:   ${counts.products.toLocaleString()}`);
  console.log(`  SKUs:       ${counts.skus.toLocaleString()}`);
  console.log(`  Orders:     ${counts.orders.toLocaleString()}`);
  console.log(`  Orderlines: ${counts.orderlines.toLocaleString()}\n`);

  // Check for orphaned records
  console.log('🔍 Orphaned Records Check:');
  const orphanedOrders = await checkOrphanedOrders();
  const orphanedOrderlines = await checkOrphanedOrderlines();
  const orphanedSkus = await checkOrphanedSkus();

  console.log(`  Orphaned Orders:     ${orphanedOrders} ${orphanedOrders === 0 ? '✅' : '❌'}`);
  console.log(`  Orphaned Orderlines: ${orphanedOrderlines} ${orphanedOrderlines === 0 ? '✅' : '❌'}`);
  console.log(`  Orphaned SKUs:       ${orphanedSkus} ${orphanedSkus === 0 ? '✅' : '❌'}\n`);

  // Calculate coverage
  console.log('📊 Coverage Analysis:');
  const coverage = await getCoverage();
  console.log(`  Total Orders:          ${coverage.total.toLocaleString()}`);
  console.log(`  Orders with Lines:     ${coverage.withLines.toLocaleString()}`);
  console.log(`  Orders without Lines:  ${(coverage.total - coverage.withLines).toLocaleString()}`);
  console.log(`  Coverage:              ${coverage.coverage.toFixed(2)}%`);
  console.log(`  Target:                70.00%`);
  console.log(`  Gap:                   ${coverage.coverage >= 70 ? '✅ Target met!' : `❌ ${(70 - coverage.coverage).toFixed(2)}% short`}\n`);

  // Overall status
  const perfectIntegrity = orphanedOrders === 0 && orphanedOrderlines === 0 && orphanedSkus === 0;
  const targetCoverage = coverage.coverage >= 70;

  console.log('═══════════════════════════════════════════════════════');
  console.log('📋 VERIFICATION RESULTS:');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Data Integrity:   ${perfectIntegrity ? '✅ PERFECT' : '❌ ISSUES FOUND'}`);
  console.log(`  FK Constraints:   ${perfectIntegrity ? '✅ READY' : '❌ NOT READY'}`);
  console.log(`  70% Coverage:     ${targetCoverage ? '✅ ACHIEVED' : '⚠️  NOT ACHIEVED'}`);
  console.log(`  Production Ready: ${perfectIntegrity ? '✅ YES' : '❌ NO'}`);
  console.log('═══════════════════════════════════════════════════════');

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n⏱️  Verification completed in ${duration}s\n`);

  if (!perfectIntegrity) {
    console.log('⚠️  WARNING: Orphaned records detected!');
    console.log('   Run cleanup scripts before enabling FK constraints.\n');
    process.exit(1);
  }

  if (!targetCoverage) {
    console.log('ℹ️  INFO: Coverage below 70% target');
    console.log('   Database is production-ready but may need more data.\n');
  }

  process.exit(0);
}

verifyIntegrity().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
