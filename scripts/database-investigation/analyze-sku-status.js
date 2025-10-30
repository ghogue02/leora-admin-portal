const fs = require('fs');
const { parse } = require('csv-parse/sync');

const productMap = JSON.parse(
  fs.readFileSync('/Users/greghogue/Leora2/exports/wellcrafted-manual/product-uuid-map.json', 'utf-8')
);

const skuCsv = fs.readFileSync('/Users/greghogue/Leora2/exports/wellcrafted-manual/Sku.csv', 'utf-8');
const skus = parse(skuCsv, { columns: true, skip_empty_lines: true, trim: true });

console.log('=== SKU Analysis ===\n');
console.log(`Total SKUs in Well Crafted CSV: ${skus.length}`);
console.log(`Product mappings available: ${Object.keys(productMap).length}`);

// How many SKUs have product mappings?
const skusWithMapping = skus.filter(sku => productMap[sku.productId]);
console.log(`SKUs with product mapping: ${skusWithMapping.length}`);

// How many SKUs are missing product mappings?
const skusMissingMapping = skus.filter(sku => !productMap[sku.productId]);
console.log(`SKUs missing product mapping: ${skusMissingMapping.length}`);

console.log('\n✓ Current status:');
console.log('  - Lovable has: 1304 SKUs');
console.log('  - Importable (with mappings): ' + skusWithMapping.length + ' SKUs');
console.log('  - Expected final count: ' + skusWithMapping.length + ' SKUs');
