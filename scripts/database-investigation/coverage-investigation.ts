import { createClient } from '@supabase/supabase-js';

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function investigate() {
  console.log('🔍 COVERAGE ANALYSIS\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // 1. Basic counts
  const { count: orderCount } = await lovable.from('order').select('*', { count: 'exact', head: true });
  const { count: orderlineCount } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });
  const { count: customerCount } = await lovable
    .from('customer')
    .select('*', { count: 'exact', head: true });

  console.log('📊 DATABASE OVERVIEW:');
  console.log(`   Total orders: ${orderCount}`);
  console.log(`   Total orderlines: ${orderlineCount}`);
  console.log(`   Total customers: ${customerCount}\n`);

  // 2. Get unique orderids in orderline table
  const { data: uniqueOrderIds } = await lovable.from('orderline').select('orderid');

  const uniqueOrders = new Set(uniqueOrderIds?.map(ol => ol.orderid));
  const ordersWithLines = uniqueOrders.size;
  const ordersWithoutLines = (orderCount || 0) - ordersWithLines;
  const coverage = (ordersWithLines / (orderCount || 1)) * 100;

  console.log('📈 ORDERLINE COVERAGE:');
  console.log(`   Orders WITH orderlines: ${ordersWithLines} (${coverage.toFixed(2)}%)`);
  console.log(`   Orders WITHOUT orderlines: ${ordersWithoutLines} (${(100 - coverage).toFixed(2)}%)\n`);

  // 3. OrderLine distribution
  const { data: distribution } = await lovable.from('orderline').select('orderid');

  const orderLineCounts: Record<string, number> = {};
  distribution?.forEach(ol => {
    orderLineCounts[ol.orderid] = (orderLineCounts[ol.orderid] || 0) + 1;
  });

  const counts = Object.values(orderLineCounts);
  const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
  const max = Math.max(...counts);
  const min = Math.min(...counts);

  console.log('📊 ORDERLINE DISTRIBUTION:');
  console.log(`   Orders with lines: ${counts.length}`);
  console.log(`   Avg lines per order: ${avg.toFixed(2)}`);
  console.log(`   Max lines in one order: ${max}`);
  console.log(`   Min lines in one order: ${min}\n`);

  // 4. Orphaned orders (orders with invalid customerid)
  const { data: allOrders } = await lovable.from('order').select('id, customerid, total');

  const { data: allCustomers } = await lovable.from('customer').select('id');

  const customerIds = new Set(allCustomers?.map(c => c.id));
  const orphanedOrders =
    allOrders?.filter(o => {
      return !customerIds.has(o.customerid);
    }) || [];

  console.log('🔎 ORPHANED ORDERS:');
  console.log(`   Orders referencing missing customers: ${orphanedOrders.length}\n`);

  // 5. Order totals comparison
  const ordersWithLinesData = allOrders?.filter(o => uniqueOrders.has(o.id)) || [];
  const ordersWithoutLinesData = allOrders?.filter(o => !uniqueOrders.has(o.id)) || [];

  const avgWithLines =
    ordersWithLinesData.reduce((sum, o) => sum + (o.total || 0), 0) / (ordersWithLinesData.length || 1);
  const avgWithoutLines =
    ordersWithoutLinesData.reduce((sum, o) => sum + (o.total || 0), 0) /
    (ordersWithoutLinesData.length || 1);

  console.log('💰 ORDER TOTALS COMPARISON:');
  console.log(`   Orders WITH lines - Avg total: $${avgWithLines.toFixed(2)}`);
  console.log(`   Orders WITHOUT lines - Avg total: $${avgWithoutLines.toFixed(2)}\n`);

  // 6. Check sample orders without lines
  const sampleWithoutLines = ordersWithoutLinesData.slice(0, 10);
  console.log('📋 SAMPLE ORDERS WITHOUT ORDERLINES (first 10):');
  sampleWithoutLines.forEach(o => {
    console.log(`   Order ${o.id}: $${o.total || 0} - Customer: ${o.customerid}`);
  });
  console.log();

  // 7. Analysis
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                         ANALYSIS                              ');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('❓ WHY ONLY 11.65% COVERAGE?');
  console.log(`   - We have ${orderlineCount} orderlines distributed across ${ordersWithLines} orders`);
  console.log(`   - This means ${avg.toFixed(1)} orderlines per order on average`);
  console.log(`   - These appear to be BULK/WHOLESALE orders (many items)`);
  console.log(`   - The ${ordersWithoutLines} orders without lines are either:`);
  console.log('     * Small retail orders (no orderlines in WellCrafted)');
  console.log('     * Lovable-only orders (not migrated from WC)');
  console.log('     * Orders that failed to import orderlines\n');

  console.log('🔍 ARE ORPHANED ORDERS A PROBLEM?');
  console.log(`   - ${orphanedOrders.length > 0 ? 'YES - CRITICAL' : 'NO'}`);
  console.log(`   - Found ${orphanedOrders.length} orders with invalid customerid\n`);

  console.log('🎯 CAN WE ACHIEVE 70% COVERAGE?');
  const ordersNeededFor70 = Math.ceil((orderCount || 0) * 0.7);
  const additionalNeeded = ordersNeededFor70 - ordersWithLines;
  console.log(`   - Need ${ordersNeededFor70} orders with lines for 70% coverage`);
  console.log(`   - Currently have ${ordersWithLines}`);
  console.log(`   - Need ${additionalNeeded} MORE orders with orderlines`);
  console.log(`   - 757 orderlines were skipped during migration`);
  console.log(
    `   - If those map to ~${Math.ceil(757 / avg)} orders, new coverage would be: ${(((ordersWithLines + Math.ceil(757 / avg)) / (orderCount || 1)) * 100).toFixed(1)}%`,
  );
  console.log(
    `   - CONCLUSION: ${(((ordersWithLines + Math.ceil(757 / avg)) / (orderCount || 1)) * 100) >= 70 ? 'YES, possibly' : 'NO, unlikely'} to reach 70%\n`,
  );

  console.log('🛠️  WHAT TO DO TO REACH 70%?');
  console.log(`   1. Import the 757 skipped orderlines (check order mappings)`);
  console.log(`   2. Verify if the ${ordersWithoutLines} orders exist in WellCrafted`);
  console.log(`   3. Check if orders without lines are legitimate (returns, cancellations)`);
  console.log(`   4. Or accept 11.65% if this is the actual data distribution\n`);

  console.log('═══════════════════════════════════════════════════════════════');

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    database_overview: {
      total_orders: orderCount,
      total_orderlines: orderlineCount,
      total_customers: customerCount,
    },
    coverage: {
      orders_with_lines: ordersWithLines,
      orders_without_lines: ordersWithoutLines,
      coverage_percentage: coverage,
    },
    orderline_distribution: {
      orders_with_lines: counts.length,
      avg_lines_per_order: avg,
      max_lines: max,
      min_lines: min,
    },
    orphaned_orders: {
      count: orphanedOrders.length,
      sample: orphanedOrders.slice(0, 5),
    },
    order_totals: {
      with_lines: avgWithLines,
      without_lines: avgWithoutLines,
    },
    migration_stats: {
      total_wc_orderlines: 7774,
      imported: 7017,
      skipped: 757,
    },
    recommendations: [
      'INVESTIGATE: Check if the 757 skipped orderlines can be imported',
      'VERIFY: Determine if orders without orderlines exist in WellCrafted',
      'ANALYZE: Check if 11.65% coverage is expected based on business model',
      orphanedOrders.length > 0
        ? `CRITICAL: Fix ${orphanedOrders.length} orphaned orders`
        : 'GOOD: No orphaned orders found',
    ],
    conclusion: {
      current_coverage: `${coverage.toFixed(2)}%`,
      can_reach_70_percent:
        (((ordersWithLines + Math.ceil(757 / avg)) / (orderCount || 1)) * 100) >= 70,
      estimated_max_coverage: `${(((ordersWithLines + Math.ceil(757 / avg)) / (orderCount || 1)) * 100).toFixed(1)}%`,
      next_steps: [
        'Import the 757 skipped orderlines',
        'Verify WellCrafted order data',
        'Accept current coverage if data distribution is correct',
      ],
    },
  };

  const fs = await import('fs');
  const path = await import('path');
  const docsDir = '/Users/greghogue/Leora2/docs/database-investigation';
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(docsDir, 'coverage-investigation-report.json'), JSON.stringify(report, null, 2));

  console.log(`\n📄 Full report saved to: ${path.join(docsDir, 'coverage-investigation-report.json')}`);
}

investigate().catch(console.error);
