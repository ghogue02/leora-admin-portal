#!/usr/bin/env tsx
/**
 * Create Products and SKUs from HAL Data
 *
 * Since the database is empty, this script creates new Product and SKU records
 * from HAL data instead of updating existing ones.
 */

import fs from 'fs';
import { createHash } from 'crypto';

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
const HAL_DATA_PATH = '/Users/greghogue/Leora2/scripts/hal-scraper/output/products-final.json';
const BATCH_SIZE = 100;

interface HALProduct {
  sku: string;
  name: string;
  description: string;
  manufacturer: string;
  virginiaABCCode: string;
  labelAlcohol: number;
  itemsPerCase: number;
  itemBarcode: string;
  url: string;
  warehouseLocation: string;
  inventoryQuantity: number;
  caseCost?: number;
  casePrice?: number;
}

function generateUuid(seed: string): string {
  const hash = createHash('md5').update(seed).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

function escapeSql(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/'/g, "''");
}

function extractVintage(name: string): number | null {
  const match = name.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1]) : null;
}

function detectCategory(name: string): string {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('wine') || nameLower.includes('chardonnay') || nameLower.includes('cabernet') ||
      nameLower.includes('pinot') || nameLower.includes('sauvignon') || nameLower.includes('merlot') ||
      nameLower.includes('shiraz') || nameLower.includes('syrah') || nameLower.includes('riesling')) {
    return 'Wine';
  }
  if (nameLower.includes('beer') || nameLower.includes('ale') || nameLower.includes('lager') ||
      nameLower.includes('ipa') || nameLower.includes('stout') || nameLower.includes('pilsner')) {
    return 'Beer';
  }
  if (nameLower.includes('vodka') || nameLower.includes('whiskey') || nameLower.includes('bourbon') ||
      nameLower.includes('rum') || nameLower.includes('gin') || nameLower.includes('tequila') ||
      nameLower.includes('scotch') || nameLower.includes('brandy') || nameLower.includes('cognac')) {
    return 'Spirits';
  }
  if (nameLower.includes('cider')) {
    return 'Cider';
  }
  return 'Other';
}

async function createProductsFromHal(): Promise<void> {
  console.log('🚀 Creating Products and SKUs from HAL Data\n');

  const halData: HALProduct[] = JSON.parse(fs.readFileSync(HAL_DATA_PATH, 'utf-8'));
  console.log(`📖 Found ${halData.length} products\n`);

  const sqlStatements: string[] = [];

  console.log('🔨 Generating SQL statements...\n');

  for (const product of halData) {
    const productId = generateUuid(`product-${product.sku}`);
    const skuId = generateUuid(`sku-${product.sku}`);
    const vintage = extractVintage(product.name);
    const category = detectCategory(product.name);

    // Create Product
    sqlStatements.push(`
-- Product: ${product.name} (SKU: ${product.sku})
INSERT INTO "Product" (
  id, "tenantId", name, description, manufacturer, category, vintage,
  "abcCode", "halUrl", "halWarehouseLocation", "createdAt", "updatedAt"
) VALUES (
  '${productId}',
  '${TENANT_ID}',
  '${escapeSql(product.name)}',
  '${escapeSql(product.description)}',
  '${escapeSql(product.manufacturer)}',
  '${category}',
  ${vintage || 'NULL'},
  '${escapeSql(product.virginiaABCCode)}',
  '${escapeSql(product.url)}',
  '${escapeSql(product.warehouseLocation)}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO "Sku" (
  id, "tenantId", "productId", code, "pricePerUnit", abv, "itemsPerCase",
  "bottleBarcode", "abcCodeNumber", "createdAt", "updatedAt"
) VALUES (
  '${skuId}',
  '${TENANT_ID}',
  '${productId}',
  '${escapeSql(product.sku)}',
  ${product.casePrice ? (product.casePrice / (product.itemsPerCase || 1)).toFixed(2) : 0},
  ${product.labelAlcohol || 0},
  ${product.itemsPerCase || 1},
  '${escapeSql(product.itemBarcode)}',
  '${escapeSql(product.virginiaABCCode)}',
  NOW(),
  NOW()
) ON CONFLICT ("tenantId", code) DO NOTHING;
${product.inventoryQuantity && product.inventoryQuantity > 0 ? `
INSERT INTO "Inventory" (
  id, "skuId", "tenantId", location, quantity, "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  '${skuId}',
  '${TENANT_ID}',
  '${escapeSql(product.warehouseLocation)}',
  ${product.inventoryQuantity},
  NOW(),
  NOW()
) ON CONFLICT ("skuId", "tenantId", location) DO UPDATE SET
  quantity = ${product.inventoryQuantity},
  "updatedAt" = NOW();
` : ''}
`);
  }

  // Write SQL file
  const sqlOutputPath = '/Users/greghogue/Leora2/web/src/scripts/create-products-hal.sql';
  const sqlHeader = `-- Create Products and SKUs from HAL Data
-- Generated: ${new Date().toISOString()}
-- Total Products: ${halData.length}
--
-- Execute via psql:
-- psql "$DATABASE_URL" -f ${sqlOutputPath}

`;

  const sqlFooter = `
-- Summary query
SELECT
  (SELECT COUNT(*) FROM "Product" WHERE "tenantId" = '${TENANT_ID}') as products_created,
  (SELECT COUNT(*) FROM "Sku" WHERE "tenantId" = '${TENANT_ID}') as skus_created,
  (SELECT COUNT(*) FROM "Inventory" WHERE "tenantId" = '${TENANT_ID}') as inventory_records;
`;

  fs.writeFileSync(sqlOutputPath, sqlHeader + sqlStatements.join('\n') + sqlFooter);
  console.log(`✅ SQL written to: ${sqlOutputPath}`);
  console.log(`📊 Total statements: ${sqlStatements.length}`);
  console.log('\n📋 Next Steps:');
  console.log(`   psql "$DATABASE_URL" -f ${sqlOutputPath}`);
}

createProductsFromHal().catch(console.error);
