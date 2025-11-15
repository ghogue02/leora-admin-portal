#!/usr/bin/env tsx
/**
 * HAL Data Import Script with Transaction-based Rollback
 *
 * This script imports HAL product data with full transaction safety:
 * - Batch processing with automatic rollback on error
 * - Vintage detection and variant SKU creation
 * - Progress tracking with checkpoint resume capability
 * - Comprehensive import reporting
 * - Dry-run mode for testing
 *
 * Usage:
 *   npx tsx src/scripts/import-hal-data.ts --confirm [options]
 *
 * Options:
 *   --confirm              Required to actually run the import (safety flag)
 *   --dry-run              Show what would be imported without making changes
 *   --batch-size <n>       Number of products per transaction (default: 100)
 *   --resume               Resume from last checkpoint
 *   --skip-inventory       Import product data only, skip inventory
 *   --output <file>        Save detailed report to JSON file
 *   --input <file>         Override input file (default: latest HAL export)
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface HALProduct {
  name: string;
  sku: string;
  manufacturer?: string;
  supplier?: string;
  labelAlcohol?: string;
  itemsPerCase?: string;
  virginiaABCCode?: string;
  warehouseLocation?: string;
  itemBarcode?: string;
  inventory: Array<{
    warehouse: string;
    quantity: string;
    cases?: string;
    pending?: string;
  }>;
  description?: string;
  url?: string;
  extractedAt?: string;
}

interface ImportOptions {
  confirm: boolean;
  dryRun: boolean;
  batchSize: number;
  resume: boolean;
  skipInventory: boolean;
  outputFile?: string;
  inputFile?: string;
}

interface VintageInfo {
  vintage: number;
  baseProductName: string;
}

interface LocationParsed {
  aisle?: string;
  row?: number;
  shelf?: string;
  bin?: string;
  binLocation: string;
}

interface ImportStats {
  totalProcessed: number;
  productsUpdated: number;
  skusUpdated: number;
  skusCreated: number;
  inventoryCreated: number;
  inventoryUpdated: number;
  suppliersCreated: number;
  variantsCreated: number;
  errors: number;
  skipped: number;
  batchesCompleted: number;
}

interface ImportResult {
  summary: ImportStats;
  updates: Array<{
    sku: string;
    action: string;
    details: any;
  }>;
  errors: Array<{
    sku: string;
    error: string;
    details?: any;
  }>;
  skipped: Array<{
    sku: string;
    reason: string;
  }>;
}

interface Checkpoint {
  lastProcessedIndex: number;
  timestamp: string;
  stats: ImportStats;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TENANT_ID = '4519729e-cd63-4fc1-84b6-d0d75abe2796';
const CHECKPOINT_FILE = path.join(__dirname, '../../data/import-checkpoint.json');
const DEFAULT_INPUT = '/Users/greghogue/Leora2/scripts/hal-scraper/output/products-progress-2025-11-15T02-19-05-574Z.json';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract vintage year from product name
 */
function extractVintage(productName: string): VintageInfo | null {
  // Match 4-digit year at end of name: "Product Name 2023"
  const vintageMatch = productName.match(/\b(20\d{2}|19\d{2})\s*$/);

  if (vintageMatch) {
    const vintage = parseInt(vintageMatch[1], 10);
    const baseProductName = productName.replace(/\s*\b(20\d{2}|19\d{2})\s*$/, '').trim();
    return { vintage, baseProductName };
  }

  return null;
}

/**
 * Parse warehouse location into components
 * Examples: "12-C1", "11-H1 / 11-H3", "19-A7"
 */
function parseWarehouseLocation(location: string): LocationParsed {
  const result: LocationParsed = {
    binLocation: location
  };

  // Take first location if multiple (e.g., "11-H1 / 11-H3" -> "11-H1")
  const firstLocation = location.split('/')[0]?.trim();
  if (!firstLocation) return result;

  // Parse format: "12-C1" or "11-H3"
  const match = firstLocation.match(/^(\d+)-([A-Z])(\d+)?$/);
  if (match) {
    result.aisle = match[1];
    result.shelf = match[2];
    if (match[3]) {
      result.row = parseInt(match[3], 10);
    }
  }

  return result;
}

/**
 * Load checkpoint from disk
 */
function loadCheckpoint(): Checkpoint | null {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const data = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️  Failed to load checkpoint:', error);
  }
  return null;
}

/**
 * Save checkpoint to disk
 */
