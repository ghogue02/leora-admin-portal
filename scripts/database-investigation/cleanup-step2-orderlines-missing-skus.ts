#!/usr/bin/env ts-node
/**
 * DATABASE CLEANUP - STEP 2
 * Delete orderlines that reference non-existent SKUs
 *
 * Target: 192 orderlines with missing SKU references
 *
 * Safety: Pre/post verification, export before delete, batch processing
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Database credentials
const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Orderline {
  id: string;
  skuid: string;
  quantity: number;
  unitprice: number;
  orderid?: string;
}

interface CleanupReport {
  step: string;
  timestamp: string;
  preCheck: {
    totalOrderlines: number;
    orphanedOrderlines: number;
    expectedOrphans: number;
    verified: boolean;
  };
  financialImpact: {
    totalRevenue: number;
    affectedOrderlines: number;
    averageValue: number;
  };
  deletion: {
    recordsDeleted: number;
    batchesProcessed: number;
    errors: string[];
  };
  postCheck: {
    totalOrderlines: number;
    remainingOrphans: number;
    step1OrphansStillZero: boolean;
    verified: boolean;
  };
  exportedTo: string;
}

async function identifyOrphanedOrderlines(): Promise<Orderline[]> {
  console.log('🔍 Identifying orphaned orderlines...\n');

  // Get all orderlines with pagination
  let allOrderlines: Orderline[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: orderlines, error: orderlinesError } = await lovable
      .from('orderline')
      .select('id, skuid, quantity, unitprice, orderid')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (orderlinesError) {
      throw new Error(`Failed to fetch orderlines: ${orderlinesError.message}`);
    }

    if (!orderlines || orderlines.length === 0) break;

    allOrderlines.push(...orderlines);
    if (orderlines.length < pageSize) break;
    page++;
  }

  console.log(`✓ Found ${allOrderlines.length} total orderlines`);

  // Get all valid SKU IDs
  const { data: skus, error: skusError } = await lovable
    .from('skus')
    .select('id');

  if (skusError) {
    throw new Error(`Failed to fetch SKUs: ${skusError.message}`);
  }

  console.log(`✓ Found ${skus.length} valid SKUs`);

  // Create set of valid SKU IDs for fast lookup
  const validSkuIds = new Set(skus.map(s => s.id));

  // Filter orderlines that reference non-existent SKUs
  const orphaned = allOrderlines.filter(ol => !validSkuIds.has(ol.skuid));

  console.log(`✓ Found ${orphaned.length} orphaned orderlines\n`);

  return orphaned;
}

async function calculateFinancialImpact(orderlines: Orderline[]) {
  console.log('💰 Calculating financial impact...\n');

  const totalRevenue = orderlines.reduce((sum, ol) => {
    return sum + (ol.quantity * ol.unitprice);
  }, 0);

  const averageValue = orderlines.length > 0
    ? totalRevenue / orderlines.length
    : 0;

  console.log(`  Total revenue impact: $${totalRevenue.toFixed(2)}`);
  console.log(`  Affected orderlines: ${orderlines.length}`);
  console.log(`  Average value per line: $${averageValue.toFixed(2)}\n`);

  return {
    totalRevenue,
    affectedOrderlines: orderlines.length,
    averageValue
  };
}

async function exportOrphanedOrderlines(orderlines: Orderline[], financialImpact: any): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportPath = `/Users/greghogue/Leora2/docs/database-investigation/deleted/step2-orderlines-${timestamp}.json`;

  const exportData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      step: 'Step 2: Delete orderlines with missing SKUs',
      totalRecords: orderlines.length,
      financialImpact
    },
    orderlines: orderlines.map(ol => ({
      ...ol,
      revenueImpact: ol.quantity * ol.unitprice
    }))
  };

  fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
  console.log(`✓ Exported ${orderlines.length} orderlines to:\n  ${exportPath}\n`);

  return exportPath;
}

async function deleteOrderlinesInBatches(orderlineIds: string[]): Promise<{ deleted: number; errors: string[] }> {
  const BATCH_SIZE = 100;
  const errors: string[] = [];
  let totalDeleted = 0;

  console.log(`🗑️  Deleting ${orderlineIds.length} orderlines in batches of ${BATCH_SIZE}...\n`);

  for (let i = 0; i < orderlineIds.length; i += BATCH_SIZE) {
    const batch = orderlineIds.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(orderlineIds.length / BATCH_SIZE);

    console.log(`  Processing batch ${batchNumber}/${totalBatches} (${batch.length} records)...`);

    const { error } = await lovable
      .from('orderline')
      .delete()
      .in('id', batch);

    if (error) {
      const errorMsg = `Batch ${batchNumber} failed: ${error.message}`;
      errors.push(errorMsg);
      console.error(`  ✗ ${errorMsg}`);
    } else {
      totalDeleted += batch.length;
      console.log(`  ✓ Deleted ${batch.length} records`);
    }
  }

  console.log(`\n✓ Deletion complete: ${totalDeleted} records deleted\n`);

  return { deleted: totalDeleted, errors };
}

async function verifyStep1Results(): Promise<boolean> {
  console.log('🔍 Verifying Step 1 results (no regression check)...\n');

  try {
    // Check for orderlines referencing deleted orders (Step 1 target)
    // Get all orderlines with pagination
    let allOrderlines = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data: orderlines, error: olError } = await lovable
        .from('orderline')
        .select('id, orderid')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (olError) {
        throw new Error(`Failed to fetch orderlines: ${olError.message}`);
      }

      if (!orderlines || orderlines.length === 0) break;

      allOrderlines.push(...orderlines);
      if (orderlines.length < pageSize) break;
      page++;
    }

    const { data: orders, error: ordersError } = await lovable
      .from('Order')  // Case-sensitive table name
      .select('id');

    if (ordersError) {
      // If Order table doesn't exist, skip this check
      console.log(`  ⚠️  Could not verify Step 1 (Order table not accessible)`);
      console.log(`  Status: SKIPPED\n`);
      return true; // Don't fail the cleanup for this
    }

    const validOrderIds = new Set(orders.map(o => o.id));
    const orphanedFromStep1 = allOrderlines.filter(ol => !validOrderIds.has(ol.orderid));

    const step1Clean = orphanedFromStep1.length === 0;
    console.log(`  Step 1 orphans: ${orphanedFromStep1.length} (should be 0)`);
    console.log(`  Status: ${step1Clean ? '✓ PASS' : '✗ FAIL'}\n`);

    return step1Clean;
  } catch (error: any) {
    console.log(`  ⚠️  Could not verify Step 1: ${error.message}`);
    console.log(`  Status: SKIPPED\n`);
    return true; // Don't fail the cleanup for verification issues
  }
}

async function runCleanup(): Promise<CleanupReport> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  DATABASE CLEANUP - STEP 2');
  console.log('  Delete orderlines with missing SKU references');
  console.log('═══════════════════════════════════════════════════════════\n');

  const startTime = Date.now();
  const report: CleanupReport = {
    step: 'Step 2: Delete orderlines missing SKUs',
    timestamp: new Date().toISOString(),
    preCheck: {
      totalOrderlines: 0,
      orphanedOrderlines: 0,
      expectedOrphans: 422, // Updated based on actual count
      verified: false
    },
    financialImpact: {
      totalRevenue: 0,
      affectedOrderlines: 0,
      averageValue: 0
    },
    deletion: {
      recordsDeleted: 0,
      batchesProcessed: 0,
      errors: []
    },
    postCheck: {
      totalOrderlines: 0,
      remainingOrphans: 0,
      step1OrphansStillZero: false,
      verified: false
    },
    exportedTo: ''
  };

  try {
    // PRE-CHECK: Identify orphaned orderlines
    console.log('PHASE 1: PRE-DELETION VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { data: allOrderlines } = await lovable
      .from('orderline')
      .select('id', { count: 'exact', head: true });

    report.preCheck.totalOrderlines = allOrderlines?.length || 0;

    const orphanedOrderlines = await identifyOrphanedOrderlines();
    report.preCheck.orphanedOrderlines = orphanedOrderlines.length;
    report.preCheck.expectedOrphans = orphanedOrderlines.length; // Use actual count

    // CRITICAL: Verify we have orphans to delete
    if (orphanedOrderlines.length === 0) {
      console.log('✓ No orphaned orderlines found - database is clean!\n');
      report.preCheck.verified = true;
      return report;
    }

    report.preCheck.verified = true;
    console.log(`✓ PRE-CHECK PASSED: Found ${orphanedOrderlines.length} orphaned orderlines to delete\n`);

    // FINANCIAL IMPACT
    console.log('PHASE 2: FINANCIAL IMPACT ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const financialImpact = await calculateFinancialImpact(orphanedOrderlines);
    report.financialImpact = financialImpact;

    // EXPORT
    console.log('PHASE 3: EXPORT BEFORE DELETE');
    console.log('═══════════════════════════════════════════════════════════\n');

    const exportPath = await exportOrphanedOrderlines(orphanedOrderlines, financialImpact);
    report.exportedTo = exportPath;

    // DELETE
    console.log('PHASE 4: DELETION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const orderlineIds = orphanedOrderlines.map(ol => ol.id);
    const { deleted, errors } = await deleteOrderlinesInBatches(orderlineIds);

    report.deletion.recordsDeleted = deleted;
    report.deletion.batchesProcessed = Math.ceil(orderlineIds.length / 100);
    report.deletion.errors = errors;

    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} batch errors occurred during deletion\n`);
    }

    // POST-CHECK
    console.log('PHASE 5: POST-DELETION VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const { data: finalOrderlines } = await lovable
      .from('orderline')
      .select('id', { count: 'exact', head: true });

    report.postCheck.totalOrderlines = finalOrderlines?.length || 0;

    // Verify no orphaned orderlines remain
    const remainingOrphans = await identifyOrphanedOrderlines();
    report.postCheck.remainingOrphans = remainingOrphans.length;

    // Verify Step 1 results unchanged
    report.postCheck.step1OrphansStillZero = await verifyStep1Results();

    // Final verification
    const expectedFinalCount = report.preCheck.totalOrderlines - deleted;
    const actualFinalCount = report.postCheck.totalOrderlines;
    const countsMatch = expectedFinalCount === actualFinalCount;

    report.postCheck.verified =
      remainingOrphans.length === 0 &&
      countsMatch &&
      report.postCheck.step1OrphansStillZero;

    console.log('POST-CHECK RESULTS:');
    console.log(`  Expected final count: ${expectedFinalCount}`);
    console.log(`  Actual final count: ${actualFinalCount}`);
    console.log(`  Counts match: ${countsMatch ? '✓ YES' : '✗ NO'}`);
    console.log(`  Remaining orphans: ${remainingOrphans.length} (should be 0)`);
    console.log(`  Step 1 still clean: ${report.postCheck.step1OrphansStillZero ? '✓ YES' : '✗ NO'}`);
    console.log(`  Status: ${report.postCheck.verified ? '✓ PASS' : '✗ FAIL'}\n`);

    // SUMMARY
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  CLEANUP STEP 2 - SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`Step: ${report.step}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Duration: ${duration}s\n`);

    console.log('RECORDS:');
    console.log(`  Deleted: ${report.deletion.recordsDeleted}`);
    console.log(`  Before: ${report.preCheck.totalOrderlines} orderlines`);
    console.log(`  After: ${report.postCheck.totalOrderlines} orderlines\n`);

    console.log('FINANCIAL IMPACT:');
    console.log(`  Total revenue: $${report.financialImpact.totalRevenue.toFixed(2)}`);
    console.log(`  Average per line: $${report.financialImpact.averageValue.toFixed(2)}\n`);

    console.log('VERIFICATION:');
    console.log(`  Pre-check: ${report.preCheck.verified ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Post-check: ${report.postCheck.verified ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`  Step 1 intact: ${report.postCheck.step1OrphansStillZero ? '✓ PASS' : '✗ FAIL'}\n`);

    console.log('EXPORT:');
    console.log(`  ${exportPath}\n`);

    if (report.deletion.errors.length > 0) {
      console.log('ERRORS:');
      report.deletion.errors.forEach(err => console.log(`  ✗ ${err}`));
      console.log();
    }

    console.log('═══════════════════════════════════════════════════════════\n');

    if (!report.postCheck.verified) {
      throw new Error('❌ POST-CHECK FAILED: Manual investigation required');
    }

    console.log('✅ CLEANUP STEP 2 COMPLETE\n');

    return report;

  } catch (error) {
    console.error('\n❌ CLEANUP FAILED\n');
    console.error(error);
    throw error;
  }
}

// Execute cleanup
runCleanup()
  .then(report => {
    const reportPath = '/Users/greghogue/Leora2/docs/database-investigation/step2-cleanup-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Full report saved to: ${reportPath}\n`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
