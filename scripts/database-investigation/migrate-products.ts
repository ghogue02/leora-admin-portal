#!/usr/bin/env tsx
/**
 * Product Migration Script: Well Crafted → Lovable
 *
 * Migrates ~2,140 missing products from Well Crafted CSV to Lovable database.
 * Creates UUID mapping file for subsequent SKU migration.
 *
 * Generated: 2025-10-23
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_ROLE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const CSV_PATH = '/Users/greghogue/Leora2/exports/wellcrafted-manual/Product.csv';
const UUID_MAP_PATH = '/Users/greghogue/Leora2/exports/wellcrafted-manual/product-uuid-map.json';

const BATCH_SIZE = 100; // Insert 100 products at a time

// ============================================================================
// TYPES
// ============================================================================

interface WellCraftedProductCSV {
  id: string;
  tenantId: string;
  supplierId: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  isSampleOnly: string;
  createdAt: string;
  updatedAt: string;
  tastingNotes: string;
  foodPairings: string;
  servingInfo: string;
  wineDetails: string;
  enrichedAt: string;
  enrichedBy: string;
}

interface LovableProduct {
  id: string;
  tenantid: string;
  sku: string; // REQUIRED field in Lovable
  name: string;
  brand: string | null;
  description: string | null;
  producer: string | null;
  unitprice: number; // REQUIRED - default to 0
  issampleonly: boolean;
  createdat: string;
  updatedat: string;
  tastingnotes: any | null;
  foodpairings: any | null;
  servinginfo: any | null;
  winedetails: any | null;
  enrichedat: string | null;
  enrichedby: string | null;
  supplierid: string | null;
  isactive: boolean;
}

interface MigrationStats {
  totalInCSV: number;
  alreadyInLovable: number;
  toMigrate: number;
  successfullyMigrated: number;
  failed: number;
  errors: Array<{ product: string; error: string }>;
  finalCount: number;
}

// ============================================================================
// MAIN MIGRATION FUNCTION
// ============================================================================

async function migrateProducts(): Promise<void> {
  console.log('🚀 Starting Product Migration: Well Crafted → Lovable\n');

  const stats: MigrationStats = {
    totalInCSV: 0,
    alreadyInLovable: 0,
    toMigrate: 0,
    successfullyMigrated: 0,
    failed: 0,
    errors: [],
    finalCount: 0,
  };

  // Initialize Lovable client
  const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Step 1: Read CSV
  console.log('📂 Step 1: Reading Well Crafted CSV...');
  const csvData = fs.readFileSync(CSV_PATH, 'utf-8');
  const wcProducts = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
  }) as WellCraftedProductCSV[];

  stats.totalInCSV = wcProducts.length;
  console.log(`   ✓ Found ${stats.totalInCSV} products in CSV\n`);

  // Step 2: Get existing products from Lovable
  console.log('🔍 Step 2: Checking existing products in Lovable...');
  const { data: existingProducts, error: fetchError } = await lovable
    .from('product')
    .select('id, name');

  if (fetchError) {
    console.error('   ❌ Error fetching existing products:', fetchError);
    throw fetchError;
  }

  const existingNames = new Set(existingProducts?.map(p => p.name.toLowerCase()) || []);
  const existingIds = new Set(existingProducts?.map(p => p.id) || []);

  console.log(`   ✓ Found ${existingProducts?.length || 0} existing products in Lovable\n`);

  // Step 3: Filter products to migrate
  console.log('🎯 Step 3: Filtering products to migrate...');
  const productsToMigrate = wcProducts.filter(p => {
    // Skip if product name already exists
    if (existingNames.has(p.name.toLowerCase())) {
      stats.alreadyInLovable++;
      return false;
    }
    // Skip if UUID already exists
    if (existingIds.has(p.id)) {
      stats.alreadyInLovable++;
      return false;
    }
    return true;
  });

  stats.toMigrate = productsToMigrate.length;
  console.log(`   ✓ ${stats.alreadyInLovable} products already in Lovable`);
  console.log(`   ✓ ${stats.toMigrate} products to migrate\n`);

  if (stats.toMigrate === 0) {
    console.log('✅ No products to migrate. All products already exist!\n');
    await generateReport(stats);
    return;
  }

  // Step 4: Transform and migrate in batches
  console.log('🔄 Step 4: Transforming and migrating products...');
  const uuidMap: Record<string, string> = {};

  for (let i = 0; i < productsToMigrate.length; i += BATCH_SIZE) {
    const batch = productsToMigrate.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(productsToMigrate.length / BATCH_SIZE);

    console.log(`   Processing batch ${batchNumber}/${totalBatches} (${batch.length} products)...`);

    const transformedBatch = batch.map(wcProduct => transformProduct(wcProduct));

    const { data, error } = await lovable
      .from('product')
      .insert(transformedBatch)
      .select('id');

    if (error) {
      console.error(`   ❌ Error inserting batch ${batchNumber}:`, error.message);
      stats.failed += batch.length;
      batch.forEach(p => {
        stats.errors.push({
          product: p.name,
          error: error.message,
        });
      });
    } else {
      stats.successfullyMigrated += batch.length;
      // Store UUID mapping
      batch.forEach((wcProduct, index) => {
        uuidMap[wcProduct.id] = wcProduct.id; // UUIDs are preserved
      });
      console.log(`   ✓ Batch ${batchNumber} inserted successfully`);
    }
  }

  console.log('');

  // Step 5: Save UUID mapping
  console.log('💾 Step 5: Saving UUID mapping...');
  fs.writeFileSync(UUID_MAP_PATH, JSON.stringify(uuidMap, null, 2));
  console.log(`   ✓ UUID mapping saved to: ${UUID_MAP_PATH}\n`);

  // Step 6: Verify final count
  console.log('✅ Step 6: Verifying final product count...');
  const { count: finalCount, error: countError } = await lovable
    .from('product')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('   ❌ Error counting products:', countError);
  } else {
    stats.finalCount = finalCount || 0;
    console.log(`   ✓ Final product count: ${stats.finalCount}\n`);
  }

  // Generate final report
  await generateReport(stats);
}

// ============================================================================
// TRANSFORMATION FUNCTION
// ============================================================================

/**
 * Generate a SKU from product name and ID
 * Format: SKU-{timestamp}-{random}
 */
