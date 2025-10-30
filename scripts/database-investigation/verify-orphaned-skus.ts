import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function verify() {
  console.log('🔍 Verifying Orphaned SKUs State\n');

  // Get all SKUs
  const { data: allSkus, error: skuError } = await supabase.from('skus').select('id, productid');
  if (skuError) throw skuError;

  // Get all products
  const { data: allProducts, error: productError } = await supabase.from('product').select('id');
  if (productError) throw productError;

  const productIds = new Set(allProducts?.map(p => p.id) || []);
  const orphanedSkus = allSkus?.filter(sku => {
    return !productIds.has(sku.productid);
  }) || [];

  console.log('📊 Current Database State:');
  console.log('  Total SKUs:', allSkus?.length);
  console.log('  Total Products:', allProducts?.length);
  console.log('  Orphaned SKUs (missing products):', orphanedSkus.length);
  console.log('');

  // Check if any are still referenced by orderlines
  const { data: orderlines, error: olError } = await supabase.from('orderline').select('skuid');
  if (olError) throw olError;

  const skusInOrderlines = new Set(orderlines?.map(ol => ol.skuid) || []);
  const orphanedWithOrderlines = orphanedSkus.filter(sku => skusInOrderlines.has(sku.id));

  console.log('🔗 Orderline References:');
  console.log('  Total orderlines:', orderlines?.length);
  console.log('  Orphaned SKUs referenced by orderlines:', orphanedWithOrderlines.length);
  console.log('');

  if (orphanedWithOrderlines.length > 0) {
    console.log('⚠️  WARNING: Some orphaned SKUs are still referenced!');
    console.log('  Sample orphaned SKU IDs:', orphanedWithOrderlines.slice(0, 5).map(s => s.id));
  } else {
    console.log('✅ No orphaned SKUs are referenced by orderlines');
  }

  console.log('');
  console.log('📋 Discrepancy Analysis:');
  console.log('  Expected (from previous report): 472');
  console.log('  Found now: ' + orphanedSkus.length);
  console.log('  Difference: ' + (472 - orphanedSkus.length));

  if (orphanedSkus.length < 472) {
    console.log('');
    console.log('💡 Possible reasons for fewer orphaned SKUs:');
    console.log('  1. SKUs were deleted by another process');
    console.log('  2. Products were created for previously orphaned SKUs');
    console.log('  3. Data changed between initial count and now');
  }
}

verify().catch(console.error);
