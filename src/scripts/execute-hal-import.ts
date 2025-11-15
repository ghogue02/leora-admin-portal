#!/usr/bin/env tsx
/**
 * HAL Data Integration via Supabase MCP Tools
 *
 * This script imports HAL product data into the database using Supabase MCP tools
 * for SQL execution. It matches HAL products with existing SKUs and updates
 * Product/SKU records with HAL specifications.
 */

import fs from 'fs';
import path from 'path';

const TENANT_ID = '123e4567-e89b-12d3-a456-426614174000';
const HAL_DATA_PATH = '/Users/greghogue/Leora2/scripts/hal-scraper/output/products-final.json';
const BATCH_SIZE = 50;

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
}

interface ImportStats {
  totalProducts: number;
  skusMatched: number;
  skusNotFound: number;
  productsUpdated: number;
  skusUpdated: number;
  inventoryCreated: number;
  errors: string[];
}

/**
 * Extract vintage year from product name
 */
function extractVintage(name: string): number | null {
  const match = name.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Escape single quotes for SQL
 */
function escapeSql(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/'/g, "''");
}

/**
 * Generate SQL UPDATE for Product record
 */
function generateProductUpdateSql(product: HALProduct, productId: string): string {
  const vintage = extractVintage(product.name);
  const vintageClause = vintage ? `vintage = ${vintage},` : '';

  return `UPDATE "Product" SET
    description = '${escapeSql(product.description)}',
    manufacturer = '${escapeSql(product.manufacturer)}',
    "abcCode" = '${escapeSql(product.virginiaABCCode)}',
    ${vintageClause}
    "halUrl" = '${escapeSql(product.url)}',
    "halWarehouseLocation" = '${escapeSql(product.warehouseLocation)}',
    "updatedAt" = NOW()
  WHERE id = '${productId}' AND "tenantId" = '${TENANT_ID}';`;
}

/**
 * Generate SQL UPDATE for SKU record
 */
function generateSkuUpdateSql(product: HALProduct, skuId: string): string {
  return `UPDATE "Sku" SET
    abv = ${product.labelAlcohol || 0},
    "itemsPerCase" = ${product.itemsPerCase || 1},
    "bottleBarcode" = '${escapeSql(product.itemBarcode)}',
    "abcCodeNumber" = '${escapeSql(product.virginiaABCCode)}',
    "updatedAt" = NOW()
  WHERE id = '${skuId}' AND "tenantId" = '${TENANT_ID}';`;
}

/**
 * Generate SQL INSERT for Inventory record
 */
function generateInventoryInsertSql(skuId: string, location: string, quantity: number): string {
  const inventoryId = crypto.randomUUID();
  return `INSERT INTO "Inventory" (id, "skuId", "tenantId", location, quantity, "createdAt", "updatedAt")
  VALUES ('${inventoryId}', '${skuId}', '${TENANT_ID}', '${escapeSql(location)}', ${quantity}, NOW(), NOW())
  ON CONFLICT ("skuId", "tenantId", location)
  DO UPDATE SET quantity = ${quantity}, "updatedAt" = NOW();`;
}

/**
 * Main import function
 */
async function executeHalImport(): Promise<void> {
  console.log('🚀 Starting HAL Data Import via Supabase MCP\n');

  const stats: ImportStats = {
    totalProducts: 0,
    skusMatched: 0,
    skusNotFound: 0,
    productsUpdated: 0,
    skusUpdated: 0,
    inventoryCreated: 0,
    errors: []
  };

  // Read HAL data
  console.log('📖 Reading HAL product data...');
  const halData: HALProduct[] = JSON.parse(fs.readFileSync(HAL_DATA_PATH, 'utf-8'));
  stats.totalProducts = halData.length;
  console.log(`   Found ${stats.totalProducts} products\n`);

  // Generate SQL statements file
  const sqlOutputPath = '/Users/greghogue/Leora2/web/src/scripts/hal-import-statements.sql';
  const sqlStatements: string[] = [];
  const notFoundSkus: string[] = [];

  console.log('🔍 Processing products and generating SQL...\n');

  // Process in batches
  for (let i = 0; i < halData.length; i += BATCH_SIZE) {
    const batch = halData.slice(i, Math.min(i + BATCH_SIZE, halData.length));
    console.log(`   Batch ${Math.floor(i / BATCH_SIZE) + 1}: Processing ${batch.length} products...`);

    for (const product of batch) {
      try {
        // Since we can't execute MCP queries directly from this script,
        // we'll generate SQL that checks for SKU existence inline
        const skuCode = escapeSql(product.sku);

        // Generate a SQL block that:
        // 1. Finds the SKU and Product IDs
        // 2. Updates Product if found
        // 3. Updates SKU if found
        // 4. Inserts Inventory if found

        const vintage = extractVintage(product.name);
        const vintageClause = vintage ? `vintage = ${vintage},` : '';

        sqlStatements.push(`
-- Product: ${product.name} (SKU: ${product.sku})
DO $$
DECLARE
  v_sku_id UUID;
  v_product_id UUID;
BEGIN
  -- Find SKU and Product IDs
  SELECT id, "productId" INTO v_sku_id, v_product_id
  FROM "Sku"
  WHERE code = '${skuCode}' AND "tenantId" = '${TENANT_ID}'
  LIMIT 1;

  IF v_sku_id IS NOT NULL THEN
    -- Update Product
    UPDATE "Product" SET
      description = '${escapeSql(product.description)}',
      manufacturer = '${escapeSql(product.manufacturer)}',
      "abcCode" = '${escapeSql(product.virginiaABCCode)}',
      ${vintageClause}
      "halUrl" = '${escapeSql(product.url)}',
      "halWarehouseLocation" = '${escapeSql(product.warehouseLocation)}',
      "updatedAt" = NOW()
    WHERE id = v_product_id AND "tenantId" = '${TENANT_ID}';

    -- Update SKU
    UPDATE "Sku" SET
      abv = ${product.labelAlcohol || 0},
      "itemsPerCase" = ${product.itemsPerCase || 1},
      "bottleBarcode" = '${escapeSql(product.itemBarcode)}',
      "abcCodeNumber" = '${escapeSql(product.virginiaABCCode)}',
      "updatedAt" = NOW()
    WHERE id = v_sku_id AND "tenantId" = '${TENANT_ID}';

    -- Insert/Update Inventory
    INSERT INTO "Inventory" (id, "skuId", "tenantId", location, quantity, "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), v_sku_id, '${TENANT_ID}', '${escapeSql(product.warehouseLocation)}', ${product.inventoryQuantity}, NOW(), NOW())
    ON CONFLICT ("skuId", "tenantId", location)
    DO UPDATE SET quantity = ${product.inventoryQuantity}, "updatedAt" = NOW();

    RAISE NOTICE 'Updated: %', '${skuCode}';
  ELSE
    RAISE WARNING 'SKU not found: %', '${skuCode}';
  END IF;
END $$;
`);

      } catch (error) {
        const errorMsg = `Error processing ${product.sku}: ${error}`;
        stats.errors.push(errorMsg);
        console.error(`   ❌ ${errorMsg}`);
      }
    }
  }

  // Write SQL file
  console.log('\n📝 Writing SQL statements to file...');
  const sqlHeader = `-- HAL Data Import SQL Statements
-- Generated: ${new Date().toISOString()}
-- Total Products: ${stats.totalProducts}
--
-- Execute this file via Supabase MCP:
-- mcp__supabase__execute_sql { query: "<paste SQL here>" }
--
-- Or via psql:
-- psql "$DATABASE_URL" -f ${sqlOutputPath}

`;

  fs.writeFileSync(sqlOutputPath, sqlHeader + sqlStatements.join('\n\n'));
  console.log(`   ✅ SQL written to: ${sqlOutputPath}`);

  // Generate report
  console.log('\n📊 Import Summary:');
  console.log(`   Total Products: ${stats.totalProducts}`);
  console.log(`   SQL Statements Generated: ${sqlStatements.length}`);
  console.log(`   Errors: ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    stats.errors.forEach(err => console.log(`   - ${err}`));
  }

  console.log('\n✅ Phase 1 Complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Execute the SQL via MCP:');
  console.log('      mcp__supabase__execute_sql with the generated SQL');
  console.log('   2. Or execute via psql:');
  console.log(`      psql "$DATABASE_URL" -f ${sqlOutputPath}`);
  console.log('   3. Proceed to Phase 2 (Image Upload)');
}

// Run import
executeHalImport().catch(console.error);
