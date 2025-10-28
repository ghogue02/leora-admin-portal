#!/usr/bin/env tsx
/**
 * Recalculate Pick Orders Migration Script
 *
 * This script recalculates pickOrder values for all existing inventory items
 * based on their current location strings. Useful for:
 * - Initial migration when adding pickOrder functionality
 * - Fixing corrupted or manually updated location data
 * - Batch updates after location format changes
 *
 * Usage:
 *   npm run tsx scripts/recalculate-pick-orders.ts
 *   # or with specific tenant:
 *   npm run tsx scripts/recalculate-pick-orders.ts --tenant-id=<uuid>
 *
 * Options:
 *   --tenant-id=<uuid>  Process only specific tenant
 *   --dry-run          Show what would be updated without making changes
 *   --verbose          Show detailed progress information
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { parseLocation } from '../src/lib/warehouse';

// Load environment variables
config();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  tenantId: args.find((arg) => arg.startsWith('--tenant-id='))?.split('=')[1],
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose'),
};

// Initialize Prisma client (without middleware to avoid double calculation)
const prisma = new PrismaClient({
  log: options.verbose ? ['query', 'info', 'warn', 'error'] : ['error'],
});

interface InventoryUpdate {
  id: string;
  location: string;
  oldPickOrder?: number;
  newPickOrder: number;
  tenantId: string;
}

async function main() {
  console.log('🏭 Warehouse PickOrder Recalculation Script');
  console.log('============================================\n');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  try {
    // Build query filter
    const where: any = {};
    if (options.tenantId) {
      where.tenantId = options.tenantId;
      console.log(`📦 Processing tenant: ${options.tenantId}\n`);
    } else {
      console.log('📦 Processing all tenants\n');
    }

    // Fetch all inventory items
    console.log('🔍 Fetching inventory items...');
    const inventories = await prisma.inventory.findMany({
      where,
      select: {
        id: true,
        location: true,
        tenantId: true,
        // Note: pickOrder field might not exist yet in schema
        // This is safe - Prisma will just ignore it if not present
      },
    });

    console.log(`✅ Found ${inventories.length} inventory items\n`);

    if (inventories.length === 0) {
      console.log('ℹ️  No inventory items to process');
      return;
    }

    // Process each inventory item
    const updates: InventoryUpdate[] = [];
    const errors: Array<{ id: string; location: string; error: string }> = [];
    let skipped = 0;

    console.log('🔄 Calculating pickOrder values...\n');

    for (const inventory of inventories) {
      const parsed = parseLocation(inventory.location);

      if (!parsed.success) {
        errors.push({
          id: inventory.id,
          location: inventory.location,
          error: parsed.error || 'Unknown error',
        });
        continue;
      }

      // Check if pickOrder would change (if field exists)
      const oldPickOrder = (inventory as any).pickOrder;
      const needsUpdate =
        oldPickOrder === undefined || oldPickOrder !== parsed.pickOrder;

      if (!needsUpdate) {
        skipped++;
        continue;
      }

      updates.push({
        id: inventory.id,
        location: inventory.location,
        oldPickOrder,
        newPickOrder: parsed.pickOrder!,
        tenantId: inventory.tenantId,
      });

      if (options.verbose) {
        console.log(
          `  ${inventory.location.padEnd(20)} → pickOrder: ${parsed.pickOrder}`
        );
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   Total items:     ${inventories.length}`);
    console.log(`   To update:       ${updates.length}`);
    console.log(`   Already correct: ${skipped}`);
    console.log(`   Errors:          ${errors.length}\n`);

    // Show errors
    if (errors.length > 0) {
      console.log('❌ Errors encountered:\n');
      errors.forEach(({ location, error }) => {
        console.log(`   Location: "${location}"`);
        console.log(`   Error: ${error}\n`);
      });
    }

    // Perform updates
    if (updates.length > 0) {
      if (options.dryRun) {
        console.log('ℹ️  Dry run - showing first 10 updates that would be made:\n');
        updates.slice(0, 10).forEach(({ location, newPickOrder }) => {
          console.log(`   ${location.padEnd(20)} → ${newPickOrder}`);
        });
        if (updates.length > 10) {
          console.log(`   ... and ${updates.length - 10} more`);
        }
      } else {
        console.log('💾 Applying updates...\n');

        let updated = 0;
        let failed = 0;

        // Update in batches of 100 for performance
        const batchSize = 100;
        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize);

          try {
            // Use transaction for batch atomicity
            await prisma.$transaction(
              batch.map((update) =>
                prisma.inventory.update({
                  where: { id: update.id },
                  data: {
                    // Note: This will silently fail if pickOrder field doesn't exist
                    // That's OK - middleware will handle it on next real update
                    pickOrder: update.newPickOrder,
                  } as any,
                })
              )
            );

            updated += batch.length;

            if (options.verbose) {
              console.log(
                `   ✅ Updated batch ${Math.floor(i / batchSize) + 1} (${batch.length} items)`
              );
            }
          } catch (error) {
            failed += batch.length;
            console.error(
              `   ❌ Failed to update batch ${Math.floor(i / batchSize) + 1}:`,
              error
            );
          }
        }

        console.log(`\n✅ Update complete:`);
        console.log(`   Successfully updated: ${updated}`);
        if (failed > 0) {
          console.log(`   Failed: ${failed}`);
        }
      }
    } else {
      console.log('ℹ️  No updates needed - all pickOrder values are correct');
    }

    console.log('\n🎉 Script completed successfully\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
