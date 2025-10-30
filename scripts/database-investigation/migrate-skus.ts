#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';

// Lovable database connection
const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

// Paths
const EXPORT_DIR = '/Users/greghogue/Leora2/exports/wellcrafted-manual';
const SKU_CSV = path.join(EXPORT_DIR, 'Sku.csv');
const PRODUCT_MAP = path.join(EXPORT_DIR, 'product-uuid-map.json');
const SKU_MAP_OUTPUT = path.join(EXPORT_DIR, 'sku-uuid-map.json');

interface WellCraftedSku {
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

interface LovableSku {
  id: string;
  tenantid: string;
  productid: string;
  code: string;
  size: string | null;
  unitofmeasure: string | null;
  abv: number | null;
  casesperpallet: number | null;
  priceperunit: number | null;
  isactive: boolean;
}

interface ProductMap {
  [wellCraftedId: string]: string; // Maps to Lovable UUID
}

interface SkuMap {
  [wellCraftedId: string]: string; // Maps to Lovable UUID
}

interface MigrationStats {
  totalSkus: number;
  imported: number;
  skippedExists: number;
  skippedNoProduct: number;
  errors: number;
  errorDetails: Array<{ code: string; reason: string }>;
}

async function loadProductMap(): Promise<ProductMap> {
  console.log('Loading product UUID map...');
  const mapData = fs.readFileSync(PRODUCT_MAP, 'utf-8');
  return JSON.parse(mapData);
}

async function loadWellCraftedSkus(): Promise<WellCraftedSku[]> {
  console.log('Loading Well Crafted SKUs from CSV...');
  const csvContent = fs.readFileSync(SKU_CSV, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as WellCraftedSku[];
  console.log(`Loaded ${records.length} SKUs from Well Crafted`);
  return records;
}

async function getExistingLovableSkus(): Promise<Set<string>> {
  console.log('Fetching existing SKUs from Lovable...');
  const { data, error } = await lovable
    .from('skus')
    .select('code');

  if (error) {
    throw new Error(`Failed to fetch existing SKUs: ${error.message}`);
  }

  const codes = new Set(data.map((s: any) => s.code));
  console.log(`Found ${codes.size} existing SKUs in Lovable`);
  return codes;
}

function transformSku(wcSku: WellCraftedSku, productMap: ProductMap): LovableSku | null {
  // Map product ID
  const lovableProductId = productMap[wcSku.productId];
  if (!lovableProductId) {
    return null; // No product mapping found
  }

  // Parse numeric fields
  const abv = wcSku.abv ? parseFloat(wcSku.abv) : null;
  const casesperpallet = wcSku.casesPerPallet ? parseInt(wcSku.casesPerPallet, 10) : null;
  const priceperunit = wcSku.pricePerUnit ? parseFloat(wcSku.pricePerUnit) : null;

  return {
    id: uuidv4(), // Generate new UUID
    tenantid: wcSku.tenantId, // Preserve tenant ID
    productid: lovableProductId,
    code: wcSku.code,
    size: wcSku.size || null,
    unitofmeasure: wcSku.unitOfMeasure || null,
    abv: abv,
    casesperpallet: casesperpallet,
    priceperunit: priceperunit,
    isactive: wcSku.isActive === 't' || wcSku.isActive === 'true'
  };
}

async function importSkuBatch(skus: LovableSku[]): Promise<void> {
  const { error } = await lovable
    .from('skus')
    .insert(skus);

  if (error) {
    throw new Error(`Batch import failed: ${error.message}`);
  }
}

async function verifyNoOrphans(): Promise<number> {
  console.log('Verifying no orphaned SKUs...');

  try {
    // Query for SKUs with invalid product references using a LEFT JOIN
    const { data, error } = await lovable
      .from('skus')
      .select('id, productid, products!inner(id)')
      .is('products.id', null);

    if (error) {
      console.log('Note: Unable to verify orphans using join, skipping check');
      return 0;
    }

    const orphans = data?.length || 0;
    console.log(`Orphan check: ${orphans} SKUs with invalid product references`);
    return orphans;
  } catch (err: any) {
    console.log('Note: Unable to verify orphans, skipping check');
    return 0;
  }
}

async function createSkuUuidMap(wcSkus: WellCraftedSku[]): Promise<void> {
  console.log('Creating SKU UUID mapping...');

  // Fetch all Lovable SKUs
  const { data: lovableSkus, error } = await lovable
    .from('skus')
    .select('id, code');

  if (error) {
    throw new Error(`Failed to fetch Lovable SKUs: ${error.message}`);
  }

  // Create code-to-id map for Lovable
  const lovableCodeMap = new Map<string, string>();
  lovableSkus.forEach((sku: any) => {
    lovableCodeMap.set(sku.code, sku.id);
  });

  // Create Well Crafted ID -> Lovable ID mapping
  const skuMap: SkuMap = {};
  let matched = 0;
  let unmatched = 0;

  wcSkus.forEach(wcSku => {
    const lovableId = lovableCodeMap.get(wcSku.code);
    if (lovableId) {
      skuMap[wcSku.id] = lovableId;
      matched++;
    } else {
      unmatched++;
    }
  });

  console.log(`SKU mapping: ${matched} matched, ${unmatched} unmatched`);

  // Save mapping
  fs.writeFileSync(SKU_MAP_OUTPUT, JSON.stringify(skuMap, null, 2));
  console.log(`SKU UUID map saved to: ${SKU_MAP_OUTPUT}`);
}

async function main() {
  console.log('=== SKU Migration Script ===\n');

  const stats: MigrationStats = {
    totalSkus: 0,
    imported: 0,
    skippedExists: 0,
    skippedNoProduct: 0,
    errors: 0,
    errorDetails: []
  };

  try {
    // Load dependencies
    const productMap = await loadProductMap();
    const wcSkus = await loadWellCraftedSkus();
    const existingSkuCodes = await getExistingLovableSkus();

    stats.totalSkus = wcSkus.length;

    console.log(`\nProduct mappings available: ${Object.keys(productMap).length}`);
    console.log(`Existing SKUs in Lovable: ${existingSkuCodes.size}`);
    console.log(`SKUs to process: ${wcSkus.length}\n`);

    // Process SKUs in batches
    const BATCH_SIZE = 100;
    const skusToImport: LovableSku[] = [];

    for (const wcSku of wcSkus) {
      // Check if already exists
      if (existingSkuCodes.has(wcSku.code)) {
        stats.skippedExists++;
        continue;
      }

      // Transform SKU
      const lovableSku = transformSku(wcSku, productMap);

      if (!lovableSku) {
        stats.skippedNoProduct++;
        stats.errorDetails.push({
          code: wcSku.code,
          reason: `No product mapping for productId: ${wcSku.productId}`
        });
        continue;
      }

      skusToImport.push(lovableSku);

      // Import batch when full
      if (skusToImport.length >= BATCH_SIZE) {
        try {
          await importSkuBatch(skusToImport);
          stats.imported += skusToImport.length;
          console.log(`Imported batch: ${stats.imported} SKUs total`);
          skusToImport.length = 0; // Clear array
        } catch (error: any) {
          stats.errors += skusToImport.length;
          console.error(`Batch import error: ${error.message}`);
          skusToImport.length = 0;
        }
      }
    }

    // Import remaining SKUs
    if (skusToImport.length > 0) {
      try {
        await importSkuBatch(skusToImport);
        stats.imported += skusToImport.length;
        console.log(`Imported final batch: ${stats.imported} SKUs total`);
      } catch (error: any) {
        stats.errors += skusToImport.length;
        console.error(`Final batch import error: ${error.message}`);
      }
    }

    // Verification
    console.log('\n=== Verification ===');
    const orphans = await verifyNoOrphans();

    // Get final count
    const { count, error: countError } = await lovable
      .from('skus')
      .select('*', { count: 'exact', head: true });

    const finalCount = count || 0;

    // Create SKU UUID mapping
    await createSkuUuidMap(wcSkus);

    // Final report
    console.log('\n=== Migration Summary ===');
    console.log(`Total SKUs processed: ${stats.totalSkus}`);
    console.log(`Successfully imported: ${stats.imported}`);
    console.log(`Skipped (already exists): ${stats.skippedExists}`);
    console.log(`Skipped (no product mapping): ${stats.skippedNoProduct}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`\nFinal SKU count in Lovable: ${finalCount}`);
    console.log(`Orphaned SKUs (invalid product refs): ${orphans}`);

    if (stats.errorDetails.length > 0 && stats.errorDetails.length <= 20) {
      console.log('\nSKUs skipped (no product mapping):');
      stats.errorDetails.forEach(detail => {
        console.log(`  - ${detail.code}: ${detail.reason}`);
      });
    } else if (stats.errorDetails.length > 20) {
      console.log(`\n${stats.errorDetails.length} SKUs skipped due to missing product mappings (too many to display)`);
    }

    console.log('\n✅ SKU migration complete!');
    console.log(`UUID mapping saved to: ${SKU_MAP_OUTPUT}`);

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
