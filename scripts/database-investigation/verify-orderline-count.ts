import { createClient } from '@supabase/supabase-js';

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function verifyOrderLineCount() {
  console.log('🔍 Verifying OrderLine Count Discrepancy\n');
  console.log('Expected: 373 orders with orderlines (from migration report)');
  console.log('Actual: 159 orders with orderlines (from database query)\n');
  console.log('Investigating...\n');

  // Method 1: Count unique orderids in orderline table
  const { data: allOrderLines } = await lovable.from('orderline').select('orderid');

  const uniqueOrderIds = new Set(allOrderLines?.map(ol => ol.orderid));
  console.log(`Method 1 - Unique orderids in orderline table: ${uniqueOrderIds.size}`);

  // Method 2: Group by and count
  const orderLineCounts: Record<string, number> = {};
  allOrderLines?.forEach(ol => {
    orderLineCounts[ol.orderid] = (orderLineCounts[ol.orderid] || 0) + 1;
  });

  const ordersWithLines = Object.keys(orderLineCounts).length;
  console.log(`Method 2 - Count of orders in orderLineCounts: ${ordersWithLines}`);

  // Method 3: Check if there are NULL orderids
  const { data: nullOrderIds } = await lovable
    .from('orderline')
    .select('id')
    .is('orderid', null);

  console.log(`Method 3 - OrderLines with NULL orderid: ${nullOrderIds?.length || 0}`);

  // Method 4: Sample some orderlines to see structure
  const { data: sampleOrderLines } = await lovable
    .from('orderline')
    .select('*')
    .limit(10);

  console.log('\nMethod 4 - Sample OrderLines (first 10):');
  sampleOrderLines?.forEach(ol => {
    console.log(`  ID: ${ol.id}, OrderID: ${ol.orderid}, SKU: ${ol.skuid}, Qty: ${ol.quantity}`);
  });

  // Method 5: Check distribution
  console.log('\nMethod 5 - Distribution of OrderLines per Order:');
  const distribution = Object.entries(orderLineCounts)
    .map(([orderId, count]) => ({ orderId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  console.log('Top 20 orders by orderline count:');
  distribution.forEach((item, idx) => {
    console.log(`  ${idx + 1}. Order ${item.orderId}: ${item.count} orderlines`);
  });

  // Method 6: Check if the migration report was looking at a different column
  const { data: orderlineColumns } = await lovable
    .from('orderline')
    .select('*')
    .limit(1);

  if (orderlineColumns && orderlineColumns.length > 0) {
    console.log('\nMethod 6 - OrderLine table structure:');
    console.log('Columns:', Object.keys(orderlineColumns[0]));
  }

  // Method 7: Check for duplicates in orderid
  console.log('\nMethod 7 - Checking for duplicate orderids:');
  const orderIdList = allOrderLines?.map(ol => ol.orderid) || [];
  const uniqueList = Array.from(new Set(orderIdList));
  console.log(`Total orderlines: ${orderIdList.length}`);
  console.log(`Unique orderids: ${uniqueList.length}`);
  console.log(`Duplicate count: ${orderIdList.length - uniqueList.length}`);

  // Final Analysis
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                         CONCLUSION                            ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n✅ CONFIRMED: Database has ${uniqueList.length} unique orders with orderlines`);
  console.log(`❌ DISCREPANCY: Migration report claimed 373 orders with orderlines`);
  console.log(`🔍 DELTA: ${373 - uniqueList.length} phantom orders\n`);

  console.log('Possible explanations:');
  console.log('1. Migration script counted orders during import, but some failed to commit');
  console.log('2. Duplicate counting in migration verification logic');
  console.log('3. Migration report looked at a different table or view');
  console.log('4. Orderlines were deleted after migration (unlikely)');
  console.log('5. Migration report was from an earlier run with different data\n');

  // Save verification report
  const report = {
    timestamp: new Date().toISOString(),
    verification_methods: {
      unique_orderids_in_table: uniqueOrderIds.size,
      count_from_grouping: ordersWithLines,
      null_orderids: nullOrderIds?.length || 0,
    },
    migration_report_claim: 373,
    actual_database_count: uniqueList.length,
    discrepancy: 373 - uniqueList.length,
    total_orderlines: orderIdList.length,
    duplicate_orderids: orderIdList.length - uniqueList.length,
    top_20_orders: distribution,
    sample_orderlines: sampleOrderLines,
  };

  const fs = await import('fs');
  const path = await import('path');
  const docsDir = '/Users/greghogue/Leora2/docs/database-investigation';
  fs.writeFileSync(
    path.join(docsDir, 'orderline-count-verification.json'),
    JSON.stringify(report, null, 2),
  );

  console.log(
    `📄 Verification report saved to: ${path.join(docsDir, 'orderline-count-verification.json')}\n`,
  );
}

verifyOrderLineCount().catch(console.error);
