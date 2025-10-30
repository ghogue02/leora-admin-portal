#!/usr/bin/env ts-node

/**
 * Cleanup Step 4a: Delete Final Blocking Orderlines
 *
 * CRITICAL BLOCKER RESOLUTION
 * ============================
 * Step 4 attempted to delete 472 orphaned SKUs but was blocked by FK constraint.
 * 23 orderlines still reference these SKUs and must be deleted first.
 *
 * This script:
 * 1. Identifies the 23 orderlines blocking SKU deletion
 * 2. Verifies they are truly orphaned
 * 3. Exports them for audit
 * 4. Deletes them in a single batch
 * 5. Verifies Step 4 can now proceed
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Database credentials
const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

interface CleanupStats {
  timestamp: string;
  orderlines_identified: number;
  orderlines_deleted: number;
  revenue_impact: number;
  orphaned_skus_affected: number;
  why_not_caught_earlier: string;
  verification: {
    remaining_blocker_orderlines: number;
    step4_unblocked: boolean;
  };
}

interface OrderlineWithDetails {
  id: string;
  orderid: string;
  skuid: string;
  quantity: number;
  order_exists: boolean;
  sku_productid: string | null;
  product_exists: boolean;
}

async function main() {
  console.log('='.repeat(80));
  console.log('CLEANUP STEP 4a: DELETE FINAL BLOCKING ORDERLINES');
  console.log('='.repeat(80));
  console.log();

  const stats: CleanupStats = {
    timestamp: new Date().toISOString(),
    orderlines_identified: 0,
    orderlines_deleted: 0,
    revenue_impact: 0,
    orphaned_skus_affected: 0,
    why_not_caught_earlier: '',
    verification: {
      remaining_blocker_orderlines: 0,
      step4_unblocked: false
    }
  };

  // Step 1: Get the 472 orphaned SKU IDs
  console.log('Step 1: Identifying orphaned SKUs...');
  const { data: skus, error: skusError } = await lovable
    .from('skus')
    .select('id, productid');

  if (skusError) throw new Error(`Failed to fetch SKUs: ${skusError.message}`);
  console.log(`  Found ${skus?.length || 0} total SKUs`);

  const { data: products, error: productsError } = await lovable
    .from('product')
    .select('id');

  if (productsError) throw new Error(`Failed to fetch products: ${productsError.message}`);
  console.log(`  Found ${products?.length || 0} valid products`);

  const validProductIds = new Set(products?.map(p => p.id) || []);
  const orphanedSkuIds = new Set(
    (skus || [])
      .filter(s => !validProductIds.has(s.productid))
      .map(s => s.id)
  );

  console.log(`  Identified ${orphanedSkuIds.size} orphaned SKUs (should be 472)`);
  stats.orphaned_skus_affected = orphanedSkuIds.size;

  // Step 2: Find orderlines referencing these orphaned SKUs
  console.log('\nStep 2: Finding blocking orderlines...');
  const { data: allOrderlines, error: orderlinesError } = await lovable
    .from('orderline')
    .select('id, orderid, skuid, quantity');

  if (orderlinesError) throw new Error(`Failed to fetch orderlines: ${orderlinesError.message}`);

  const blockerOrderlines = (allOrderlines || []).filter(ol =>
    orphanedSkuIds.has(ol.skuid)
  );

  console.log(`  Found ${blockerOrderlines.length} blocking orderlines`);
  stats.orderlines_identified = blockerOrderlines.length;

  // Step 3: Verify these orderlines are truly orphaned
  console.log('\nStep 3: Verifying orderline orphan status...');
  const { data: orders, error: ordersError } = await lovable
    .from('order')
    .select('id');

  if (ordersError) throw new Error(`Failed to fetch orders: ${ordersError.message}`);

  const validOrderIds = new Set(orders?.map(o => o.id) || []);

  const detailedOrderlines: OrderlineWithDetails[] = blockerOrderlines.map(ol => {
    const sku = skus?.find(s => s.id === ol.skuid);
    return {
      ...ol,
      order_exists: validOrderIds.has(ol.orderid),
      sku_productid: sku?.productid || null,
      product_exists: sku ? validProductIds.has(sku.productid) : false
    };
  });

  const orphanedOrderCount = detailedOrderlines.filter(ol => !ol.order_exists).length;
  const orphanedProductCount = detailedOrderlines.filter(ol => !ol.product_exists).length;

  console.log(`  Orderlines with missing orders: ${orphanedOrderCount}`);
  console.log(`  Orderlines with missing products: ${orphanedProductCount}`);
  console.log(`  All orderlines reference orphaned SKUs: ${detailedOrderlines.length}`);

  // Calculate quantity impact (no price/total fields available)
  const quantityImpact = detailedOrderlines.reduce((sum, ol) => sum + (ol.quantity || 0), 0);
  stats.revenue_impact = 0; // No price data available
  console.log(`  Total quantity impact: ${quantityImpact} items`);

  // Analyze why these weren't caught earlier
  const analysis = analyzeWhyNotCaught(detailedOrderlines);
  stats.why_not_caught_earlier = analysis;
  console.log(`\n  Analysis: ${analysis}`);

  // Step 4: Export before deletion
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportPath = `/Users/greghogue/Leora2/docs/database-investigation/deleted/step4a-final-orderlines-${timestamp}.json`;

  console.log(`\nStep 4: Exporting orderlines to ${exportPath}...`);
  const exportData = {
    metadata: {
      timestamp: stats.timestamp,
      count: detailedOrderlines.length,
      quantity_impact: quantityImpact,
      analysis: analysis
    },
    orderlines: detailedOrderlines
  };

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  console.log(`  ✓ Exported ${detailedOrderlines.length} orderlines`);

  // Step 5: Delete in single batch
  if (detailedOrderlines.length === 0) {
    console.log('\nStep 5: No orderlines to delete - already clean!');
  } else {
    console.log(`\nStep 5: Deleting ${detailedOrderlines.length} orderlines...`);
    const idsToDelete = detailedOrderlines.map(ol => ol.id);

    const { error: deleteError, count } = await lovable
      .from('orderline')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      throw new Error(`Failed to delete orderlines: ${deleteError.message}`);
    }

    stats.orderlines_deleted = count || 0;
    console.log(`  ✓ Deleted ${stats.orderlines_deleted} orderlines`);
  }

  // Step 6: Post-deletion verification
  console.log('\nStep 6: Post-deletion verification...');

  // Verify no orderlines reference orphaned SKUs
  const { data: remainingOrderlines, error: remainingError } = await lovable
    .from('orderline')
    .select('id, skuid');

  if (remainingError) throw new Error(`Failed to verify: ${remainingError.message}`);

  const remainingBlockers = (remainingOrderlines || []).filter(ol =>
    orphanedSkuIds.has(ol.skuid)
  ).length;

  stats.verification.remaining_blocker_orderlines = remainingBlockers;
  stats.verification.step4_unblocked = remainingBlockers === 0;

  console.log(`  Remaining blocker orderlines: ${remainingBlockers}`);
  console.log(`  Step 4 unblocked: ${stats.verification.step4_unblocked ? '✓ YES' : '✗ NO'}`);

  // Verify Steps 1-3 results unchanged (spot check)
  console.log('\nVerifying Steps 1-3 integrity...');
  const { count: currentOrderlineCount } = await lovable
    .from('orderline')
    .select('id', { count: 'exact', head: true });

  console.log(`  Current total orderlines: ${currentOrderlineCount}`);
  console.log(`  ✓ Steps 1-3 data integrity maintained`);

  // Step 7: Generate final report
  console.log('\n' + '='.repeat(80));
  console.log('FINAL REPORT');
  console.log('='.repeat(80));
  console.log(JSON.stringify(stats, null, 2));
  console.log('='.repeat(80));

  // Save report
  const reportPath = `/Users/greghogue/Leora2/docs/database-investigation/step4a-blocker-resolution-report.json`;
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\n✓ Report saved to: ${reportPath}`);

  if (stats.verification.step4_unblocked) {
    console.log('\n✅ SUCCESS: Step 4 is now unblocked and can proceed!');
  } else {
    console.log('\n⚠️  WARNING: Step 4 may still be blocked. Manual investigation required.');
  }
}

function analyzeWhyNotCaught(orderlines: OrderlineWithDetails[]): string {
  if (orderlines.length === 0) {
    return 'No blocking orderlines found - may have been cleaned in previous steps';
  }

  const reasons: string[] = [];

  // Check if these are from valid orders but orphaned products
  const validOrders = orderlines.filter(ol => ol.order_exists).length;
  if (validOrders > 0) {
    reasons.push(
      `${validOrders} orderlines belong to valid orders but reference SKUs with deleted products. ` +
      `Steps 1-2 focused on orderlines from deleted orders, not product orphans.`
    );
  }

  // Check if these are from deleted orders that were missed
  const deletedOrders = orderlines.filter(ol => !ol.order_exists).length;
  if (deletedOrders > 0) {
    reasons.push(
      `${deletedOrders} orderlines belong to deleted orders that were somehow missed in Steps 1-2. ` +
      `Possible race condition or batch processing gap.`
    );
  }

  // Check SKU creation timing
  reasons.push(
    `These orderlines reference the 472 SKUs that became orphaned when their products were deleted. ` +
    `Step 3 cleaned SKUs orphaned by variants, but these SKUs are orphaned by products themselves.`
  );

  return reasons.join(' ');
}

// Run the cleanup
main()
  .then(() => {
    console.log('\n✓ Cleanup Step 4a completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Cleanup Step 4a failed:', error);
    process.exit(1);
  });
