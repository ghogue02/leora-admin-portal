import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wlwqkblueezqydturcpv.supabase.co';
const supabaseKey = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(supabaseUrl, supabaseKey);

interface CoverageAnalysis {
  timestamp: string;
  database_overview: {
    total_orders: number;
    total_orderlines: number;
    orders_with_orderlines: number;
    orders_without_orderlines: number;
    coverage_percentage: number;
  };
  orderline_distribution: {
    order_count: number;
    avg_lines_per_order: number;
    max_lines: number;
    min_lines: number;
    median_lines: number;
  };
  orphaned_orders: {
    count: number;
    orders_referencing_missing_customers: any[];
  };
  order_type_analysis: {
    orders_with_lines: {
      count: number;
      avg_total: number;
      min_total: number;
      max_total: number;
    };
    orders_without_lines: {
      count: number;
      avg_total: number;
      min_total: number;
      max_total: number;
    };
  };
  migration_analysis: {
    total_wc_orderlines: number;
    imported_orderlines: number;
    skipped_orderlines: number;
    skip_reasons: {
      no_order_mapping: number;
      sku_not_in_mapping: number;
      other: number;
    };
  };
  recommendations: string[];
  questions_answered: {
    why_low_coverage: string;
    are_orphaned_orders_problem: string;
    can_achieve_70_percent: string;
    what_to_reach_70_percent: string;
  };
}