function generateSku(productId: string, productName: string): string {
  // Use first 8 chars of product ID + timestamp for uniqueness
  const idPrefix = productId.substring(0, 8);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `SKU-${timestamp}-${random}`;
}

function transformProduct(wcProduct: WellCraftedProductCSV): LovableProduct {
  // Parse JSON fields if they exist
  const parseSafe = (field: string | null | undefined) => {
    if (!field || field.trim() === '') return null;
    try {
      return JSON.parse(field);
    } catch {
      return null;
    }
  };

  return {
    id: wcProduct.id, // UUID preserved
    tenantid: wcProduct.tenantId, // Keep tenantId - Lovable has this field
    sku: generateSku(wcProduct.id, wcProduct.name), // Generate unique SKU
    name: wcProduct.name,
    brand: wcProduct.brand || null,
    description: wcProduct.description || null,
    producer: null, // Not in Well Crafted CSV
    unitprice: 0, // Default to 0 - will be updated when SKUs are migrated
    issampleonly: wcProduct.isSampleOnly === 't' || wcProduct.isSampleOnly === 'true',
    createdat: wcProduct.createdAt,
    updatedat: wcProduct.updatedAt,
    tastingnotes: parseSafe(wcProduct.tastingNotes),
    foodpairings: parseSafe(wcProduct.foodPairings),
    servinginfo: parseSafe(wcProduct.servingInfo),
    winedetails: parseSafe(wcProduct.wineDetails),
    enrichedat: wcProduct.enrichedAt || null,
    enrichedby: wcProduct.enrichedBy || null,
    supplierid: wcProduct.supplierId || null,
    isactive: true, // Default to active
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

async function generateReport(stats: MigrationStats): Promise<void> {
  console.log('📊 MIGRATION REPORT');
  console.log('='.repeat(60));
  console.log(`Total products in CSV:        ${stats.totalInCSV}`);
  console.log(`Already in Lovable:           ${stats.alreadyInLovable}`);
  console.log(`Products to migrate:          ${stats.toMigrate}`);
  console.log(`Successfully migrated:        ${stats.successfullyMigrated}`);
  console.log(`Failed:                       ${stats.failed}`);
  console.log(`Final product count:          ${stats.finalCount}`);
  console.log('='.repeat(60));

  if (stats.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    stats.errors.forEach(({ product, error }) => {
      console.log(`   - ${product}: ${error}`);
    });
  }

  // Save report to file
  const reportPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/product-migration-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}\n`);

  // Success criteria check
  const expectedTotal = 3140; // From requirements
  const successRate = (stats.successfullyMigrated / stats.toMigrate) * 100;

  console.log('✅ SUCCESS CRITERIA CHECK:');
  console.log('='.repeat(60));
  console.log(`Expected total products:      ${expectedTotal}`);
  console.log(`Actual total products:        ${stats.finalCount}`);
  console.log(`Success rate:                 ${successRate.toFixed(2)}%`);
  console.log(`UUID mapping created:         ${fs.existsSync(UUID_MAP_PATH) ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));

  if (stats.finalCount >= expectedTotal && successRate > 95) {
    console.log('\n🎉 MIGRATION SUCCESSFUL! Ready for SKU migration.\n');
  } else {
    console.log('\n⚠️  MIGRATION INCOMPLETE. Review errors above.\n');
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

migrateProducts()
  .then(() => {
    console.log('✅ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
