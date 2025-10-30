#!/usr/bin/env tsx
/**
 * Database Cleanup - Step 1: Delete Orphaned Orderlines
 *
 * Target: 641 orderlines that reference non-existent orders
 * Safety: Full verification, export before delete, batch processing
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const EXPECTED_ORPHAN_COUNT = 641;
const BATCH_SIZE = 100;

interface Orderline {
  id: string;
  orderid: string;
  productid: string;
  quantity: number;
  unitprice: number;
  subtotal: number;
  createdat: string;
  updatedat: string;
}

interface Order {
  id: string;
}

interface DeletionReport {
  timestamp: string;
  expectedCount: number;
  actualCount: number;
  deletedCount: number;
  financialImpact: number;
  verificationPassed: boolean;
  batches: Array<{
    batchNumber: number;
    count: number;
    timestamp: string;
  }>;
  postDeletionOrphanCount: number;
  totalOrderlinesBefore: number;
  totalOrderlinesAfter: number;
}

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchAllRecords<T>(
  table: string,
  select: string = '*',
  pageSize: number = 1000
): Promise<T[]> {
  const allRecords: T[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await lovable
      .from(table)
      .select(select)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .returns<T[]>();

    if (error) {
      throw new Error(`Failed to fetch ${table} (page ${page}): ${error.message}`);
    }

    if (data && data.length > 0) {
      allRecords.push(...data);
      hasMore = data.length === pageSize;
      page++;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

async function identifyOrphans(): Promise<Orderline[]> {
  console.log('🔍 Step 1: Identifying orphaned orderlines...');

  // Get all orderlines with pagination
  console.log('   Fetching all orderlines (paginated)...');
  const orderlines = await fetchAllRecords<Orderline>('orderline', '*');
  console.log(`   Found ${orderlines.length} total orderlines`);

  // Get all valid order IDs with pagination
  console.log('   Fetching all orders (paginated)...');
  const orders = await fetchAllRecords<Order>('order', 'id');
  console.log(`   Found ${orders.length} valid orders`);

  // Create set of valid order IDs for fast lookup
  const validOrderIds = new Set(orders.map(o => o.id));

  // Filter orphaned orderlines
  const orphanedOrderlines = orderlines.filter(ol => !validOrderIds.has(ol.orderid));

  console.log(`   Found ${orphanedOrderlines.length} orphaned orderlines`);

  // CRITICAL VERIFICATION
  if (orphanedOrderlines.length !== EXPECTED_ORPHAN_COUNT) {
    throw new Error(
      `❌ VERIFICATION FAILED: Expected ${EXPECTED_ORPHAN_COUNT} orphans, found ${orphanedOrderlines.length}`
    );
  }

  console.log(`   ✅ Count verification passed: ${orphanedOrderlines.length} matches expected`);

  return orphanedOrderlines;
}

async function exportOrphans(orphans: Orderline[]): Promise<string> {
  console.log('\n💾 Step 2: Exporting orphans for audit trail...');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const exportPath = path.join(
    '/Users/greghogue/Leora2/docs/database-investigation/deleted',
    `step1-orderlines-${timestamp}.json`
  );

  const exportData = {
    timestamp: new Date().toISOString(),
    count: orphans.length,
    financialImpact: orphans.reduce((sum, ol) => sum + (ol.subtotal || 0), 0),
    orphans: orphans.map(ol => ({
      ...ol,
      reason: 'Missing order reference',
      orderExists: false
    }))
  };

  await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));
  console.log(`   ✅ Exported to: ${exportPath}`);
  console.log(`   Total financial impact: $${exportData.financialImpact.toFixed(2)}`);

  return exportPath;
}

async function deleteInBatches(orphanIds: string[]): Promise<DeletionReport['batches']> {
  console.log(`\n🗑️  Step 3: Deleting ${orphanIds.length} orderlines in batches of ${BATCH_SIZE}...`);

  const batches: DeletionReport['batches'] = [];
  const totalBatches = Math.ceil(orphanIds.length / BATCH_SIZE);

  for (let i = 0; i < orphanIds.length; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const batchIds = orphanIds.slice(i, i + BATCH_SIZE);

    console.log(`   Batch ${batchNumber}/${totalBatches}: Deleting ${batchIds.length} records...`);

    const { error } = await lovable
      .from('orderline')
      .delete()
      .in('id', batchIds);

    if (error) {
      throw new Error(`Batch ${batchNumber} deletion failed: ${error.message}`);
    }

    batches.push({
      batchNumber,
      count: batchIds.length,
      timestamp: new Date().toISOString()
    });

    console.log(`   ✅ Batch ${batchNumber} completed`);

    // Small delay between batches
    if (i + BATCH_SIZE < orphanIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return batches;
}

async function postDeletionVerification(
  totalBefore: number,
  orphansDeleted: number
): Promise<{ orphanCount: number; totalAfter: number }> {
  console.log('\n✅ Step 4: Post-deletion verification...');

  // Re-identify any remaining orphans with pagination
  console.log('   Fetching all remaining orderlines (paginated)...');
  const orderlines = await fetchAllRecords<{ id: string; orderid: string }>('orderline', 'id, orderid');

  const totalAfter = orderlines.length;
  console.log(`   Total orderlines after deletion: ${totalAfter}`);
  console.log(`   Expected: ${totalBefore - orphansDeleted}`);

  // Get valid orders with pagination
  console.log('   Fetching all orders (paginated)...');
  const orders = await fetchAllRecords<Order>('order', 'id');

  const validOrderIds = new Set(orders.map(o => o.id));
  const remainingOrphans = orderlines.filter(ol => !validOrderIds.has(ol.orderid));

  console.log(`   Remaining orphaned orderlines: ${remainingOrphans.length}`);

  // CRITICAL VERIFICATION
  if (remainingOrphans.length !== 0) {
    throw new Error(`❌ POST-DELETION VERIFICATION FAILED: ${remainingOrphans.length} orphans still exist`);
  }

  if (totalAfter !== totalBefore - orphansDeleted) {
    throw new Error(
      `❌ COUNT VERIFICATION FAILED: Expected ${totalBefore - orphansDeleted}, got ${totalAfter}`
    );
  }

  console.log('   ✅ All verification checks passed');

  return {
    orphanCount: remainingOrphans.length,
    totalAfter
  };
}

async function generateReport(
  orphans: Orderline[],
  batches: DeletionReport['batches'],
  postVerification: { orphanCount: number; totalAfter: number },
  totalBefore: number
): Promise<DeletionReport> {
  const report: DeletionReport = {
    timestamp: new Date().toISOString(),
    expectedCount: EXPECTED_ORPHAN_COUNT,
    actualCount: orphans.length,
    deletedCount: orphans.length,
    financialImpact: orphans.reduce((sum, ol) => sum + (ol.subtotal || 0), 0),
    verificationPassed: postVerification.orphanCount === 0,
    batches,
    postDeletionOrphanCount: postVerification.orphanCount,
    totalOrderlinesBefore: totalBefore,
    totalOrderlinesAfter: postVerification.totalAfter
  };

  const reportPath = path.join(
    '/Users/greghogue/Leora2/docs/database-investigation/deleted',
    `step1-deletion-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  return report;
}

async function main() {
  console.log('🚀 Database Cleanup - Step 1: Delete Orphaned Orderlines\n');
  console.log(`Target: ${EXPECTED_ORPHAN_COUNT} orderlines → non-existent orders\n`);

  try {
    // Get initial total count
    const { count: totalBefore } = await lovable
      .from('orderline')
      .select('*', { count: 'exact', head: true });

    console.log(`Initial total orderlines: ${totalBefore}\n`);

    // Step 1: Identify orphans
    const orphans = await identifyOrphans();

    // Step 2: Export for audit trail
    const exportPath = await exportOrphans(orphans);

    // Step 3: Delete in batches
    const batches = await deleteInBatches(orphans.map(o => o.id));

    // Step 4: Post-deletion verification
    const postVerification = await postDeletionVerification(totalBefore || 0, orphans.length);

    // Step 5: Generate report
    const report = await generateReport(orphans, batches, postVerification, totalBefore || 0);

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ CLEANUP STEP 1 COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`Records deleted:           ${report.deletedCount}`);
    console.log(`Financial impact:          $${report.financialImpact.toFixed(2)}`);
    console.log(`Batches processed:         ${report.batches.length}`);
    console.log(`Post-deletion orphans:     ${report.postDeletionOrphanCount}`);
    console.log(`Total orderlines before:   ${report.totalOrderlinesBefore}`);
    console.log(`Total orderlines after:    ${report.totalOrderlinesAfter}`);
    console.log(`Records removed:           ${report.totalOrderlinesBefore - report.totalOrderlinesAfter}`);
    console.log(`Verification:              ${report.verificationPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('='.repeat(70));
    console.log(`\nAudit trail saved to:\n  ${exportPath}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ CLEANUP FAILED:', error);
    process.exit(1);
  }
}

main();