async function analyzeCoverage(): Promise<void> {
  console.log('🔍 Starting Coverage Analysis...\n');

  const analysis: CoverageAnalysis = {
    timestamp: new Date().toISOString(),
    database_overview: {
      total_orders: 0,
      total_orderlines: 0,
      orders_with_orderlines: 0,
      orders_without_orderlines: 0,
      coverage_percentage: 0,
    },
    orderline_distribution: {
      order_count: 0,
      avg_lines_per_order: 0,
      max_lines: 0,
      min_lines: 0,
      median_lines: 0,
    },
    orphaned_orders: {
      count: 0,
      orders_referencing_missing_customers: [],
    },
    order_type_analysis: {
      orders_with_lines: {
        count: 0,
        avg_total: 0,
        min_total: 0,
        max_total: 0,
      },
      orders_without_lines: {
        count: 0,
        avg_total: 0,
        min_total: 0,
        max_total: 0,
      },
    },
    migration_analysis: {
      total_wc_orderlines: 7774,
      imported_orderlines: 7017,
      skipped_orderlines: 757,
      skip_reasons: {
        no_order_mapping: 0,
        sku_not_in_mapping: 0,
        other: 0,
      },
    },
    recommendations: [],
    questions_answered: {
      why_low_coverage: '',
      are_orphaned_orders_problem: '',
      can_achieve_70_percent: '',
      what_to_reach_70_percent: '',
    },
  };

  // 1. Database Overview
  console.log('📊 1. Analyzing Database Overview...');
  const { data: orders } = await lovable.from('Order').select('id', { count: 'exact', head: true });
  const { data: orderlines, count: orderlineCount } = await lovable
    .from('orderline')
    .select('id', { count: 'exact', head: true });

  const { data: ordersWithLines } = await lovable
    .from('orderline')
    .select('orderid')
    .then(result => ({
      data: Array.from(new Set(result.data?.map(ol => ol.orderid) || [])),
    }));

  analysis.database_overview.total_orders = orders?.length || 0;
  analysis.database_overview.total_orderlines = orderlineCount || 0;
  analysis.database_overview.orders_with_orderlines = ordersWithLines?.length || 0;
  analysis.database_overview.orders_without_orderlines =
    (orders?.length || 0) - (ordersWithLines?.length || 0);
  analysis.database_overview.coverage_percentage =
    ((ordersWithLines?.length || 0) / (orders?.length || 0)) * 100;

  console.log(`   Total Orders: ${analysis.database_overview.total_orders}`);
  console.log(`   Total OrderLines: ${analysis.database_overview.total_orderlines}`);
  console.log(`   Orders with OrderLines: ${analysis.database_overview.orders_with_orderlines}`);
  console.log(`   Orders without OrderLines: ${analysis.database_overview.orders_without_orderlines}`);
  console.log(`   Coverage: ${analysis.database_overview.coverage_percentage.toFixed(2)}%\n`);

  // 2. OrderLine Distribution
  console.log('📈 2. Analyzing OrderLine Distribution...');
  const { data: distribution } = await lovable.rpc('exec_sql', {
    query: `
      SELECT
        COUNT(*) as order_count,
        AVG(line_count)::numeric(10,2) as avg_lines,
        MAX(line_count) as max_lines,
        MIN(line_count) as min_lines
      FROM (
        SELECT orderid, COUNT(*) as line_count
        FROM orderline
        GROUP BY orderid
      ) subq
    `,
  });

  if (distribution && distribution.length > 0) {
    const dist = distribution[0];
    analysis.orderline_distribution = {
      order_count: parseInt(dist.order_count),
      avg_lines_per_order: parseFloat(dist.avg_lines),
      max_lines: parseInt(dist.max_lines),
      min_lines: parseInt(dist.min_lines),
      median_lines: 0, // Calculate separately if needed
    };

    console.log(`   Orders with lines: ${analysis.orderline_distribution.order_count}`);
    console.log(`   Avg lines per order: ${analysis.orderline_distribution.avg_lines_per_order}`);
    console.log(`   Max lines: ${analysis.orderline_distribution.max_lines}`);
    console.log(`   Min lines: ${analysis.orderline_distribution.min_lines}\n`);
  }

  // 3. Orphaned Orders (orders referencing non-existent customers)
  console.log('🔎 3. Checking for Orphaned Orders...');
  const { data: orphanedOrders } = await lovable.rpc('exec_sql', {
    query: `
      SELECT o.id, o.customerid, o.total, o.createdat
      FROM "Order" o
      WHERE NOT EXISTS (
        SELECT 1 FROM "Customer" c WHERE c.id = o.customerid
      )
    `,
  });

  analysis.orphaned_orders.count = orphanedOrders?.length || 0;
  analysis.orphaned_orders.orders_referencing_missing_customers = orphanedOrders || [];
  console.log(`   Orphaned orders found: ${analysis.orphaned_orders.count}\n`);

  // 4. Order Type Analysis
  console.log('💰 4. Analyzing Order Types (with/without OrderLines)...');
  const { data: orderTypeStats } = await lovable.rpc('exec_sql', {
    query: `
      SELECT
        CASE
          WHEN ol_count.orderid IS NOT NULL THEN 'Has OrderLines'
          ELSE 'No OrderLines'
        END as order_type,
        COUNT(*) as order_count,
        AVG(o.total)::numeric(10,2) as avg_total,
        MIN(o.total)::numeric(10,2) as min_total,
        MAX(o.total)::numeric(10,2) as max_total
      FROM "Order" o
      LEFT JOIN (
        SELECT DISTINCT orderid FROM orderline
      ) ol_count ON o.id = ol_count.orderid
      GROUP BY CASE WHEN ol_count.orderid IS NOT NULL THEN 'Has OrderLines' ELSE 'No OrderLines' END
    `,
  });

  if (orderTypeStats) {
    orderTypeStats.forEach((stat: any) => {
      if (stat.order_type === 'Has OrderLines') {
        analysis.order_type_analysis.orders_with_lines = {
          count: parseInt(stat.order_count),
          avg_total: parseFloat(stat.avg_total),
          min_total: parseFloat(stat.min_total),
          max_total: parseFloat(stat.max_total),
        };
      } else {
        analysis.order_type_analysis.orders_without_lines = {
          count: parseInt(stat.order_count),
          avg_total: parseFloat(stat.avg_total),
          min_total: parseFloat(stat.min_total),
          max_total: parseFloat(stat.max_total),
        };
      }
    });

    console.log('   Orders WITH OrderLines:');
    console.log(`     Count: ${analysis.order_type_analysis.orders_with_lines.count}`);
    console.log(`     Avg Total: $${analysis.order_type_analysis.orders_with_lines.avg_total}`);
    console.log(`     Range: $${analysis.order_type_analysis.orders_with_lines.min_total} - $${analysis.order_type_analysis.orders_with_lines.max_total}`);

    console.log('   Orders WITHOUT OrderLines:');
    console.log(`     Count: ${analysis.order_type_analysis.orders_without_lines.count}`);
    console.log(`     Avg Total: $${analysis.order_type_analysis.orders_without_lines.avg_total}`);
    console.log(`     Range: $${analysis.order_type_analysis.orders_without_lines.min_total} - $${analysis.order_type_analysis.orders_without_lines.max_total}\n`);
  }

  // 5. Answer the Questions
  console.log('💡 5. Answering Key Questions...\n');

  // Why are orderlines concentrated in only 373 orders?
  const avgLinesPerOrder = analysis.orderline_distribution.avg_lines_per_order;
  analysis.questions_answered.why_low_coverage = `
The 11.65% coverage (373 orders with orderlines out of 3,202 total orders) appears to be due to:
1. Data Distribution: The ${analysis.database_overview.total_orderlines} orderlines are distributed across ${analysis.orderline_distribution.order_count} orders
2. Average of ${avgLinesPerOrder.toFixed(1)} lines per order (11,828 / 373 = 31.7 lines/order)
3. This suggests these are BULK/WHOLESALE orders with many line items
4. The remaining ${analysis.database_overview.orders_without_orderlines} orders likely represent:
   - Small retail orders (may not have been migrated from Well Crafted)
   - Orders created in Lovable natively (no WC equivalent)
   - Orders that failed to import orderlines during migration
  `;

  // Are the orphaned orders a problem?
  analysis.questions_answered.are_orphaned_orders_problem = `
${analysis.orphaned_orders.count > 0 ? 'YES - CRITICAL PROBLEM' : 'No problem detected'}:
${analysis.orphaned_orders.count} orders reference customers that don't exist in the database.
This is a data integrity issue that should be resolved by either:
1. Importing the missing customers
2. Deleting the orphaned orders
3. Reassigning the orders to valid customers
  `;

  // Can we achieve 70% coverage?
  const maxPossibleCoverage = (7017 / 7774) * 100;
  analysis.questions_answered.can_achieve_70_percent = `
Current State:
- Well Crafted had 7,774 OrderLines total
- We imported 7,017 OrderLines (${maxPossibleCoverage.toFixed(1)}% of WC data)
- 757 were skipped (no Order mapping in Lovable)

Maximum Achievable Coverage:
- If those 757 skipped orderlines belong to ${Math.ceil(757 / avgLinesPerOrder)} orders (assuming avg ${avgLinesPerOrder.toFixed(1)} lines/order)
- That would add ~${Math.ceil(757 / avgLinesPerOrder)} more orders with lines
- New coverage would be: ${(((373 + Math.ceil(757 / avgLinesPerOrder)) / 3202) * 100).toFixed(1)}%

Conclusion: ${((373 + Math.ceil(757 / avgLinesPerOrder)) / 3202) * 100 >= 70 ? 'YES' : 'NO'}, we ${((373 + Math.ceil(757 / avgLinesPerOrder)) / 3202) * 100 >= 70 ? 'CAN' : 'CANNOT'} achieve 70% coverage by importing the missing 757 orderlines.
  `;

  // What would it take to get to 70%?
  const ordersNeededFor70Percent = Math.ceil(3202 * 0.7);
  const additionalOrdersNeeded = ordersNeededFor70Percent - 373;
  analysis.questions_answered.what_to_reach_70_percent = `
To reach 70% coverage:
- Need ${ordersNeededFor70Percent} orders with orderlines (70% of 3,202)
- Currently have ${analysis.database_overview.orders_with_orderlines} orders with orderlines
- Need ${additionalOrdersNeeded} MORE orders with orderlines

Options:
1. Import the 757 skipped orderlines (if they map to ~${Math.ceil(757 / avgLinesPerOrder)} unique orders)
2. Migrate more orders from Well Crafted (if they exist)
3. Accept that 11.65% is the realistic maximum if:
   - The other 2,829 orders are Lovable-only (no WC equivalent)
   - Or they're small orders that WC didn't track orderlines for
  `;

  // 6. Generate Recommendations
  console.log('📋 6. Generating Recommendations...\n');

  analysis.recommendations.push(
    'IMMEDIATE: Fix the orphaned orders issue - ' + analysis.orphaned_orders.count + ' orders reference missing customers',
  );

  analysis.recommendations.push(
    'INVESTIGATE: Check if the 757 skipped orderlines can be imported by fixing Order mappings',
  );

  analysis.recommendations.push(
    'VERIFY: Determine if the 2,829 orders without orderlines exist in Well Crafted database',
  );

  analysis.recommendations.push(
    'ANALYZE: Check if orders without orderlines are legitimate (small orders, returns, cancellations)',
  );

  if (analysis.database_overview.coverage_percentage < 70) {
    analysis.recommendations.push(
      `DECISION NEEDED: Current coverage is ${analysis.database_overview.coverage_percentage.toFixed(1)}%, target is 70%. Determine if this is acceptable or if more migration work is needed.`,
    );
  }

  // Save the report
  const fs = await import('fs');
  const reportPath = '/Users/greghogue/Leora2/docs/database-investigation/coverage-analysis-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

  console.log('✅ Analysis Complete!');
  console.log(`📄 Full report saved to: ${reportPath}\n`);

  // Print summary
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    COVERAGE ANALYSIS SUMMARY                  ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Current Coverage: ${analysis.database_overview.coverage_percentage.toFixed(2)}%`);
  console.log(`Orders with OrderLines: ${analysis.database_overview.orders_with_orderlines} / ${analysis.database_overview.total_orders}`);
  console.log(`Orphaned Orders: ${analysis.orphaned_orders.count}`);
  console.log(`\nRECOMMENDATIONS:`);
  analysis.recommendations.forEach((rec, idx) => {
    console.log(`${idx + 1}. ${rec}`);
  });
  console.log('═══════════════════════════════════════════════════════════════\n');
}

analyzeCoverage().catch(console.error);
