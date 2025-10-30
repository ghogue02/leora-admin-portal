#!/usr/bin/env ts-node
/**
 * Cleanup Step 4c: Delete Remaining Blocking Orderlines + Orphaned SKUs
 *
 * Current State:
 * - 200 orphaned SKUs remaining
 * - 32 orderlines reference these orphaned SKUs
 * - Need to delete orderlines first, then SKUs
 *
 * This script:
 * 1. Identifies orphaned SKUs
 * 2. Deletes orderlines referencing them
 * 3. Deletes the orphaned SKUs
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🧹 CLEANUP STEP 4c: Delete Remaining Orderlines + Orphaned SKUs');
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Find all orphaned SKUs
  console.log('📊 Step 1: Identify Orphaned SKUs\n');

  const { data: allSkus } = await lovable.from('skus').select('id, productid, code');
  const { data: allProducts } = await lovable.from('product').select('id');

  const productIds = new Set(allProducts?.map(p => p.id) || []);
  const orphanedSkus = allSkus?.filter(sku => !productIds.has(sku.productid)) || [];

  console.log(`  ✓ Found ${orphanedSkus.length} orphaned SKUs`);
  console.log('');

  // Step 2: Find orderlines referencing these SKUs
  console.log('📊 Step 2: Find Blocking Orderlines\n');

  const orphanedSkuIds = orphanedSkus.map(sku => sku.id);
  const { data: blockingOrderlines } = await lovable
    .from('orderline')
    .select('id, skuid, orderid, quantity, price')
    .in('skuid', orphanedSkuIds);

  console.log(`  ✓ Found ${blockingOrderlines?.length || 0} orderlines referencing orphaned SKUs`);

  if (blockingOrderlines && blockingOrderlines.length > 0) {
    const totalValue = blockingOrderlines.reduce((sum, ol) => sum + (ol.price || 0) * (ol.quantity || 0), 0);
    console.log(`  💰 Total value: $${(totalValue / 100).toFixed(2)}`);
  }

  console.log('');

  // Step 3: Delete blocking orderlines
  if (blockingOrderlines && blockingOrderlines.length > 0) {
    console.log('🗑️  Step 3: Delete Blocking Orderlines\n');

    const { error: olDeleteError, count: olDeleteCount } = await lovable
      .from('orderline')
      .delete()
      .in('skuid', orphanedSkuIds);

    if (olDeleteError) {
      console.error('  ❌ Failed to delete orderlines:', olDeleteError);
      throw olDeleteError;
    }

    console.log(`  ✅ Deleted ${olDeleteCount} orderlines`);
    console.log('');
  }

  // Step 4: Delete orphaned SKUs in batches
  console.log('🗑️  Step 4: Delete Orphaned SKUs\n');

  const BATCH_SIZE = 100;
  let totalDeleted = 0;
  const batches = Math.ceil(orphanedSkuIds.length / BATCH_SIZE);

  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, orphanedSkuIds.length);
    const batch = orphanedSkuIds.slice(start, end);

    console.log(`  • Batch ${i + 1}/${batches}: Deleting ${batch.length} SKUs...`);

    const { error, count } = await lovable
      .from('skus')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`    ❌ Batch ${i + 1} failed:`, error.message);
      console.log(`    ⚠️  Continuing with next batch...`);
    } else {
      console.log(`    ✅ Deleted ${count} SKUs`);
      totalDeleted += count || 0;
    }
  }

  console.log('');
  console.log(`  ✅ Total SKUs deleted: ${totalDeleted}`);
  console.log('');

  // Step 5: Final Verification
  console.log('✅ Step 5: Final Verification\n');

  const { data: remainingSkus } = await lovable.from('skus').select('id, productid');
  const { data: finalProducts } = await lovable.from('product').select('id');

  const finalProductIds = new Set(finalProducts?.map(p => p.id) || []);
  const finalOrphanedSkus = remainingSkus?.filter(sku => !finalProductIds.has(sku.productid)) || [];

  console.log(`  • Total SKUs remaining: ${remainingSkus?.length || 0}`);
  console.log(`  • Orphaned SKUs remaining: ${finalOrphanedSkus.length}`);

  const { data: finalOrderlines } = await lovable.from('orderline').select('id');
  console.log(`  • Total orderlines remaining: ${finalOrderlines?.length || 0}`);

  if (finalOrphanedSkus.length === 0) {
    console.log('');
    console.log('🎉 SUCCESS: All orphaned SKUs deleted!');
    console.log('✅ Database integrity achieved: 100%');
  } else {
    console.log('');
    console.log(`⚠️  WARNING: ${finalOrphanedSkus.length} orphaned SKUs still remain`);
  }

  console.log('');
  console.log('📋 CLEANUP SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Orderlines deleted: ${blockingOrderlines?.length || 0}`);
  console.log(`  SKUs deleted: ${totalDeleted}`);
  console.log(`  Final orphaned SKUs: ${finalOrphanedSkus.length}`);
  console.log('');
}

main().catch(console.error);
