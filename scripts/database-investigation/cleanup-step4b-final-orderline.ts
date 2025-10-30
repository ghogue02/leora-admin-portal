#!/usr/bin/env ts-node
/**
 * Cleanup Step 4b: Delete Final Orphaned Orderline
 *
 * Found: 1 orderline still references an orphaned SKU
 * SKU ID: 556f9792-a386-42f3-a207-aec570870858
 *
 * This must be deleted before we can delete the orphaned SKUs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanup() {
  console.log('🧹 CLEANUP STEP 4b: Delete Final Orphaned Orderline');
  console.log('======================================================================\n');

  // Find all SKUs that are orphaned
  const { data: allSkus } = await lovable.from('skus').select('id, productid');
  const { data: allProducts } = await lovable.from('product').select('id');

  const productIds = new Set(allProducts?.map(p => p.id) || []);
  const orphanedSkuIds = allSkus?.filter(sku => !productIds.has(sku.productid)).map(s => s.id) || [];

  console.log(`Found ${orphanedSkuIds.length} orphaned SKUs`);

  // Find orderlines referencing these orphaned SKUs
  const { data: orphanedOrderlines } = await lovable
    .from('orderline')
    .select('*')
    .in('skuid', orphanedSkuIds);

  console.log(`Found ${orphanedOrderlines?.length || 0} orderlines referencing orphaned SKUs\n`);

  if (!orphanedOrderlines || orphanedOrderlines.length === 0) {
    console.log('✅ No orphaned orderlines found - ready to delete SKUs!');
    return;
  }

  console.log('📋 Orderlines to delete:');
  orphanedOrderlines.forEach((ol, idx) => {
    console.log(`  ${idx + 1}. ID: ${ol.id}, SKU: ${ol.skuid}, Order: ${ol.orderid}`);
  });

  console.log('\n💰 Financial Impact:');
  const totalValue = orphanedOrderlines.reduce((sum, ol) => sum + (ol.price || 0) * (ol.quantity || 0), 0);
  console.log(`  Total value: $${(totalValue / 100).toFixed(2)}`);

  console.log('\n⚠️  Proceeding with deletion in 2 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Delete the orderlines
  const { error, count } = await lovable
    .from('orderline')
    .delete()
    .in('skuid', orphanedSkuIds);

  if (error) {
    console.error('❌ Deletion failed:', error);
    throw error;
  }

  console.log(`\n✅ Successfully deleted ${count} orphaned orderline(s)`);
  console.log('\n🎯 Result: Now ready to delete orphaned SKUs!');
}

cleanup().catch(console.error);
