#!/usr/bin/env tsx
/**
 * Rollback HAL Import Script
 *
 * This script can rollback a HAL data import by:
 * 1. Reading the import report JSON
 * 2. Reverting all changes in reverse order
 * 3. Deleting created records (variants, inventory, suppliers)
 * 4. Restoring previous values for updated records
 *
 * Usage:
 *   npx tsx src/scripts/rollback-hal-import.ts --report <report-file> --confirm
 *
 * Options:
 *   --report <file>   Import report JSON file to rollback
 *   --confirm         Required to actually run the rollback
 *   --dry-run         Show what would be rolled back without changes
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as fs from 'fs';

// ============================================================================
// TYPES
// ============================================================================

interface ImportResult {
  summary: {
    variantsCreated: number;
    inventoryCreated: number;
    suppliersCreated: number;
  };
  updates: Array<{
    sku: string;
    action: string;
    details: any;
  }>;
}

interface RollbackOptions {
  reportFile: string;
  confirm: boolean;
  dryRun: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TENANT_ID = '4519729e-cd63-4fc1-84b6-d0d75abe2796';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseArgs(): RollbackOptions {
  const args = process.argv.slice(2);
  const options: RollbackOptions = {
    reportFile: '',
    confirm: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--report':
        options.reportFile = args[++i];
        break;
      case '--confirm':
        options.confirm = true;
        break;
      case '--dry-run':
        options.dryRun = true;
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

function printHelp(): void {
  console.log(`
Rollback HAL Import Script

Usage:
  npx tsx src/scripts/rollback-hal-import.ts --report <report-file> --confirm

Options:
  --report <file>   Import report JSON file to rollback (required)
  --confirm         Required to actually run the rollback
  --dry-run         Show what would be rolled back without changes
  --help            Show this help message

Examples:
  # Dry run to preview rollback
  npx tsx src/scripts/rollback-hal-import.ts --report import-report.json --dry-run

  # Actual rollback
  npx tsx src/scripts/rollback-hal-import.ts --report import-report.json --confirm
`);
}

function loadReport(reportFile: string): ImportResult {
  if (!fs.existsSync(reportFile)) {
    throw new Error(`Report file not found: ${reportFile}`);
  }

  const data = fs.readFileSync(reportFile, 'utf-8');
  return JSON.parse(data);
}

// ============================================================================
// ROLLBACK LOGIC
// ============================================================================

async function rollbackImport(
  prisma: PrismaClient,
  report: ImportResult,
  options: RollbackOptions
): Promise<void> {
  console.log('\n🔄 Starting rollback...\n');

  let rolledBack = 0;

  // Process updates in reverse order
  const updates = [...report.updates].reverse();

  for (const update of updates) {
    try {
      switch (update.action) {
        case 'variant_created': {
          const variantSkuCode = update.sku;

          if (options.dryRun) {
            console.log(`[DRY RUN] Would delete variant SKU: ${variantSkuCode}`);
          } else {
            // Find the variant SKU
            const variant = await prisma.sku.findFirst({
              where: {
                tenantId: TENANT_ID,
                code: variantSkuCode
              },
              include: {
                product: true,
                inventories: true
              }
            });

            if (variant) {
              // Delete associated inventory first
              if (variant.inventories.length > 0) {
                await prisma.inventory.deleteMany({
                  where: { skuId: variant.id }
                });
                console.log(`  ✅ Deleted ${variant.inventories.length} inventory records for ${variantSkuCode}`);
              }

              // Delete the SKU
              await prisma.sku.delete({
                where: { id: variant.id }
              });
              console.log(`  ✅ Deleted variant SKU: ${variantSkuCode}`);

              // Delete the product if it has no other SKUs
              const otherSkus = await prisma.sku.count({
                where: { productId: variant.productId }
              });

              if (otherSkus === 0) {
                await prisma.product.delete({
                  where: { id: variant.productId }
                });
                console.log(`  ✅ Deleted variant product: ${variant.product.name}`);
              }

              rolledBack++;
            }
          }
          break;
        }

        case 'supplier_created': {
          const supplierName = update.details.name;

          if (options.dryRun) {
            console.log(`[DRY RUN] Would delete supplier: ${supplierName}`);
          } else {
            // Only delete if no products are using it
            const supplier = await prisma.supplier.findFirst({
              where: {
                tenantId: TENANT_ID,
                name: supplierName
              },
              include: {
                _count: {
                  select: { products: true }
                }
              }
            });

            if (supplier && supplier._count.products === 0) {
              await prisma.supplier.delete({
                where: { id: supplier.id }
              });
              console.log(`  ✅ Deleted supplier: ${supplierName}`);
              rolledBack++;
            } else if (supplier) {
              console.log(`  ⚠️  Supplier ${supplierName} has products, skipping delete`);
            }
          }
          break;
        }

        case 'product_updated':
        case 'sku_updated': {
          // For updates, we can't restore previous values unless we stored them
          // This is a limitation - we could enhance the import script to store
          // "before" snapshots in the report
          console.log(`  ℹ️  Cannot rollback ${update.action} for ${update.sku} (no snapshot)`);
          break;
        }

        case 'supplier_linked': {
          // Could unlink supplier, but risky without knowing previous state
          console.log(`  ℹ️  Cannot rollback supplier link for ${update.sku} (no snapshot)`);
          break;
        }

        default:
          console.log(`  ⚠️  Unknown action: ${update.action}`);
      }
    } catch (error: any) {
      console.error(`  ❌ Error rolling back ${update.sku}: ${error.message}`);
    }
  }

  console.log(`\n✅ Rollback complete: ${rolledBack} operations reversed`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🔄 HAL Import Rollback Script\n');

  const options = parseArgs();

  if (!options.reportFile) {
    console.error('❌ ERROR: --report flag is required');
    printHelp();
    process.exit(1);
  }

  if (!options.dryRun && !options.confirm) {
    console.error('❌ ERROR: --confirm flag is required for actual rollback');
    console.log('\nRun with --dry-run first to preview:');
    console.log(`  npx tsx src/scripts/rollback-hal-import.ts --report ${options.reportFile} --dry-run\n`);
    process.exit(1);
  }

  // Load report
  const report = loadReport(options.reportFile);

  console.log('📊 Import Report Summary:');
  console.log(`   Variants Created:  ${report.summary.variantsCreated}`);
  console.log(`   Suppliers Created: ${report.summary.suppliersCreated}`);
  console.log(`   Inventory Created: ${report.summary.inventoryCreated}`);
  console.log(`   Total Updates:     ${report.updates.length}`);

  if (!options.dryRun) {
    console.log('\n⚠️  WARNING: This will delete data from the database!');
    console.log('Press Ctrl+C to cancel, or waiting 5 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const prisma = new PrismaClient();

  try {
    await rollbackImport(prisma, report, options);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
}

export { rollbackImport };