function saveCheckpoint(checkpoint: Checkpoint): void {
  try {
    const dir = path.dirname(CHECKPOINT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
  } catch (error) {
    console.error('❌ Failed to save checkpoint:', error);
  }
}

/**
 * Delete checkpoint file
 */
function clearCheckpoint(): void {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      fs.unlinkSync(CHECKPOINT_FILE);
    }
  } catch (error) {
    console.warn('⚠️  Failed to clear checkpoint:', error);
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): ImportOptions {
  const args = process.argv.slice(2);
  const options: ImportOptions = {
    confirm: false,
    dryRun: false,
    batchSize: 100,
    resume: false,
    skipInventory: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--confirm':
        options.confirm = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i] || '100', 10);
        break;
      case '--resume':
        options.resume = true;
        break;
      case '--skip-inventory':
        options.skipInventory = true;
        break;
      case '--output':
        options.outputFile = args[++i];
        break;
      case '--input':
        options.inputFile = args[++i];
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
HAL Data Import Script

Usage:
  npx tsx src/scripts/import-hal-data.ts --confirm [options]

Options:
  --confirm              Required to actually run the import (safety flag)
  --dry-run              Show what would be imported without making changes
  --batch-size <n>       Number of products per transaction (default: 100)
  --resume               Resume from last checkpoint
  --skip-inventory       Import product data only, skip inventory
  --output <file>        Save detailed report to JSON file
  --input <file>         Override input file (default: latest HAL export)
  --help                 Show this help message

Examples:
  # Dry run to preview changes
  npx tsx src/scripts/import-hal-data.ts --dry-run

  # Actual import with default settings
  npx tsx src/scripts/import-hal-data.ts --confirm

  # Import with custom batch size and save report
  npx tsx src/scripts/import-hal-data.ts --confirm --batch-size 50 --output report.json

  # Resume interrupted import
  npx tsx src/scripts/import-hal-data.ts --confirm --resume
