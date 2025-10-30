import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function findBlocked() {
  console.log('🔍 Finding Blocked Orphaned SKUs\n');

  // Get all orphaned SKUs
  const { data: allSkus } = await supabase.from('skus').select('id, productid, code');
  const { data: allProducts } = await supabase.from('product').select('id');

  const productIds = new Set(allProducts?.map(p => p.id) || []);
  const orphanedSkus = allSkus?.filter(sku => !productIds.has(sku.productid)) || [];

  console.log(`Total orphaned SKUs: ${orphanedSkus.length}`);
  console.log('');

  // Check which ones are referenced by orderlines
  const { data: orderlines } = await supabase.from('orderline').select('id, skuid, orderid, quantity, price');

  const orderlinesMap = new Map<string, any[]>();
  orderlines?.forEach(ol => {
    if (!orderlinesMap.has(ol.skuid)) {
      orderlinesMap.set(ol.skuid, []);
    }
    orderlinesMap.get(ol.skuid)?.push(ol);
  });

  const blockedSkus = orphanedSkus.filter(sku => orderlinesMap.has(sku.id));

  console.log(`Orphaned SKUs with orderlines: ${blockedSkus.length}`);
  console.log('');

  if (blockedSkus.length > 0) {
    console.log('Blocked SKUs Details:');
    console.log('='.repeat(70));

    for (let i = 0; i < Math.min(10, blockedSkus.length); i++) {
      const sku = blockedSkus[i];
      const ols = orderlinesMap.get(sku.id) || [];

      console.log(`\n${i + 1}. SKU: ${sku.code} (${sku.id})`);
      console.log(`   Product ID (missing): ${sku.productid}`);
      console.log(`   Orderlines: ${ols.length}`);

      ols.slice(0, 3).forEach((ol, idx) => {
        console.log(`     ${idx + 1}. Orderline: ${ol.id}`);
        console.log(`        Order: ${ol.orderid}`);
        console.log(`        Qty: ${ol.quantity}, Price: $${((ol.price || 0) / 100).toFixed(2)}`);
      });

      if (ols.length > 3) {
        console.log(`     ... and ${ols.length - 3} more`);
      }
    }

    if (blockedSkus.length > 10) {
      console.log(`\n... and ${blockedSkus.length - 10} more blocked SKUs`);
    }

    console.log('\n' + '='.repeat(70));
    console.log(`\nTotal orderlines blocking deletion: ${blockedSkus.reduce((sum, sku) => sum + (orderlinesMap.get(sku.id)?.length || 0), 0)}`);
  } else {
    console.log('✅ No orphaned SKUs are blocked by orderlines!');
  }
}

findBlocked().catch(console.error);
