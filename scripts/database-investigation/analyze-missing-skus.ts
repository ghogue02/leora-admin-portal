import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

async function analyzeMissingSKUs() {
  console.log('🔍 Analyzing missing SKU mappings...\n');

  // Load SKU mapping
  const skuMapPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/sku-uuid-map.json';
  const skuMapObject = JSON.parse(fs.readFileSync(skuMapPath, 'utf-8'));
  const skuMap = new Set(Object.keys(skuMapObject));

  console.log(`✅ Loaded ${skuMap.size} SKU mappings`);

  // Load OrderLine CSV
  const csvPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/OrderLine.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  // Extract all SKU IDs from OrderLines
  const orderLineSKUs = new Set<string>();
  records.forEach((record: any) => {
    const skuId = record.skuId || record.SkuId;
    if (skuId) {
      orderLineSKUs.add(skuId);
    }
  });

  console.log(`✅ Found ${orderLineSKUs.size} unique SKU IDs in OrderLines`);

  // Find missing SKUs
  const missingSKUs = [...orderLineSKUs].filter(skuId => !skuMap.has(skuId));

  console.log(`\n❌ Missing SKU mappings: ${missingSKUs.length}`);

  if (missingSKUs.length > 0) {
    console.log('\n📋 Sample missing SKU IDs (first 20):');
    missingSKUs.slice(0, 20).forEach((skuId, idx) => {
      console.log(`  ${idx + 1}. ${skuId}`);
    });

    // Count how many orderlines are affected
    let affectedCount = 0;
    records.forEach((record: any) => {
      const skuId = record.skuId || record.SkuId;
      if (skuId && missingSKUs.includes(skuId)) {
        affectedCount++;
      }
    });

    console.log(`\n⚠️  Affected OrderLines: ${affectedCount} (${(affectedCount / records.length * 100).toFixed(2)}%)`);

    // Save missing SKU list
    const outputPath = '/Users/greghogue/Leora2/scripts/database-investigation/missing-sku-ids.json';
    fs.writeFileSync(outputPath, JSON.stringify(missingSKUs, null, 2));
    console.log(`\n📄 Missing SKU IDs saved to: ${outputPath}`);
  }

  // Coverage stats
  const mappedSKUs = [...orderLineSKUs].filter(skuId => skuMap.has(skuId));
  console.log(`\n📊 SKU Mapping Coverage:`);
  console.log(`  Mapped SKUs: ${mappedSKUs.length}/${orderLineSKUs.size} (${(mappedSKUs.length / orderLineSKUs.size * 100).toFixed(2)}%)`);
  console.log(`  Missing SKUs: ${missingSKUs.length}/${orderLineSKUs.size} (${(missingSKUs.length / orderLineSKUs.size * 100).toFixed(2)}%)`);
}

analyzeMissingSKUs();
