import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🧹 CLEANUP STEP 3: COMPLETE ORPHAN REMOVAL (ITERATIVE)');
  console.log('=' .repeat(70));

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = '/Users/greghogue/Leora2/docs/database-investigation/deleted';

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  // Track totals
  let totalOrdersDeleted = 0;
  let totalOrderLinesDeleted = 0;
  let totalOrderLinesRevenue = 0;
  let totalOrdersRevenue = 0;
  let iteration = 0;
  const maxIterations = 10;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 ITERATION ${iteration}`);
    console.log('=' .repeat(70));

    // Get current state
    const { data: allOrders } = await lovable.from('order').select('*');
    const { data: allCustomers } = await lovable.from('customer').select('id');

    const validCustomerIds = new Set(allCustomers?.map(c => c.id) || []);
    const orphanedOrders = allOrders?.filter(o => !validCustomerIds.has(o.customerid)) || [];

    if (orphanedOrders.length === 0) {
      console.log('✅ No more orphaned orders found!');
      break;
    }

    console.log(`🚨 Found ${orphanedOrders.length} orphaned orders`);

    const orphanedOrderIds = orphanedOrders.map(o => o.id);

    // Find orderlines
    let orphanedOrderLines: any[] = [];
    const checkBatchSize = 100;

    for (let i = 0; i < orphanedOrderIds.length; i += checkBatchSize) {
      const batch = orphanedOrderIds.slice(i, i + checkBatchSize);
      const { data } = await lovable.from('orderline').select('*').in('orderid', batch);
      if (data && data.length > 0) {
        orphanedOrderLines.push(...data);
      }
    }

    console.log(`📦 Found ${orphanedOrderLines.length} orphaned orderlines`);

    // Calculate revenue
    let iterationOrderLinesRevenue = 0;
    orphanedOrderLines.forEach(ol => {
      iterationOrderLinesRevenue += (ol.quantity || 0) * (ol.unitprice || 0);
    });

    let iterationOrdersRevenue = 0;
    orphanedOrders.forEach(order => {
      iterationOrdersRevenue += order.total || 0;
    });

    totalOrderLinesRevenue += iterationOrderLinesRevenue;
    totalOrdersRevenue += iterationOrdersRevenue;

    console.log(`💰 Revenue: Orderlines $${iterationOrderLinesRevenue.toFixed(2)}, Orders $${iterationOrdersRevenue.toFixed(2)}`);

    // Export this iteration
    if (orphanedOrderLines.length > 0) {
      const olExportPath = path.join(exportDir, `step3-iter${iteration}-orderlines-${timestamp}.json`);
      fs.writeFileSync(olExportPath, JSON.stringify({
        iteration,
        timestamp: new Date().toISOString(),
        count: orphanedOrderLines.length,
        revenue: iterationOrderLinesRevenue,
        orderlines: orphanedOrderLines
      }, null, 2));
      console.log(`📁 Exported orderlines: step3-iter${iteration}-orderlines-*.json`);
    }

    const ordersExportPath = path.join(exportDir, `step3-iter${iteration}-orders-${timestamp}.json`);
    fs.writeFileSync(ordersExportPath, JSON.stringify({
      iteration,
      timestamp: new Date().toISOString(),
      count: orphanedOrders.length,
      revenue: iterationOrdersRevenue,
      orders: orphanedOrders
    }, null, 2));
    console.log(`📁 Exported orders: step3-iter${iteration}-orders-*.json`);

    // Delete orderlines first
    if (orphanedOrderLines.length > 0) {
      console.log(`🗑️  Deleting ${orphanedOrderLines.length} orderlines...`);
      const orderLineIds = orphanedOrderLines.map(ol => ol.id);
      const deleteBatchSize = 100;

      for (let i = 0; i < orderLineIds.length; i += deleteBatchSize) {
        const batch = orderLineIds.slice(i, i + deleteBatchSize);
        const { error } = await lovable.from('orderline').delete().in('id', batch);
        if (error) throw new Error(`Failed to delete orderlines: ${error.message}`);
      }

      totalOrderLinesDeleted += orphanedOrderLines.length;
      console.log(`   ✅ Deleted ${orphanedOrderLines.length} orderlines`);
    }

    // Delete orders
    console.log(`🗑️  Deleting ${orphanedOrders.length} orders...`);
    const deleteBatchSize = 100;

    for (let i = 0; i < orphanedOrderIds.length; i += deleteBatchSize) {
      const batch = orphanedOrderIds.slice(i, i + deleteBatchSize);
      const { error } = await lovable.from('order').delete().in('id', batch);
      if (error) throw new Error(`Failed to delete orders: ${error.message}`);
    }

    totalOrdersDeleted += orphanedOrders.length;
    console.log(`   ✅ Deleted ${orphanedOrders.length} orders`);
  }

  // Final state
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 FINAL STATE');
  console.log('=' .repeat(70));

  const { count: finalOrders } = await lovable.from('order').select('*', { count: 'exact', head: true });
  const { count: finalOrderLines } = await lovable.from('orderline').select('*', { count: 'exact', head: true });
  const { count: finalCustomers } = await lovable.from('customer').select('*', { count: 'exact', head: true });

  // Final orphan check
  const { data: finalOrdersData } = await lovable.from('order').select('id, customerid');
  const { data: finalCustomersData } = await lovable.from('customer').select('id');
  const finalValidCustomerIds = new Set(finalCustomersData?.map(c => c.id) || []);
  const finalOrphans = finalOrdersData?.filter(o => !finalValidCustomerIds.has(o.customerid)) || [];

  console.log(`Final order count: ${finalOrders}`);
  console.log(`Final orderline count: ${finalOrderLines}`);
  console.log(`Final customer count: ${finalCustomers}`);
  console.log(`Remaining orphaned orders: ${finalOrphans.length}`);

  // Summary report
  const summaryPath = path.join(exportDir, `step3-complete-summary-${timestamp}.json`);
  const summary = {
    timestamp: new Date().toISOString(),
    iterations: iteration,
    totals: {
      ordersDeleted: totalOrdersDeleted,
      orderLinesDeleted: totalOrderLinesDeleted,
      orderLinesRevenue: totalOrderLinesRevenue,
      ordersRevenue: totalOrdersRevenue,
      totalRevenue: totalOrderLinesRevenue + totalOrdersRevenue
    },
    final: {
      orders: finalOrders,
      orderlines: finalOrderLines,
      customers: finalCustomers,
      remainingOrphans: finalOrphans.length
    }
  };

  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  console.log(`\n${'='.repeat(70)}`);
  console.log('🎉 CLEANUP STEP 3 COMPLETE');
  console.log('=' .repeat(70));
  console.log(`✅ Iterations: ${iteration}`);
  console.log(`✅ Total orders deleted: ${totalOrdersDeleted}`);
  console.log(`✅ Total orderlines deleted: ${totalOrderLinesDeleted}`);
  console.log(`✅ Total revenue impact: $${(totalOrderLinesRevenue + totalOrdersRevenue).toFixed(2)}`);
  console.log(`✅ Final orders: ${finalOrders}`);
  console.log(`✅ Final orderlines: ${finalOrderLines}`);
  console.log(`✅ Remaining orphans: ${finalOrphans.length}`);
  console.log(`✅ Summary report: ${summaryPath}`);
  console.log('=' .repeat(70));

  if (finalOrphans.length > 0) {
    console.log(`\n⚠️  WARNING: ${finalOrphans.length} orphaned orders still remain after ${iteration} iterations!`);
    console.log(`   This indicates severe ongoing data quality issues.`);
    console.log(`   Manual investigation required.`);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
