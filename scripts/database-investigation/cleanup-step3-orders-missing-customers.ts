import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Database credentials
const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Order {
  id: string;
  customerid: string;
  subtotal: number;
  tax: number;
  total: number;
  orderdate: string;
}

interface Customer {
  id: string;
}

interface OrderLine {
  id: string;
  orderid: string;
}

interface DeletionStats {
  totalDeleted: number;
  ordersWithRevenue: number;
  ordersWithZeroTotal: number;
  totalRevenueLost: number;
  beforeOrderCount: number;
  afterOrderCount: number;
  beforeOrderLineCount: number;
  afterOrderLineCount: number;
  timestamp: string;
  orphanedOrdersExported: string;
}

async function main() {
  console.log('🧹 CLEANUP STEP 3: Delete Orphaned Orders');
  console.log('=' .repeat(60));
  console.log('Target: 801 orders referencing non-existent customers\n');

  // Step 1: Pre-deletion verification
  console.log('📊 Step 1: Pre-deletion verification...');

  const { data: allOrders, error: ordersError } = await lovable
    .from('order')
    .select('id, customerid, subtotal, tax, total, orderdate');

  if (ordersError) {
    throw new Error(`Failed to fetch orders: ${ordersError.message}`);
  }

  const beforeOrderCount = allOrders?.length || 0;
  console.log(`   Total orders before cleanup: ${beforeOrderCount}`);

  const { data: allCustomers, error: customersError } = await lovable
    .from('customer')
    .select('id');

  if (customersError) {
    throw new Error(`Failed to fetch customers: ${customersError.message}`);
  }

  const validCustomerIds = new Set(allCustomers?.map((c: Customer) => c.id) || []);
  console.log(`   Valid customer IDs: ${validCustomerIds.size}`);

  const orphanedOrders = allOrders?.filter((o: Order) => !validCustomerIds.has(o.customerid)) || [];

  console.log(`   Orphaned orders found: ${orphanedOrders.length}`);

  if (orphanedOrders.length !== 801) {
    throw new Error(`❌ VERIFICATION FAILED: Expected 801 orphaned orders, found ${orphanedOrders.length}`);
  }
  console.log('   ✅ Count verification passed: 801 orphaned orders confirmed\n');

  // Step 2: CRITICAL - Check cascade impact
  console.log('🔍 Step 2: Cascade impact verification...');

  const orphanedOrderIds = orphanedOrders.map((o: Order) => o.id);

  // Check in batches to avoid query size limits
  let totalRelatedOrderLines = 0;
  const checkBatchSize = 100;

  for (let i = 0; i < orphanedOrderIds.length; i += checkBatchSize) {
    const batch = orphanedOrderIds.slice(i, i + checkBatchSize);

    const { data: relatedOrderLines, error: orderLinesError } = await lovable
      .from('orderline')
      .select('id, orderid')
      .in('orderid', batch);

    if (orderLinesError) {
      throw new Error(`Failed to check orderlines batch ${i}: ${orderLinesError.message}`);
    }

    if (relatedOrderLines && relatedOrderLines.length > 0) {
      totalRelatedOrderLines += relatedOrderLines.length;
    }
  }

  if (totalRelatedOrderLines > 0) {
    console.error(`❌ ABORT: Found ${totalRelatedOrderLines} orderlines referencing these orders!`);
    console.error('   This should not happen after Steps 1-2. Investigation needed.');
    throw new Error('Cascade safety check failed - orderlines still exist');
  }
  console.log('   ✅ No orderlines reference these orders (safe to delete)\n');

  // Get orderline count before deletion
  const { count: beforeOrderLineCount, error: beforeCountError } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  if (beforeCountError) {
    throw new Error(`Failed to count orderlines: ${beforeCountError.message}`);
  }

  console.log(`   Orderlines before deletion: ${beforeOrderLineCount}\n`);

  // Step 3: Calculate business impact
  console.log('💰 Step 3: Calculating business impact...');

  let ordersWithRevenue = 0;
  let ordersWithZeroTotal = 0;
  let totalRevenueLost = 0;

  orphanedOrders.forEach((order: Order) => {
    const orderTotal = order.total || 0;
    if (orderTotal > 0) {
      ordersWithRevenue++;
      totalRevenueLost += orderTotal;
    } else {
      ordersWithZeroTotal++;
    }
  });

  console.log(`   Orders with revenue: ${ordersWithRevenue}`);
  console.log(`   Orders with $0 total: ${ordersWithZeroTotal}`);
  console.log(`   Total revenue of deleted orders: $${totalRevenueLost.toFixed(2)}\n`);

  // Step 4: Export orphaned orders before deletion
  console.log('💾 Step 4: Exporting orphaned orders...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = '/Users/greghogue/Leora2/docs/database-investigation/deleted';
  const exportPath = path.join(exportDir, `step3-orders-${timestamp}.json`);

  // Ensure directory exists
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportData = {
    timestamp: new Date().toISOString(),
    totalOrders: orphanedOrders.length,
    ordersWithRevenue,
    ordersWithZeroTotal,
    totalRevenueLost,
    orders: orphanedOrders
  };

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  console.log(`   ✅ Exported to: ${exportPath}\n`);

  // Step 5: Delete in batches
  console.log('🗑️  Step 5: Deleting orphaned orders in batches...');

  const batchSize = 100;
  let totalDeleted = 0;

  for (let i = 0; i < orphanedOrderIds.length; i += batchSize) {
    const batch = orphanedOrderIds.slice(i, i + batchSize);

    const { error: deleteError } = await lovable
      .from('order')
      .delete()
      .in('id', batch);

    if (deleteError) {
      throw new Error(`Failed to delete batch at index ${i}: ${deleteError.message}`);
    }

    totalDeleted += batch.length;
    console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} orders (total: ${totalDeleted})`);
  }

  console.log(`   ✅ Total deleted: ${totalDeleted} orders\n`);

  // Step 6: Post-deletion verification
  console.log('✅ Step 6: Post-deletion verification...');

  const { data: remainingOrders, error: remainingOrdersError } = await lovable
    .from('order')
    .select('id, customerid');

  if (remainingOrdersError) {
    throw new Error(`Failed to fetch remaining orders: ${remainingOrdersError.message}`);
  }

  const afterOrderCount = remainingOrders?.length || 0;
  const remainingOrphans = remainingOrders?.filter((o: Order) => !validCustomerIds.has(o.customerid)) || [];

  console.log(`   Orders after deletion: ${afterOrderCount}`);
  console.log(`   Remaining orphaned orders: ${remainingOrphans.length}`);

  if (remainingOrphans.length !== 0) {
    throw new Error(`❌ VERIFICATION FAILED: Expected 0 remaining orphans, found ${remainingOrphans.length}`);
  }

  const expectedAfterCount = 2843 - 801;
  if (afterOrderCount !== expectedAfterCount) {
    console.warn(`   ⚠️  Warning: Expected ${expectedAfterCount} orders, found ${afterOrderCount}`);
  } else {
    console.log(`   ✅ Order count matches expected: ${afterOrderCount}`);
  }

  // Verify orderline count unchanged
  const { count: afterOrderLineCount, error: afterCountError } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  if (afterCountError) {
    throw new Error(`Failed to count orderlines after deletion: ${afterCountError.message}`);
  }

  console.log(`   Orderlines after deletion: ${afterOrderLineCount}`);

  if (beforeOrderLineCount !== afterOrderLineCount) {
    throw new Error(`❌ CASCADE DETECTED: Orderline count changed from ${beforeOrderLineCount} to ${afterOrderLineCount}`);
  }
  console.log('   ✅ No cascade deletes (orderline count unchanged)\n');

  // Step 7: Generate deletion report
  console.log('📋 Step 7: Generating deletion report...');

  const stats: DeletionStats = {
    totalDeleted,
    ordersWithRevenue,
    ordersWithZeroTotal,
    totalRevenueLost,
    beforeOrderCount,
    afterOrderCount,
    beforeOrderLineCount: beforeOrderLineCount || 0,
    afterOrderLineCount: afterOrderLineCount || 0,
    timestamp: new Date().toISOString(),
    orphanedOrdersExported: exportPath
  };

  const reportPath = path.join(exportDir, `step3-deletion-report-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`   ✅ Report saved to: ${reportPath}\n`);

  // Final summary
  console.log('=' .repeat(60));
  console.log('🎉 CLEANUP STEP 3 COMPLETE');
  console.log('=' .repeat(60));
  console.log(`✅ Records deleted: ${stats.totalDeleted}`);
  console.log(`✅ Orders with revenue: ${stats.ordersWithRevenue}`);
  console.log(`✅ Orders with $0 total: ${stats.ordersWithZeroTotal}`);
  console.log(`✅ Revenue impact: $${stats.totalRevenueLost.toFixed(2)}`);
  console.log(`✅ Before order count: ${stats.beforeOrderCount}`);
  console.log(`✅ After order count: ${stats.afterOrderCount}`);
  console.log(`✅ Orderlines unchanged: ${stats.beforeOrderLineCount}`);
  console.log(`✅ Remaining orphaned orders: 0`);
  console.log(`✅ Export: ${exportPath}`);
  console.log(`✅ Report: ${reportPath}`);
  console.log('=' .repeat(60));
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
