const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const wellCrafted = createClient(
  'https://rqytadxdxqvbdlfvxvud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxeXRhZHhkeHF2YmRsZnZ4dnVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzY1OTI5NywiZXhwIjoyMDQzMjM1Mjk3fQ.fTTyH3YxzLjV4tN7xMrGAB-Y3qyQFdmSlkA0NdZcWNE'
);

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function regenerateProductMap() {
  console.log('Fetching all products from Well Crafted...');

  const { data: wcProducts, error: wcError } = await wellCrafted
    .from('Product')
    .select('id, name');

  if (wcError) throw new Error(`Failed to fetch WC products: ${wcError.message}`);
  console.log(`Fetched ${wcProducts.length} products from Well Crafted`);

  console.log('Fetching all products from Lovable...');

  const { data: lovableProducts, error: lovableError } = await lovable
    .from('product')
    .select('id, name');

  if (lovableError) throw new Error(`Failed to fetch Lovable products: ${lovableError.message}`);
  console.log(`Fetched ${lovableProducts.length} products from Lovable`);

  // Create name-based mapping
  const lovableByName = new Map();
  lovableProducts.forEach(p => {
    lovableByName.set(p.name.trim().toLowerCase(), p.id);
  });

  // Map Well Crafted IDs to Lovable IDs
  const productMap = {};
  let matched = 0;
  let unmatched = 0;

  wcProducts.forEach(wcp => {
    const key = wcp.name.trim().toLowerCase();
    const lovableId = lovableByName.get(key);

    if (lovableId) {
      productMap[wcp.id] = lovableId;
      matched++;
    } else {
      unmatched++;
    }
  });

  console.log(`\nMatched: ${matched}`);
  console.log(`Unmatched: ${unmatched}`);

  // Save the complete map
  fs.writeFileSync(
    '/Users/greghogue/Leora2/exports/wellcrafted-manual/product-uuid-map.json',
    JSON.stringify(productMap, null, 2)
  );

  console.log('\n✅ Complete product UUID map saved!');
  console.log(`Total mappings: ${Object.keys(productMap).length}`);
}

regenerateProductMap();
