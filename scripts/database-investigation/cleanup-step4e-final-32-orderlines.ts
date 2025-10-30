#!/usr/bin/env ts-node
/**
 * Cleanup Step 4e: Delete Final 32 Blocking Orderlines
 *
 * 32 SKUs cannot be deleted because they're still referenced by orderlines.
 * This script deletes those orderlines so we can complete the SKU cleanup.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// The 32 SKU IDs that are blocking
const BLOCKING_SKU_IDS = [
  '556f9792-a386-42f3-a207-aec570870858',
  'ba8c73cf-8ea6-4586-9900-c772865dd594',
  '910d8296-4ade-4e21-a1ff-2ee3d736100b',
  '25a7a765-9b6a-45f1-9ffe-8085e3c652d1',
  '240cdd40-9122-4c7d-8117-1a2683751000',
  '79ce0bf9-fb5f-4c65-9ee9-f4e4496a1fda',
  '000a1f14-a0e1-4ffe-bb91-bc9cc071d2da',
  '12d40105-c306-49e0-8c43-00da273d159b',
  '7e958236-638a-4781-bdab-57df53e77c8b',
  '1dae14ea-2064-4ba5-932d-92b16c2aa41f'
];

async function main() {
  console.log('🧹 CLEANUP STEP 4e: Delete Final Blocking Orderlines');
  console.log('='.repeat(70));
  console.log('');

  // Step 1: Get all remaining orphaned SKUs
  console.log('📊 Finding All Orphaned SKUs...\n');

  const { data: allSkus } = await lovable.from('skus').select('id, productid, code');
  const { data: allProducts } = await lovable.from('product').select('id');

  const productIds = new Set(allProducts?.map(p => p.id) || []);
  const orphanedSkus = allSkus?.filter(sku => !productIds.has(sku.productid)) || [];

  console.log(`  ✓ Found ${orphanedSkus.length} orphaned SKUs`);
  const orphanedSkuIds = orphanedSkus.map(s => s.id);
  console.log('');

  // Step 2: Find orderlines referencing these SKUs
  console.log('📊 Finding Orderlines Referencing Orphaned SKUs...\n');

  const { data: orderlines } = await lovable
    .from('orderline')
    .select('id, skuid, orderid, quantity, price')
    .in('skuid', orphanedSkuIds);

  console.log(`  ✓ Found ${orderlines?.length || 0} orderlines`);

  if (!orderlines || orderlines.length === 0) {
    console.log('  ⚠️  No orderlines found (possible caching issue)');
    console.log('  Checking individual SKUs instead...\n');

    // Check each problematic SKU individually
    for (const skuId of orphanedSkuIds) {
      const { data: skuOrderlines } = await lovable
        .from('orderline')
        .select('id, skuid, orderid')
        .eq('skuid', skuId);

      if (skuOrderlines && skuOrderlines.length > 0) {
        console.log(`  SKU ${skuId}: ${skuOrderlines.length} orderlines`);

        // Delete these orderlines
        for (const ol of skuOrderlines) {
          const { error } = await lovable.from('orderline').delete().eq('id', ol.id);
          if (error) {
            console.log(`    ❌ Failed to delete orderline ${ol.id}: ${error.message}`);
          } else {
            console.log(`    ✓ Deleted orderline ${ol.id}`);
          }
        }
      }
    }
  } else {
    // Delete orderlines
    console.log('');
    console.log('🗑️  Deleting Orderlines...\n');

    const totalValue = orderlines.reduce((sum, ol) => sum + (ol.price || 0) * (ol.quantity || 0), 0);
    console.log(`  💰 Total value: $${(totalValue / 100).toFixed(2)}`);
    console.log('');

    let deleted = 0;
    for (const ol of orderlines) {
      const { error } = await lovable.from('orderline').delete().eq('id', ol.id);
      if (!error) deleted++;
    }

    console.log(`  ✅ Deleted ${deleted} orderlines`);
  }

  console.log('');
  console.log('✅ Complete!');
  console.log('');
  console.log('Next: Run cleanup-step4d again to delete the remaining 32 orphaned SKUs');
}

main().catch(console.error);
