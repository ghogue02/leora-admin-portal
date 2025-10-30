import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function check() {
  const skuId = '556f9792-a386-42f3-a207-aec570870858';

  console.log('Checking SKU:', skuId);
  console.log('');

  // Check if SKU exists
  const { data: sku, error: skuError } = await supabase.from('skus').select('*').eq('id', skuId).single();

  if (skuError) {
    console.log('SKU not found or error:', skuError.message);
    return;
  }

  console.log('✓ SKU exists');
  console.log('  Product ID:', sku.productid);

  // Check if product exists
  const { data: product, error: productError } = await supabase.from('product').select('id').eq('id', sku.productid).single();

  if (productError || !product) {
    console.log('✗ Product does NOT exist (orphaned SKU)');
  } else {
    console.log('✓ Product exists');
  }

  console.log('');

  // Check orderlines
  const { data: orderlines } = await supabase.from('orderline').select('*').eq('skuid', skuId);

  console.log('Orderlines referencing this SKU:', orderlines?.length || 0);

  if (orderlines && orderlines.length > 0) {
    orderlines.forEach((ol, idx) => {
      console.log(`  ${idx + 1}. Orderline ID: ${ol.id}`);
      console.log(`     Order ID: ${ol.orderid}`);
      console.log(`     Quantity: ${ol.quantity}`);
      console.log(`     Price: $${((ol.price || 0) / 100).toFixed(2)}`);
      console.log('');
    });
  }
}

check().catch(console.error);
