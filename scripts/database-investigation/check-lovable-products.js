const { createClient } = require('@supabase/supabase-js');

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function checkProducts() {
  // Get ALL product IDs from 'product' table (singular)
  const { data, error } = await lovable
    .from('product')
    .select('id');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Total products in Lovable: ${data.length}`);
    
    // Save all IDs for comparison
    const fs = require('fs');
    const productIds = data.map(p => p.id);
    fs.writeFileSync(
      '/Users/greghogue/Leora2/exports/wellcrafted-manual/lovable-product-ids.json',
      JSON.stringify(productIds, null, 2)
    );
    console.log('Saved product IDs to lovable-product-ids.json');
  }
}

checkProducts();
