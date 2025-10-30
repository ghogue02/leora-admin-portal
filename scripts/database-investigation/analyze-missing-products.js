const fs = require('fs');
const { parse } = require('csv-parse/sync');

const productMap = JSON.parse(
  fs.readFileSync('/Users/greghogue/Leora2/exports/wellcrafted-manual/product-uuid-map.json', 'utf-8')
);

const skuCsv = fs.readFileSync('/Users/greghogue/Leora2/exports/wellcrafted-manual/Sku.csv', 'utf-8');
const skus = parse(skuCsv, { columns: true, skip_empty_lines: true, trim: true });

// Count unique product IDs in SKUs
const uniqueProductIds = new Set(skus.map(s => s.productId));

console.log(`Total SKUs: ${skus.length}`);
console.log(`Unique product IDs in SKUs: ${uniqueProductIds.size}`);
console.log(`Product mappings available: ${Object.keys(productMap).length}`);

// Check how many product IDs are missing
let missing = 0;
const missingIds = [];

uniqueProductIds.forEach(productId => {
  if (!productMap[productId]) {
    missing++;
    if (missingIds.length < 10) {
      missingIds.push(productId);
    }
  }
});

console.log(`Missing product mappings: ${missing}`);
console.log(`\nSample missing product IDs:`);
missingIds.forEach(id => console.log(`  - ${id}`));