`);
}

/**
 * Load HAL products from JSON file
 */
function loadHALProducts(inputFile?: string): HALProduct[] {
  const filePath = inputFile || DEFAULT_INPUT;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  const data = fs.readFileSync(filePath, 'utf-8');
  const products = JSON.parse(data) as HALProduct[];

  console.log(`📂 Loaded ${products.length} products from ${path.basename(filePath)}`);

  return products;
}

// ============================================================================
// IMPORT LOGIC
// ============================================================================

/**
 * Process a single HAL product within a transaction
 */
async function processProduct(
  tx: Prisma.TransactionClient,
  halProduct: HALProduct,
  options: ImportOptions,
  result: ImportResult
): Promise<void> {
  const { sku: skuCode, name, manufacturer, supplier, description } = halProduct;

  try {
    // Step 1: Find existing SKU in database
    const existingSku = await tx.sku.findFirst({
      where: {
        tenantId: TENANT_ID,
        code: skuCode
      },
      include: {
        product: true
      }
    });

    if (!existingSku) {
      result.skipped.push({
        sku: skuCode,
        reason: 'SKU not found in database (per import safety rules)'
      });
      result.summary.skipped++;
      return;
    }

    // Step 2: Check for vintage variants
    const vintageInfo = extractVintage(name);
    let targetSku = existingSku;
    let targetProduct = existingSku.product;

    if (vintageInfo && vintageInfo.vintage !== targetProduct.vintage) {
      // Create variant SKU for different vintage
      const variantSkuCode = `${skuCode}-${vintageInfo.vintage}`;

      // Check if variant already exists
      const existingVariant = await tx.sku.findFirst({
        where: {
          tenantId: TENANT_ID,
          code: variantSkuCode
        },
        include: { product: true }
      });

      if (!existingVariant) {
        if (options.dryRun) {
          console.log(`  [DRY RUN] Would create variant SKU: ${variantSkuCode} (vintage ${vintageInfo.vintage})`);
        } else {
          // Create new product for this vintage
          const newProduct = await tx.product.create({
            data: {
              tenantId: TENANT_ID,
              name: name,
              brand: targetProduct.brand,
              description: description || targetProduct.description,
              category: targetProduct.category,
              manufacturer: manufacturer || targetProduct.manufacturer,
              vintage: vintageInfo.vintage,
              supplierId: targetProduct.supplierId,
              colour: targetProduct.colour,
              varieties: targetProduct.varieties,
              style: targetProduct.style,
            }
          });

          // Create variant SKU
          const newSku = await tx.sku.create({
            data: {
              tenantId: TENANT_ID,
              productId: newProduct.id,
              code: variantSkuCode,
              size: existingSku.size,
              unitOfMeasure: existingSku.unitOfMeasure,
              abv: halProduct.labelAlcohol ? parseFloat(halProduct.labelAlcohol) : existingSku.abv,
              itemsPerCase: halProduct.itemsPerCase ? parseInt(halProduct.itemsPerCase, 10) : existingSku.itemsPerCase,
              bottleBarcode: halProduct.itemBarcode || existingSku.bottleBarcode,
              abcCodeNumber: halProduct.virginiaABCCode || existingSku.abcCodeNumber,
              pricePerUnit: existingSku.pricePerUnit,
              isActive: true,
            }
          });

          targetSku = newSku;
          targetProduct = newProduct;
          result.summary.variantsCreated++;

          result.updates.push({
            sku: variantSkuCode,
            action: 'variant_created',
            details: {
              vintage: vintageInfo.vintage,
              baseSku: skuCode,
              productId: newProduct.id
            }
          });
        }
      } else {
        targetSku = existingVariant;
        targetProduct = existingVariant.product;
      }
    }

    // Step 3: Update Product fields
    const productUpdateData: Prisma.ProductUpdateInput = {};
    let hasProductUpdates = false;

    if (description && description !== targetProduct.description) {
      productUpdateData.description = description;
      hasProductUpdates = true;
    }

    if (manufacturer && manufacturer !== targetProduct.manufacturer) {
      productUpdateData.manufacturer = manufacturer;
      hasProductUpdates = true;
    }

    if (halProduct.virginiaABCCode && halProduct.virginiaABCCode !== targetProduct.abcCode) {
      productUpdateData.abcCode = halProduct.virginiaABCCode;
      hasProductUpdates = true;
    }

    if (hasProductUpdates) {
      if (options.dryRun) {
        console.log(`  [DRY RUN] Would update product ${targetProduct.id}:`, productUpdateData);
      } else {
        await tx.product.update({
          where: { id: targetProduct.id },
          data: productUpdateData
        });

        result.summary.productsUpdated++;
        result.updates.push({
          sku: targetSku.code,
          action: 'product_updated',
          details: productUpdateData
        });
      }
    }

    // Step 4: Update SKU fields
    const skuUpdateData: Prisma.SkuUpdateInput = {};
    let hasSkuUpdates = false;

    if (halProduct.labelAlcohol) {
      const abv = parseFloat(halProduct.labelAlcohol);
      if (!isNaN(abv) && abv !== targetSku.abv) {
        skuUpdateData.abv = abv;
        hasSkuUpdates = true;
      }
    }

    if (halProduct.itemsPerCase) {
      const itemsPerCase = parseInt(halProduct.itemsPerCase, 10);
      if (!isNaN(itemsPerCase) && itemsPerCase !== targetSku.itemsPerCase) {
        skuUpdateData.itemsPerCase = itemsPerCase;
        hasSkuUpdates = true;
      }
    }

    if (halProduct.itemBarcode && halProduct.itemBarcode !== targetSku.bottleBarcode) {
      // Clean barcode (remove "(On Bottle)" suffix)
      const cleanBarcode = halProduct.itemBarcode.replace(/\s*\(.*?\)\s*$/i, '').trim();
      skuUpdateData.bottleBarcode = cleanBarcode;
      hasSkuUpdates = true;
    }

    if (halProduct.virginiaABCCode && halProduct.virginiaABCCode !== targetSku.abcCodeNumber) {
      skuUpdateData.abcCodeNumber = halProduct.virginiaABCCode;
      hasSkuUpdates = true;
    }

    if (hasSkuUpdates) {
      if (options.dryRun) {
        console.log(`  [DRY RUN] Would update SKU ${targetSku.code}:`, skuUpdateData);
      } else {
        await tx.sku.update({
          where: { id: targetSku.id },
          data: skuUpdateData
        });

        result.summary.skusUpdated++;
        result.updates.push({
          sku: targetSku.code,
          action: 'sku_updated',
          details: skuUpdateData
        });
      }
    }

    // Step 5: Handle Supplier
    if (supplier) {
      let supplierRecord = await tx.supplier.findFirst({
        where: {
          tenantId: TENANT_ID,
          name: supplier
        }
      });

      if (!supplierRecord) {
        if (options.dryRun) {
          console.log(`  [DRY RUN] Would create supplier: ${supplier}`);
        } else {
          supplierRecord = await tx.supplier.create({
            data: {
              tenantId: TENANT_ID,
              name: supplier
            }
          });

          result.summary.suppliersCreated++;
          result.updates.push({
            sku: targetSku.code,
            action: 'supplier_created',
            details: { name: supplier, id: supplierRecord.id }
          });
        }
      }

      // Link supplier to product if not already linked
      if (supplierRecord && targetProduct.supplierId !== supplierRecord.id) {
        if (options.dryRun) {
          console.log(`  [DRY RUN] Would link product to supplier: ${supplier}`);
        } else {
          await tx.product.update({
            where: { id: targetProduct.id },
            data: { supplierId: supplierRecord.id }
          });

          result.updates.push({
            sku: targetSku.code,
            action: 'supplier_linked',
            details: { supplierId: supplierRecord.id }
          });
        }
      }
    }

    // Step 6: Create/Update Inventory (if not skipped)
    if (!options.skipInventory && halProduct.inventory && halProduct.inventory.length > 0) {
      for (const invEntry of halProduct.inventory) {
        const quantity = parseInt(invEntry.quantity || '0', 10);
        const location = invEntry.warehouse;

        if (isNaN(quantity) || quantity < 0) continue;

        // Parse warehouse location
        const locationData = halProduct.warehouseLocation
          ? parseWarehouseLocation(halProduct.warehouseLocation)
          : { binLocation: location };

        // Check if inventory exists
        const existingInventory = await tx.inventory.findUnique({
          where: {
            tenantId_skuId_location: {
              tenantId: TENANT_ID,
              skuId: targetSku.id,
              location: location
            }
          }
        });

        if (existingInventory) {
          if (existingInventory.onHand !== quantity) {
            if (options.dryRun) {
              console.log(`  [DRY RUN] Would update inventory ${location}: ${existingInventory.onHand} -> ${quantity}`);
            } else {
              await tx.inventory.update({
                where: {
                  tenantId_skuId_location: {
                    tenantId: TENANT_ID,
                    skuId: targetSku.id,
                    location: location
                  }
                },
                data: {
                  onHand: quantity,
                  ...locationData
                }
              });

              result.summary.inventoryUpdated++;
            }
          }
        } else {
          if (options.dryRun) {
            console.log(`  [DRY RUN] Would create inventory ${location}: ${quantity} units`);
          } else {
            await tx.inventory.create({
              data: {
                tenantId: TENANT_ID,
                skuId: targetSku.id,
                location: location,
                onHand: quantity,
                allocated: 0,
                ...locationData
              }
            });

            result.summary.inventoryCreated++;
          }
        }
      }
    }

    result.summary.totalProcessed++;

  } catch (error: any) {
    result.errors.push({
      sku: skuCode,
      error: error.message,
      details: error
    });
    result.summary.errors++;
    throw error; // Re-throw to rollback transaction
  }
}

/**
 * Process a batch of products in a single transaction
 */
async function processBatch(
  prisma: PrismaClient,
  batch: HALProduct[],
  options: ImportOptions,
  result: ImportResult
): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      for (const product of batch) {
        await processProduct(tx, product, options, result);
      }
    },
    {
      maxWait: 10000,   // 10 seconds max wait to start transaction
      timeout: 60000,   // 60 seconds max transaction time
    }
  );

  result.summary.batchesCompleted++;
}

/**
 * Main import function
 */
async function runImport(options: ImportOptions): Promise<ImportResult> {
  const prisma = new PrismaClient();

  const result: ImportResult = {
    summary: {
      totalProcessed: 0,
      productsUpdated: 0,
      skusUpdated: 0,
      skusCreated: 0,
      inventoryCreated: 0,
      inventoryUpdated: 0,
      suppliersCreated: 0,
      variantsCreated: 0,
      errors: 0,
      skipped: 0,
      batchesCompleted: 0,
    },
    updates: [],
    errors: [],
    skipped: []
  };

  try {
    // Load products
    const halProducts = loadHALProducts(options.inputFile);

    // Handle resume
    let startIndex = 0;
    if (options.resume) {
      const checkpoint = loadCheckpoint();
      if (checkpoint) {
        startIndex = checkpoint.lastProcessedIndex + 1;
        result.summary = checkpoint.stats;
        console.log(`📍 Resuming from index ${startIndex} (${checkpoint.timestamp})`);
      } else {
        console.log('⚠️  No checkpoint found, starting from beginning');
      }
    }

    // Process in batches
    const totalBatches = Math.ceil((halProducts.length - startIndex) / options.batchSize);
    console.log(`\n🚀 Processing ${halProducts.length - startIndex} products in ${totalBatches} batches`);
    console.log(`📦 Batch size: ${options.batchSize}`);
    console.log(`🔍 Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE IMPORT'}\n`);

    for (let i = startIndex; i < halProducts.length; i += options.batchSize) {
      const batchNum = Math.floor((i - startIndex) / options.batchSize) + 1;
      const batch = halProducts.slice(i, i + options.batchSize);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (products ${i + 1}-${Math.min(i + options.batchSize, halProducts.length)})`);

      try {
        await processBatch(prisma, batch, options, result);

        // Save checkpoint every batch
        if (!options.dryRun) {
          saveCheckpoint({
            lastProcessedIndex: i + batch.length - 1,
            timestamp: new Date().toISOString(),
            stats: result.summary
          });
        }

        console.log(`  ✅ Batch completed: ${result.summary.totalProcessed} processed, ${result.summary.errors} errors`);
      } catch (error: any) {
        console.error(`  ❌ Batch failed, rolling back: ${error.message}`);
        // Transaction automatically rolled back
        // Continue to next batch if not in strict mode
      }

      // Progress update
      const progress = ((i + batch.length) / halProducts.length * 100).toFixed(1);
      console.log(`  📊 Overall progress: ${progress}%`);
    }

    // Clear checkpoint on successful completion
    if (!options.dryRun && result.summary.errors === 0) {
      clearCheckpoint();
    }

  } finally {
    await prisma.$disconnect();
  }

  return result;
}

/**
 * Print import summary
 */
function printSummary(result: ImportResult, options: ImportOptions): void {
  console.log('\n' + '='.repeat(80));
  console.log('📊 IMPORT SUMMARY');
  console.log('='.repeat(80));

  const { summary } = result;

  console.log(`\n✅ Successfully Processed: ${summary.totalProcessed}`);
  console.log(`   Products Updated:       ${summary.productsUpdated}`);
  console.log(`   SKUs Updated:           ${summary.skusUpdated}`);
  console.log(`   Variant SKUs Created:   ${summary.variantsCreated}`);
  console.log(`   Suppliers Created:      ${summary.suppliersCreated}`);

  if (!options.skipInventory) {
    console.log(`   Inventory Created:      ${summary.inventoryCreated}`);
    console.log(`   Inventory Updated:      ${summary.inventoryUpdated}`);
  }

  console.log(`\n⚠️  Skipped:                ${summary.skipped}`);
  console.log(`❌ Errors:                 ${summary.errors}`);
  console.log(`📦 Batches Completed:      ${summary.batchesCompleted}`);

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    result.errors.slice(0, 10).forEach(err => {
      console.log(`   ${err.sku}: ${err.error}`);
    });
    if (result.errors.length > 10) {
      console.log(`   ... and ${result.errors.length - 10} more errors`);
    }
  }

  if (result.skipped.length > 0 && result.skipped.length <= 20) {
    console.log('\n⚠️  SKIPPED:');
    result.skipped.forEach(skip => {
      console.log(`   ${skip.sku}: ${skip.reason}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

/**
 * Save detailed report to JSON
 */
function saveReport(result: ImportResult, outputFile: string): void {
  try {
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`\n💾 Detailed report saved to: ${outputFile}`);
  } catch (error) {
    console.error(`\n❌ Failed to save report: ${error}`);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🚀 HAL Data Import Script\n');

  const options = parseArgs();

  // Safety checks
  if (!options.dryRun && !options.confirm) {
    console.error('❌ ERROR: --confirm flag is required for actual import');
    console.log('\nRun with --dry-run first to preview changes:');
    console.log('  npx tsx src/scripts/import-hal-data.ts --dry-run\n');
    console.log('Then run with --confirm when ready:');
    console.log('  npx tsx src/scripts/import-hal-data.ts --confirm\n');
    process.exit(1);
  }

  if (!options.dryRun) {
    console.log('⚠️  WARNING: This will modify the database!');
    console.log('📝 Recommendation: Create a database backup first\n');
    console.log('Press Ctrl+C to cancel, or waiting 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Run import
  const startTime = Date.now();
  const result = await runImport(options);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  printSummary(result, options);

  console.log(`\n⏱️  Total time: ${duration}s`);

  // Save report if requested
  if (options.outputFile) {
    saveReport(result, options.outputFile);
  }

  // Exit with appropriate code
  process.exit(result.summary.errors > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}

export { runImport, ImportOptions, ImportResult };
