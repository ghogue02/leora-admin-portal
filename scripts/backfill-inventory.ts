#!/usr/bin/env tsx

/**
 * Backfill Inventory Records - Sprint 5 Phase 4
 *
 * Creates default inventory records for 310 SKUs that are missing them.
 * Each SKU gets records for all 3 warehouses with 0 on hand.
 *
 * This resolves the "Out of stock (0 on hand)" display issue where
 * products show as unavailable due to missing inventory data.
 *
 * SAFE TO RUN MULTIPLE TIMES: Uses upsert to avoid duplicate records
 */

import { PrismaClient, InventoryStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Well Crafted tenant ID
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

// Known warehouse locations from diagnosis
const WAREHOUSES = ['Warrenton', 'Baltimore', 'main'];

async function backfillInventory() {
  console.log('🔧 Inventory Backfill Script\n');
  console.log('='.repeat(80));
  console.log('Purpose: Create default inventory records for SKUs missing them');
  console.log('Target: 310 SKUs × 3 warehouses = 930 potential records');
  console.log('='.repeat(80) + '\n');

  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Step 1: Find SKUs without ANY inventory records
    console.log('📊 Step 1: Identifying SKUs without inventory...');

    const skusWithoutInventory = await prisma.sku.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        inventories: { none: {} }
      },
      select: {
        id: true,
        code: true,
        product: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        code: 'asc'
      }
    });

    console.log(`Found ${skusWithoutInventory.length} SKUs without inventory records\n`);

    if (skusWithoutInventory.length === 0) {
      console.log('✅ All SKUs already have inventory records. Nothing to do!');
      return;
    }

    // Show sample of SKUs to be updated
    console.log('Sample SKUs to be backfilled:');
    skusWithoutInventory.slice(0, 10).forEach((sku, index) => {
      console.log(`  ${index + 1}. ${sku.code} - ${sku.product.name}`);
    });
    if (skusWithoutInventory.length > 10) {
      console.log(`  ... and ${skusWithoutInventory.length - 10} more\n`);
    }

    // Step 2: Create inventory records for each SKU × warehouse combination
    console.log('\n📦 Step 2: Creating inventory records...\n');

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const sku of skusWithoutInventory) {
      console.log(`Processing ${sku.code}...`);

      for (const location of WAREHOUSES) {
        try {
          // Use upsert to avoid duplicates if script is run multiple times
          const inventory = await prisma.inventory.upsert({
            where: {
              tenantId_skuId_location: {
                tenantId: TENANT_ID,
                skuId: sku.id,
                location: location
              }
            },
            update: {
              // Don't overwrite existing data if record exists
            },
            create: {
              tenantId: TENANT_ID,
              skuId: sku.id,
              location: location,
              onHand: 0,
              allocated: 0,
              status: InventoryStatus.AVAILABLE
            }
          });

          if (inventory.createdAt === inventory.updatedAt) {
            createdCount++;
            console.log(`  ✅ Created ${location} inventory`);
          } else {
            skippedCount++;
            console.log(`  ⏭️  ${location} already exists`);
          }
        } catch (error) {
          errorCount++;
          console.error(`  ❌ Error creating ${location}:`, error.message);
        }
      }
    }

    // Step 3: Verify results
    console.log('\n📊 Step 3: Verification...\n');

    const remainingWithoutInventory = await prisma.sku.count({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        inventories: { none: {} }
      }
    });

    const totalInventoryRecords = await prisma.inventory.count({
      where: { tenantId: TENANT_ID }
    });

    console.log('='.repeat(80));
    console.log('\n✅ BACKFILL COMPLETE!\n');
    console.log('Summary:');
    console.log(`  Records created: ${createdCount}`);
    console.log(`  Records skipped (already existed): ${skippedCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log(`  SKUs processed: ${skusWithoutInventory.length}`);
    console.log(`\nDatabase state after backfill:`);
    console.log(`  Total inventory records: ${totalInventoryRecords}`);
    console.log(`  SKUs still missing inventory: ${remainingWithoutInventory}`);

    if (remainingWithoutInventory > 0) {
      console.log('\n⚠️  Warning: Some SKUs still missing inventory. Check errors above.');
    } else {
      console.log('\n🎉 Success! All active SKUs now have inventory records.');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  backfillInventory()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { backfillInventory };
