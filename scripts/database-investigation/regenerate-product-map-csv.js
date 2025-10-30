const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function regenerateProductMap() {
  console.log('Loading products from Well Crafted CSV...');

  const wcCsv = fs.readFileSync('/Users/greghogue/Leora2/exports/wellcrafted-manual/Product.csv', 'utf-8');
  const wcProducts = parse(wcCsv, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`Loaded ${wcProducts.length} products from Well Crafted CSV`);

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
  const unmatchedSamples = [];

  wcProducts.forEach(wcp => {
    const key = wcp.name.trim().toLowerCase();
    const lovableId = lovableByName.get(key);

    if (lovableId) {
      productMap[wcp.id] = lovableId;
      matched++;
    } else {
      unmatched++;
      if (unmatchedSamples.length < 10) {
        unmatchedSamples.push({ id: wcp.id, name: wcp.name });
      }
    }
  });

  console.log(`\nMatched: ${matched}`);
  console.log(`Unmatched: ${unmatched}`);

  if (unmatchedSamples.length > 0) {
    console.log('\nSample unmatched products:');
    unmatchedSamples.forEach(p => console.log(`  - ${p.name} (${p.id})`));
  }

  // Save the complete map
  fs.writeFileSync(
    '/Users/greghogue/Leora2/exports/wellcrafted-manual/product-uuid-map.json',
    JSON.stringify(productMap, null, 2)
  );

  console.log('\n✅ Complete product UUID map saved!');
  console.log(`Total mappings: ${Object.keys(productMap).length}`);
}

regenerateProductMap();
