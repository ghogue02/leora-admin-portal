import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function getCount(table: string): Promise<number> {
  const { count, error } = await lovable
    .from(table)
    .select('*', { count: 'exact', head: true });
  return count || 0;
}

async function findOrphanedOrders(): Promise<any[]> {
  console.log('🔍 Finding orphaned orders...');

  // Get all orders in batches (there might be more than 1000)
  const allOrders: any[] = [];
  let start = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: orders, error } = await lovable
      .from('order')
      .select('id, customerid')
      .range(start, start + batchSize - 1);

    if (error || !orders || orders.length === 0) {
      hasMore = false;
      break;
    }

    allOrders.push(...orders);
    console.log(`Fetched ${allOrders.length} orders so far...`);

    if (orders.length < batchSize) {
      hasMore = false;
    }

    start += batchSize;
  }

  console.log(`Found ${allOrders.length} total orders`);

  // Get all customer IDs in batches
  const allCustomerIds: any[] = [];
  start = 0;
  hasMore = true;

  while (hasMore) {
    const { data: customers, error } = await lovable
      .from('customer')
      .select('id')
      .range(start, start + batchSize - 1);

    if (error || !customers || customers.length === 0) {
      hasMore = false;
      break;
    }

    allCustomerIds.push(...customers);
    console.log(`Fetched ${allCustomerIds.length} customers so far...`);

    if (customers.length < batchSize) {
      hasMore = false;
    }

    start += batchSize;
  }

  const customerIds = new Set(allCustomerIds.map(c => c.id));
  console.log(`Found ${customerIds.size} valid customers`);

  const orphanedOrders = allOrders.filter(order => !customerIds.has(order.customerid));
  console.log(`Found ${orphanedOrders.length} orphaned orders`);

  return orphanedOrders;
}

async function findOrphanedSkus(): Promise<any[]> {
  console.log('🔍 Finding orphaned SKUs...');

  const allSkus: any[] = [];
  let start = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: skus, error } = await lovable
      .from('skus')
      .select('id, productid')
      .range(start, start + batchSize - 1);

    if (error || !skus || skus.length === 0) {
      hasMore = false;
      break;
    }

    allSkus.push(...skus);
    console.log(`Fetched ${allSkus.length} SKUs so far...`);

    if (skus.length < batchSize) {
      hasMore = false;
    }

    start += batchSize;
  }

  console.log(`Found ${allSkus.length} total SKUs`);

  // Get all product IDs
  const allProductIds: any[] = [];
  start = 0;
  hasMore = true;

  while (hasMore) {
    const { data: products, error } = await lovable
      .from('product')
      .select('id')
      .range(start, start + batchSize - 1);

    if (error || !products || products.length === 0) {
      hasMore = false;
      break;
    }

    allProductIds.push(...products);
    console.log(`Fetched ${allProductIds.length} products so far...`);

    if (products.length < batchSize) {
      hasMore = false;
    }

    start += batchSize;
  }

  const productIds = new Set(allProductIds.map(p => p.id));
  console.log(`Found ${productIds.size} valid products`);

  const orphanedSkus = allSkus.filter(sku => !productIds.has(sku.productid));
  console.log(`Found ${orphanedSkus.length} orphaned SKUs`);

  return orphanedSkus;
}

async function deleteInBatches(table: string, records: any[], batchSize: number = 100): Promise<number> {
  let deleted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const ids = batch.map(r => r.id);

    const { error } = await lovable
      .from(table)
      .delete()
      .in('id', ids);

    if (error) {
      console.error(`Error deleting batch ${i / batchSize + 1}:`, error);
      continue;
    }

    deleted += ids.length;
    console.log(`Deleted batch ${i / batchSize + 1}: ${ids.length} records (total: ${deleted}/${records.length})`);
  }

  return deleted;
}

async function getUniqueOrdersWithLines(): Promise<number> {
  console.log('🔍 Counting unique orders with orderlines...');

  const uniqueOrderIds = new Set<string>();
  let start = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: orderlines, error } = await lovable
      .from('orderline')
      .select('orderid')
      .range(start, start + batchSize - 1);

    if (error || !orderlines || orderlines.length === 0) {
      hasMore = false;
      break;
    }

    orderlines.forEach(ol => uniqueOrderIds.add(ol.orderid));

    if (orderlines.length < batchSize) {
      hasMore = false;
    }

    start += batchSize;
  }

  return uniqueOrderIds.size;
}

