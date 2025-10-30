import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

async function createComprehensiveSKUMap() {
  console.log('🔍 Creating comprehensive SKU mapping...\n');

  // Load missing SKU IDs
  const missingSKUsPath = '/Users/greghogue/Leora2/scripts/database-investigation/missing-sku-ids.json';
  const missingSKUs: string[] = JSON.parse(fs.readFileSync(missingSKUsPath, 'utf-8'));

  console.log(`📋 Loaded ${missingSKUs.length} missing SKU IDs`);

  // Load existing SKU map
  const skuMapPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/sku-uuid-map.json';
  const existingMap = JSON.parse(fs.readFileSync(skuMapPath, 'utf-8'));

  console.log(`📋 Loaded ${Object.keys(existingMap).length} existing SKU mappings`);

  // Check if missing SKUs exist in Lovable with the same UUIDs
  let foundCount = 0;
  let notFoundCount = 0;
  const newMappings: Record<string, string> = {};

  console.log('\n🔍 Checking if missing SKUs exist in Lovable...');

  for (let i = 0; i < missingSKUs.length; i++) {
    const skuId = missingSKUs[i];

    // Check if SKU exists in Lovable with same ID
    const { data, error } = await lovable
      .from('skus')
      .select('id')
      .eq('id', skuId)
      .single();

    if (!error && data) {
      // SKU exists with same ID - create identity mapping
      newMappings[skuId] = skuId;
      foundCount++;
    } else {
      notFoundCount++;
    }

    // Progress update every 100 SKUs
    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${missingSKUs.length} checked (Found: ${foundCount}, Not Found: ${notFoundCount})`);
    }
  }

  console.log(`\n✅ Finished checking ${missingSKUs.length} SKUs`);
  console.log(`  Found in Lovable: ${foundCount}`);
  console.log(`  Not found: ${notFoundCount}`);

  // Merge with existing mappings
  const comprehensiveMap = {
    ...existingMap,
    ...newMappings
  };

  // Save comprehensive map
  const outputPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/sku-uuid-map-comprehensive.json';
  fs.writeFileSync(outputPath, JSON.stringify(comprehensiveMap, null, 2));

  console.log(`\n📄 Comprehensive SKU map saved to: ${outputPath}`);
  console.log(`  Total mappings: ${Object.keys(comprehensiveMap).length}`);
  console.log(`  Original mappings: ${Object.keys(existingMap).length}`);
  console.log(`  New mappings: ${Object.keys(newMappings).length}`);

  // Calculate potential coverage improvement
  console.log(`\n📊 Coverage Improvement:`);
  console.log(`  Previous coverage: ${Object.keys(existingMap).length} SKUs`);
  console.log(`  New coverage: ${Object.keys(comprehensiveMap).length} SKUs`);
  console.log(`  Additional SKUs mapped: +${Object.keys(newMappings).length}`);
}

createComprehensiveSKUMap();
