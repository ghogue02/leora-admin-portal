import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🧹 CLEANUP STEP 3C: Final Orphaned Orders & Orderlines');
  console.log('=' .repeat(70));

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = '/Users/greghogue/Leora2/docs/database-investigation/deleted';

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // Initial state
  const { count: initialOrders } = await lovable.from('order').select('*', { count: 'exact', head: true });
  const { count: initialOrderLines } = await lovable.from('orderline').select('*', { count: 'exact', head: true });
  const { count: initialCustomers } = await lovable.from('customer').select('*', { count: 'exact', head: true });

  console.log(`📊 Initial State:`);
  console.log(`   Orders: ${initialOrders}`);
  console.log(`   Orderlines: ${initialOrderLines}`);
  console.log(`   Customers: ${initialCustomers}\n`);

  // Find orphaned orders
  console.log('🔍 Step 1: Finding orphaned orders...');

  const { data: allOrders } = await lovable.from('order').select('*');
  const { data: allCustomers } = await lovable.from('customer').select('id');

  const validCustomerIds = new Set(allCustomers?.map(c => c.id) || []);
  const orphanedOrders = allOrders?.filter(o => !validCustomerIds.has(o.customerid)) || [];
  const orphanedOrderIds = orphanedOrders.map(o => o.id);

  console.log(`   Orphaned orders found: ${orphanedOrders.length}\n`);

  // Find orderlines referencing orphaned orders
  console.log('🔍 Step 2: Finding orderlines referencing orphaned orders...');

  let orphanedOrderLines: any[] = [];
  const checkBatchSize = 100;

  for (let i = 0; i < orphanedOrderIds.length; i += checkBatchSize) {
    const batch = orphanedOrderIds.slice(i, i + checkBatchSize);
    const { data } = await lovable.from('orderline').select('*').in('orderid', batch);
    if (data && data.length > 0) {
      orphanedOrderLines.push(...data);
    }
  }

  console.log(`   Orphaned orderlines found: ${orphanedOrderLines.length}\n`);

  // Calculate impact
  let orderLinesRevenue = 0;
  orphanedOrderLines.forEach(ol => {
    orderLinesRevenue += (ol.quantity || 0) * (ol.unitprice || 0);
  });

  let ordersRevenue = 0;
  let ordersWithRevenue = 0;
  let ordersWithZero = 0;

  orphanedOrders.forEach(order => {
    const total = order.total || 0;
    if (total > 0) {
      ordersWithRevenue++;
      ordersRevenue += total;
    } else {
      ordersWithZero++;
    }
  });

  console.log(`💰 Business Impact:`);
  console.log(`   Orderlines revenue: $${orderLinesRevenue.toFixed(2)}`);
  console.log(`   Orders revenue: $${ordersRevenue.toFixed(2)}`);
  console.log(`   Total revenue impact: $${(orderLinesRevenue + ordersRevenue).toFixed(2)}\n`);

  // Export before deletion
  console.log('💾 Step 3: Exporting data...');

  const orderLinesExportPath = path.join(exportDir, `step3c-orderlines-${timestamp}.json`);
  fs.writeFileSync(orderLinesExportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    count: orphanedOrderLines.length,
    revenue: orderLinesRevenue,
    orderlines: orphanedOrderLines
  }, null, 2));
  console.log(`   ✅ Orderlines exported: ${orderLinesExportPath}`);

  const ordersExportPath = path.join(exportDir, `step3c-orders-${timestamp}.json`);
  fs.writeFileSync(ordersExportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    count: orphanedOrders.length,
    ordersWithRevenue,
    ordersWithZero,
    revenue: ordersRevenue,
    orders: orphanedOrders
  }, null, 2));
  console.log(`   ✅ Orders exported: ${ordersExportPath}\n`);

  // Delete orderlines first
  if (orphanedOrderLines.length > 0) {
    console.log(`🗑️  Step 4: Deleting ${orphanedOrderLines.length} orphaned orderlines...`);

    const orderLineIds = orphanedOrderLines.map(ol => ol.id);
    const deleteBatchSize = 100;
    let totalDeleted = 0;

    for (let i = 0; i < orderLineIds.length; i += deleteBatchSize) {
      const batch = orderLineIds.slice(i, i + deleteBatchSize);
      const { error } = await lovable.from('orderline').delete().in('id', batch);
      if (error) throw new Error(`Failed to delete orderlines batch ${i}: ${error.message}`);
      totalDeleted += batch.length;
      console.log(`   Deleted batch ${Math.floor(i / deleteBatchSize) + 1}: ${batch.length} orderlines (total: ${totalDeleted})`);
    }

    console.log(`   ✅ Total orderlines deleted: ${totalDeleted}\n`);
  } else {
    console.log(`✅ Step 4: No orphaned orderlines to delete\n`);
  }

  // Delete orders
  console.log(`🗑️  Step 5: Deleting ${orphanedOrders.length} orphaned orders...`);

  const deleteBatchSize = 100;
  let totalOrdersDeleted = 0;

  for (let i = 0; i < orphanedOrderIds.length; i += deleteBatchSize) {
    const batch = orphanedOrderIds.slice(i, i + deleteBatchSize);
    const { error } = await lovable.from('order').delete().in('id', batch);
    if (error) throw new Error(`Failed to delete orders batch ${i}: ${error.message}`);
    totalOrdersDeleted += batch.length;
    console.log(`   Deleted batch ${Math.floor(i / deleteBatchSize) + 1}: ${batch.length} orders (total: ${totalOrdersDeleted})`);
  }

  console.log(`   ✅ Total orders deleted: ${totalOrdersDeleted}\n`);

  // Final verification
  console.log('✅ Step 6: Final verification...');

  const { count: finalOrders } = await lovable.from('order').select('*', { count: 'exact', head: true });
  const { count: finalOrderLines } = await lovable.from('orderline').select('*', { count: 'exact', head: true });

  console.log(`   Final order count: ${finalOrders}`);
  console.log(`   Final orderline count: ${finalOrderLines}`);

  // Check for remaining orphans
  const { data: remainingOrders } = await lovable.from('order').select('id, customerid');
  const remainingOrphans = remainingOrders?.filter(o => !validCustomerIds.has(o.customerid)) || [];

  console.log(`   Remaining orphaned orders: ${remainingOrphans.length}\n`);

  // Final report
  const reportPath = path.join(exportDir, `step3c-final-report-${timestamp}.json`);
  const report = {
    timestamp: new Date().toISOString(),
    initial: { orders: initialOrders, orderlines: initialOrderLines, customers: initialCustomers },
    final: { orders: finalOrders, orderlines: finalOrderLines },
    deleted: { orders: totalOrdersDeleted, orderlines: orphanedOrderLines.length },
    revenue: { orderlines: orderLinesRevenue, orders: ordersRevenue, total: orderLinesRevenue + ordersRevenue },
    exports: { orderlines: orderLinesExportPath, orders: ordersExportPath },
    remainingOrphans: remainingOrphans.length
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Final summary
  console.log('=' .repeat(70));
  console.log('🎉 CLEANUP STEP 3C COMPLETE');
  console.log('=' .repeat(70));
  console.log(`✅ Orderlines deleted: ${orphanedOrderLines.length}`);
  console.log(`✅ Orders deleted: ${totalOrdersDeleted}`);
  console.log(`✅ Total revenue impact: $${(orderLinesRevenue + ordersRevenue).toFixed(2)}`);
  console.log(`✅ Final order count: ${finalOrders}`);
  console.log(`✅ Final orderline count: ${finalOrderLines}`);
  console.log(`✅ Remaining orphaned orders: ${remainingOrphans.length}`);
  console.log(`✅ Report: ${reportPath}`);
  console.log('=' .repeat(70));

  if (remainingOrphans.length > 0) {
    console.log(`\n⚠️  WARNING: ${remainingOrphans.length} orphaned orders still remain!`);
    console.log(`   This may indicate ongoing data quality issues.`);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