async function secondCleanup() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧹 SECOND CLEANUP PASS');
  console.log('═══════════════════════════════════════════════════════\n');

  // Get initial state
  const initialState = {
    customers: await getCount('customer'),
    products: await getCount('product'),
    skus: await getCount('skus'),
    orders: await getCount('order'),
    orderlines: await getCount('orderline'),
    ordersWithOrderlines: await getUniqueOrdersWithLines()
  };

  console.log('Initial State:');
  console.log(`  Orders: ${initialState.orders}`);
  console.log(`  Orderlines: ${initialState.orderlines}`);
  console.log(`  Orders with Orderlines: ${initialState.ordersWithOrderlines}`);
  console.log(`  Coverage: ${((initialState.ordersWithOrderlines / initialState.orders) * 100).toFixed(2)}%\n`);

  // Find and delete remaining orphaned orders
  console.log('📊 Deleting Remaining Orphaned Orders\n');
  const orphanedOrders = await findOrphanedOrders();

  if (orphanedOrders.length > 0) {
    const auditPath = path.join(__dirname, 'deleted', 'orphaned-orders-second-cleanup.json');
    fs.writeFileSync(auditPath, JSON.stringify(orphanedOrders, null, 2));
    console.log(`✅ Exported ${orphanedOrders.length} orphaned orders\n`);

    const deletedOrders = await deleteInBatches('order', orphanedOrders, 100);
    console.log(`\n✅ Deleted ${deletedOrders} orphaned orders\n`);
  } else {
    console.log('✅ No orphaned orders found\n');
  }

  // Find and delete orphaned SKUs
  console.log('📊 Deleting Orphaned SKUs\n');
  const orphanedSkus = await findOrphanedSkus();

  if (orphanedSkus.length > 0) {
    const auditPath = path.join(__dirname, 'deleted', 'orphaned-skus-cleanup.json');
    fs.writeFileSync(auditPath, JSON.stringify(orphanedSkus, null, 2));
    console.log(`✅ Exported ${orphanedSkus.length} orphaned SKUs\n`);

    const deletedSkus = await deleteInBatches('skus', orphanedSkus, 100);
    console.log(`\n✅ Deleted ${deletedSkus} orphaned SKUs\n`);
  } else {
    console.log('✅ No orphaned SKUs found\n');
  }

  // Get final state
  const finalState = {
    customers: await getCount('customer'),
    products: await getCount('product'),
    skus: await getCount('skus'),
    orders: await getCount('order'),
    orderlines: await getCount('orderline'),
    ordersWithOrderlines: await getUniqueOrdersWithLines()
  };

  const finalCoverage = (finalState.ordersWithOrderlines / finalState.orders) * 100;

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Final State After Second Cleanup:');
  console.log(`  Customers: ${finalState.customers}`);
  console.log(`  Products: ${finalState.products}`);
  console.log(`  SKUs: ${finalState.skus}`);
  console.log(`  Orders: ${finalState.orders}`);
  console.log(`  Orderlines: ${finalState.orderlines}`);
  console.log(`  Orders with Orderlines: ${finalState.ordersWithOrderlines}`);
  console.log(`  Coverage: ${finalCoverage.toFixed(2)}%`);

  // Verify zero orphans
  console.log('\nVerifying Zero Orphans:');
  const remainingOrphans = await findOrphanedOrders();
  const remainingOrphanedSkus = await findOrphanedSkus();
  console.log(`  Orphaned Orders: ${remainingOrphans.length}`);
  console.log(`  Orphaned SKUs: ${remainingOrphanedSkus.length}`);

  const report = {
    timestamp: new Date().toISOString(),
    secondCleanup: {
      orphanedOrdersDeleted: orphanedOrders.length,
      orphanedSkusDeleted: orphanedSkus.length,
      orderlinesRemovedWithOrphanedOrders: initialState.orderlines - finalState.orderlines
    },
    finalState,
    coverage: {
      current: parseFloat(finalCoverage.toFixed(2)),
      target: 70,
      gap: Math.ceil((70 / 100 * finalState.orders) - finalState.ordersWithOrderlines),
      achieved: finalCoverage >= 70
    },
    integrity: {
      orphanedOrders: remainingOrphans.length,
      orphanedSkus: remainingOrphanedSkus.length,
      perfectIntegrity: remainingOrphans.length === 0 && remainingOrphanedSkus.length === 0
    }
  };

  const reportPath = path.join(__dirname, 'deleted', 'second-cleanup-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Report saved to: ${reportPath}`);
  console.log('═══════════════════════════════════════════════════════\n');
}

secondCleanup()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Second cleanup failed:', error);
    process.exit(1);
  });
