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
}

interface Customer {
  id: string;
}

interface OrderLine {
  id: string;
  orderid: string;
  productid: string | null;
  quantity: number;
  unitprice: number;
}

interface DeletionStats {
  totalDeleted: number;
  totalRevenueLost: number;
  beforeOrderLineCount: number;
  afterOrderLineCount: number;
  timestamp: string;
  orphanedOrderLinesExported: string;
}

async function main() {
  console.log('🧹 CLEANUP STEP 3A: Delete Orderlines Referencing Orphaned Orders');
  console.log('=' .repeat(70));
  console.log('Target: 431 orderlines referencing orders with missing customers\n');

  // Step 1: Find orphaned orders
  console.log('📊 Step 1: Identifying orphaned orders...');

  const { data: allOrders, error: ordersError } = await lovable
    .from('order')
    .select('id, customerid');

  if (ordersError) {
    throw new Error(`Failed to fetch orders: ${ordersError.message}`);
  }

  const { data: allCustomers, error: customersError } = await lovable
    .from('customer')
    .select('id');

  if (customersError) {
    throw new Error(`Failed to fetch customers: ${customersError.message}`);
  }

  const validCustomerIds = new Set(allCustomers?.map((c: Customer) => c.id) || []);
  const orphanedOrders = allOrders?.filter((o: Order) => !validCustomerIds.has(o.customerid)) || [];
  const orphanedOrderIds = orphanedOrders.map((o: Order) => o.id);

  console.log(`   Orphaned orders found: ${orphanedOrders.length}`);

  if (orphanedOrders.length !== 801) {
    throw new Error(`❌ Expected 801 orphaned orders, found ${orphanedOrders.length}`);
  }
  console.log('   ✅ Orphaned orders verified: 801\n');

  // Step 2: Find orderlines referencing orphaned orders
  console.log('🔍 Step 2: Finding orderlines referencing orphaned orders...');

  const { count: beforeOrderLineCount, error: beforeCountError } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  if (beforeCountError) {
    throw new Error(`Failed to count orderlines: ${beforeCountError.message}`);
  }

  console.log(`   Total orderlines before: ${beforeOrderLineCount}`);

  let orphanedOrderLines: OrderLine[] = [];
  const checkBatchSize = 100;

  for (let i = 0; i < orphanedOrderIds.length; i += checkBatchSize) {
    const batch = orphanedOrderIds.slice(i, i + checkBatchSize);

    const { data: batchOrderLines, error: batchError } = await lovable
      .from('orderline')
      .select('*')
      .in('orderid', batch);

    if (batchError) {
      throw new Error(`Failed to fetch orderlines batch ${i}: ${batchError.message}`);
    }

    if (batchOrderLines && batchOrderLines.length > 0) {
      orphanedOrderLines.push(...batchOrderLines);
    }
  }

  console.log(`   Orphaned orderlines found: ${orphanedOrderLines.length}`);

  if (orphanedOrderLines.length !== 431) {
    throw new Error(`❌ Expected 431 orphaned orderlines, found ${orphanedOrderLines.length}`);
  }
  console.log('   ✅ Count verification passed: 431 orphaned orderlines\n');

  // Step 3: Calculate revenue impact
  console.log('💰 Step 3: Calculating revenue impact...');

  let totalRevenueLost = 0;
  orphanedOrderLines.forEach((ol: OrderLine) => {
    const lineTotal = (ol.quantity || 0) * (ol.unitprice || 0);
    totalRevenueLost += lineTotal;
  });

  console.log(`   Total revenue of deleted orderlines: $${totalRevenueLost.toFixed(2)}\n`);

  // Step 4: Export orderlines before deletion
  console.log('💾 Step 4: Exporting orphaned orderlines...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportDir = '/Users/greghogue/Leora2/docs/database-investigation/deleted';
  const exportPath = path.join(exportDir, `step3a-orderlines-${timestamp}.json`);

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const exportData = {
    timestamp: new Date().toISOString(),
    totalOrderLines: orphanedOrderLines.length,
    totalRevenueLost,
    orderlines: orphanedOrderLines
  };

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  console.log(`   ✅ Exported to: ${exportPath}\n`);

  // Step 5: Delete in batches
  console.log('🗑️  Step 5: Deleting orphaned orderlines in batches...');

  const orphanedOrderLineIds = orphanedOrderLines.map((ol: OrderLine) => ol.id);
  const deleteBatchSize = 100;
  let totalDeleted = 0;

  for (let i = 0; i < orphanedOrderLineIds.length; i += deleteBatchSize) {
    const batch = orphanedOrderLineIds.slice(i, i + deleteBatchSize);

    const { error: deleteError } = await lovable
      .from('orderline')
      .delete()
      .in('id', batch);

    if (deleteError) {
      throw new Error(`Failed to delete batch at index ${i}: ${deleteError.message}`);
    }

    totalDeleted += batch.length;
    console.log(`   Deleted batch ${Math.floor(i / deleteBatchSize) + 1}: ${batch.length} orderlines (total: ${totalDeleted})`);
  }

  console.log(`   ✅ Total deleted: ${totalDeleted} orderlines\n`);

  // Step 6: Post-deletion verification
  console.log('✅ Step 6: Post-deletion verification...');

  const { count: afterOrderLineCount, error: afterCountError } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  if (afterCountError) {
    throw new Error(`Failed to count orderlines after deletion: ${afterCountError.message}`);
  }

  console.log(`   Orderlines after deletion: ${afterOrderLineCount}`);

  const expectedAfterCount = (beforeOrderLineCount || 0) - 431;
  if (afterOrderLineCount !== expectedAfterCount) {
    console.warn(`   ⚠️  Warning: Expected ${expectedAfterCount}, found ${afterOrderLineCount}`);
  } else {
    console.log(`   ✅ Count matches expected: ${afterOrderLineCount}`);
  }

  // Verify no orphaned orderlines remain
  let remainingOrphanedOrderLines = 0;

  for (let i = 0; i < orphanedOrderIds.length; i += checkBatchSize) {
    const batch = orphanedOrderIds.slice(i, i + checkBatchSize);

    const { data: remaining, error: remainingError } = await lovable
      .from('orderline')
      .select('id')
      .in('orderid', batch);

    if (remainingError) {
      throw new Error(`Failed to check remaining orderlines: ${remainingError.message}`);
    }

    if (remaining && remaining.length > 0) {
      remainingOrphanedOrderLines += remaining.length;
    }
  }

  if (remainingOrphanedOrderLines !== 0) {
    throw new Error(`❌ VERIFICATION FAILED: ${remainingOrphanedOrderLines} orphaned orderlines still remain`);
  }
  console.log('   ✅ No orphaned orderlines remain\n');

  // Step 7: Generate deletion report
  console.log('📋 Step 7: Generating deletion report...');

  const stats: DeletionStats = {
    totalDeleted,
    totalRevenueLost,
    beforeOrderLineCount: beforeOrderLineCount || 0,
    afterOrderLineCount: afterOrderLineCount || 0,
    timestamp: new Date().toISOString(),
    orphanedOrderLinesExported: exportPath
  };

  const reportPath = path.join(exportDir, `step3a-deletion-report-${timestamp}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`   ✅ Report saved to: ${reportPath}\n`);

  // Final summary
  console.log('=' .repeat(70));
  console.log('🎉 CLEANUP STEP 3A COMPLETE');
  console.log('=' .repeat(70));
  console.log(`✅ Records deleted: ${stats.totalDeleted}`);
  console.log(`✅ Revenue impact: $${stats.totalRevenueLost.toFixed(2)}`);
  console.log(`✅ Before orderline count: ${stats.beforeOrderLineCount}`);
  console.log(`✅ After orderline count: ${stats.afterOrderLineCount}`);
  console.log(`✅ Remaining orphaned orderlines: 0`);
  console.log(`✅ Export: ${exportPath}`);
  console.log(`✅ Report: ${reportPath}`);
  console.log('\n📌 NEXT STEP: Run Step 3B to delete the 801 orphaned orders');
  console.log('=' .repeat(70));
}

main().catch((error) => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
