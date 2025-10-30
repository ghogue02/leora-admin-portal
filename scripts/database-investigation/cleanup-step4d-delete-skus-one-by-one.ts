#!/usr/bin/env ts-node
/**
 * Cleanup Step 4d: Delete Orphaned SKUs One-by-One
 *
 * The batch deletion using .in() fails, but individual deletions work.
 * This script deletes orphaned SKUs one at a time.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🧹 CLEANUP STEP 4d: Delete Orphaned SKUs (One-by-One)');
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Find all orphaned SKUs
  console.log('📊 Finding Orphaned SKUs...\n');

  const { data: allSkus } = await lovable.from('skus').select('id, productid, code');
  const { data: allProducts } = await lovable.from('product').select('id');

  const productIds = new Set(allProducts?.map(p => p.id) || []);
  const orphanedSkus = allSkus?.filter(sku => !productIds.has(sku.productid)) || [];

  console.log(`  ✓ Found ${orphanedSkus.length} orphaned SKUs`);
  console.log('');

  if (orphanedSkus.length === 0) {
    console.log('🎉 No orphaned SKUs to delete!');
    return;
  }

  // Step 2: Delete one by one with progress tracking
  console.log('🗑️  Deleting SKUs...\n');

  let deleted = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < orphanedSkus.length; i++) {
    const sku = orphanedSkus[i];

    if (i % 50 === 0 && i > 0) {
      console.log(`  Progress: ${i}/${orphanedSkus.length} (${Math.round(i / orphanedSkus.length * 100)}%)`);
    }

    const { error } = await lovable.from('skus').delete().eq('id', sku.id);

    if (error) {
      failed++;
      errors.push(`SKU ${sku.code} (${sku.id}): ${error.message}`);
    } else {
      deleted++;
    }
  }

  console.log(`  ✓ Complete: ${orphanedSkus.length}/${orphanedSkus.length} processed`);
  console.log('');

  // Step 3: Summary
  console.log('📋 DELETION SUMMARY');
  console.log('='.repeat(70));
  console.log(`  ✅ Successfully deleted: ${deleted}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log('');

  if (errors.length > 0) {
    console.log('⚠️  ERRORS:');
    errors.slice(0, 10).forEach(err => console.log(`  • ${err}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
    console.log('');
  }

  // Step 4: Final verification
  console.log('✅ Final Verification\n');

  const { data: finalSkus } = await lovable.from('skus').select('id, productid');
  const { data: finalProducts } = await lovable.from('product').select('id');

  const finalProductIds = new Set(finalProducts?.map(p => p.id) || []);
  const finalOrphans = finalSkus?.filter(sku => !finalProductIds.has(sku.productid)) || [];

  console.log(`  • Total SKUs: ${finalSkus?.length || 0}`);
  console.log(`  • Orphaned SKUs remaining: ${finalOrphans.length}`);

  if (finalOrphans.length === 0) {
    console.log('');
    console.log('🎉 SUCCESS: All orphaned SKUs deleted!');
    console.log('✅ Database integrity: 100%');
  } else {
    console.log('');
    console.log(`⚠️  WARNING: ${finalOrphans.length} orphaned SKUs still remain`);
  }
}

main().catch(console.error);
