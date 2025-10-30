#!/usr/bin/env ts-node

/**
 * SKU Gap Resolution - Final Migration
 *
 * Purpose: Import 1,117 missing SKUs to unblock 2,206 OrderLines
 *
 * Strategy:
 * 1. Load missing SKU IDs from missing-sku-ids.json
 * 2. Extract SKU details from Sku.csv for those IDs
 * 3. Check and migrate required Products
 * 4. Import missing SKUs with proper UUID mappings
 * 5. Update sku-uuid-map.json
 * 6. Re-run OrderLine migration
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Lovable database (target)
const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

const EXPORTS_DIR = '/Users/greghogue/Leora2/exports/wellcrafted-manual';
const MAPPINGS_DIR = '/Users/greghogue/Leora2/scripts/database-investigation/mappings';

interface CSVRow {
  [key: string]: string;
}

interface SKU {
  id: string;
  tenantId: string;
  productId: string;
  code: string;
  size: string;
  unitOfMeasure: string;
  abv: string;
  casesPerPallet: string;
  pricePerUnit: string;
  isActive: string;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  [key: string]: any;
}

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) return [];

  const headers = lines[0].split(',');
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: CSVRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

function loadJSON(filePath: string): any {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJSON(filePath: string, data: any): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function main() {
  console.log('🚀 SKU Gap Resolution - Starting Migration\n');

  // ========== PHASE 1: LOAD MISSING SKU IDS ==========
  console.log('📋 Phase 1: Loading Missing SKU IDs...');

  const missingIdsPath = path.join(__dirname, 'missing-sku-ids.json');
  const missingIds: string[] = loadJSON(missingIdsPath);

  if (!missingIds || missingIds.length === 0) {
    console.log('❌ No missing SKU IDs found!');
    return;
  }

  console.log(`   Found ${missingIds.length} missing SKU IDs`);

  // ========== PHASE 2: EXTRACT SKU DETAILS FROM CSV ==========
  console.log('\n📋 Phase 2: Extracting SKU Details from CSV...');

  const skuCsvPath = path.join(EXPORTS_DIR, 'Sku.csv');
  const allWCSKUs = parseCSV(skuCsvPath);

  console.log(`   Total SKUs in CSV: ${allWCSKUs.length}`);

  const missingSkus = allWCSKUs.filter((sku: any) => missingIds.includes(sku.id));

  console.log(`   Missing SKUs found in CSV: ${missingSkus.length}`);

  if (missingSkus.length === 0) {
    console.log('❌ No SKU details found for missing IDs!');
    return;
  }

  // ========== PHASE 3: CHECK & MIGRATE PRODUCTS ==========
  console.log('\n📋 Phase 3: Checking Product Dependencies...');

  const missingProductIds = [...new Set(missingSkus.map((s: any) => s.productId))];
  console.log(`   Unique product IDs needed: ${missingProductIds.length}`);

  const productCsvPath = path.join(EXPORTS_DIR, 'Product.csv');
  const allWCProducts = parseCSV(productCsvPath);

  const neededProducts = allWCProducts.filter((p: any) => missingProductIds.includes(p.id));
  console.log(`   Products found in CSV: ${neededProducts.length}`);

  // Load existing product mappings
  const productMapPath = path.join(MAPPINGS_DIR, 'product-uuid-map.json');
  let productMap = loadJSON(productMapPath) || {};

  console.log(`   Current product mappings: ${Object.keys(productMap).length}`);

  // Fetch existing Lovable products
  const { data: lovableProducts, error: prodError } = await lovable
    .from('product')
    .select('id, name');

  if (prodError) {
    console.log(`❌ Error fetching Lovable products: ${prodError.message}`);
    return;
  }

  console.log(`   Products in Lovable: ${lovableProducts?.length || 0}`);

  // Import missing products
  let productsImported = 0;
  let productsSkipped = 0;

  for (const wcProduct of neededProducts as any[]) {
    // Skip if already mapped
    if (productMap[wcProduct.id]) {
      productsSkipped++;
      continue;
    }

    // Check if product exists by name
    const existing = lovableProducts?.find(p =>
      p.name.toLowerCase() === (wcProduct.name || '').toLowerCase()
    );

    if (existing) {
      productMap[wcProduct.id] = existing.id;
      productsSkipped++;
      continue;
    }

    // Import new product (Lovable schema - no category field)
    const lovableProduct = {
      name: wcProduct.name || 'Unknown Product',
      brand: wcProduct.brand || null,
      description: wcProduct.description || null,
      sku: wcProduct.id.substring(0, 8), // Use first 8 chars of ID as SKU
      unitprice: 0,
      issampleonly: wcProduct.isSampleOnly === 't',
      isactive: true,
    };

    const { data: newProduct, error: insertError } = await lovable
      .from('product')
      .insert(lovableProduct)
      .select('id')
      .single();

    if (insertError) {
      console.log(`   ⚠️  Failed to import product ${wcProduct.name}: ${insertError.message}`);
      continue;
    }

    productMap[wcProduct.id] = newProduct.id;
    productsImported++;

    if (productsImported % 10 === 0) {
      console.log(`   ... imported ${productsImported} products`);
    }
  }

  console.log(`   Products imported: ${productsImported}`);
  console.log(`   Products skipped (already existed): ${productsSkipped}`);

  // Save updated product mappings
  if (!fs.existsSync(MAPPINGS_DIR)) {
    fs.mkdirSync(MAPPINGS_DIR, { recursive: true });
  }
  saveJSON(productMapPath, productMap);

  // ========== PHASE 4: IMPORT MISSING SKUS ==========
  console.log('\n📋 Phase 4: Importing Missing SKUs...');

  const skuMapPath = path.join(MAPPINGS_DIR, 'sku-uuid-map.json');
  let skuMap = loadJSON(skuMapPath) || {};

  console.log(`   Current SKU mappings: ${Object.keys(skuMap).length}`);

  let skusImported = 0;
  let skusSkipped = 0;
  const skippedReasons: { [key: string]: number } = {};

  for (const wcSku of missingSkus as any[]) {
    // Skip if already mapped
    if (skuMap[wcSku.id]) {
      skusSkipped++;
      skippedReasons['Already mapped'] = (skippedReasons['Already mapped'] || 0) + 1;
      continue;
    }

    // Get mapped product ID
    const lovableProductId = productMap[wcSku.productId];

    if (!lovableProductId) {
      skusSkipped++;
      skippedReasons['Product not mapped'] = (skippedReasons['Product not mapped'] || 0) + 1;
      continue;
    }

    // Transform to Lovable schema (lowercase field names, keep tenantId)
    const lovableSku = {
      code: wcSku.code || '',
      size: wcSku.size || '',
      unitofmeasure: wcSku.unitOfMeasure || '',
      abv: wcSku.abv ? parseFloat(wcSku.abv) : null,
      casesperpallet: wcSku.casesPerPallet ? parseInt(wcSku.casesPerPallet) : null,
      priceperunit: wcSku.pricePerUnit ? parseFloat(wcSku.pricePerUnit) : 0,
      isactive: wcSku.isActive === 't',
      productid: lovableProductId,
      tenantid: wcSku.tenantId || '58b8126a-2d2f-4f55-bc98-5b6784800bed', // Use WC tenant ID
    };

    const { data: newSku, error: insertError } = await lovable
      .from('skus')
      .insert(lovableSku)
      .select('id')
      .single();

    if (insertError) {
      console.log(`   ⚠️  Failed to import SKU ${wcSku.code}: ${insertError.message}`);
      skusSkipped++;
      skippedReasons['Insert failed'] = (skippedReasons['Insert failed'] || 0) + 1;
      continue;
    }

    skuMap[wcSku.id] = newSku.id;
    skusImported++;

    if (skusImported % 50 === 0) {
      console.log(`   ... imported ${skusImported} SKUs`);
    }
  }

  console.log(`   SKUs imported: ${skusImported}`);
  console.log(`   SKUs skipped: ${skusSkipped}`);

  if (Object.keys(skippedReasons).length > 0) {
    console.log('   Skip reasons:');
    Object.entries(skippedReasons).forEach(([reason, count]) => {
      console.log(`     - ${reason}: ${count}`);
    });
  }

  // Save updated SKU mappings
  saveJSON(skuMapPath, skuMap);

  console.log(`   Total SKU mappings now: ${Object.keys(skuMap).length}`);

  // ========== PHASE 5: VERIFY COVERAGE ==========
  console.log('\n📋 Phase 5: Verifying Coverage...');

  const { count: skuCount } = await lovable
    .from('skus')
    .select('*', { count: 'exact', head: true });

  console.log(`   SKUs in Lovable: ${skuCount}`);
  console.log(`   SKU mappings: ${Object.keys(skuMap).length}`);

  const { count: productCount } = await lovable
    .from('product')
    .select('*', { count: 'exact', head: true });

  console.log(`   Products in Lovable: ${productCount}`);
  console.log(`   Product mappings: ${Object.keys(productMap).length}`);

  // ========== FINAL SUMMARY ==========
  console.log('\n✅ SKU Gap Resolution Complete!\n');
  console.log('Summary:');
  console.log(`  Products imported: ${productsImported}`);
  console.log(`  SKUs imported: ${skusImported}`);
  console.log(`  Total SKUs in Lovable: ${skuCount}`);
  console.log(`  Total Products in Lovable: ${productCount}`);
  console.log(`\n🎯 Next Step: Re-run OrderLine migration to unblock 2,206+ orderlines`);
}

main().catch(console.error);
