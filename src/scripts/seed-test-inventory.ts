/**
 * Seed Test Inventory Script
 *
 * Creates inventory for testing the order system
 * Adds sufficient stock for popular products
 *
 * Run: npx tsx src/scripts/seed-test-inventory.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed'; // well-crafted tenant

async function seedTestInventory() {
  console.log('🌱 Seeding test inventory...\n');

  try {
    // 1. Get SKUs to stock (first 50 for testing)
    const popularSkus = await prisma.sku.findMany({
      where: {
        tenantId: TENANT_ID,
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
      take: 50,
      orderBy: {
        code: 'asc',
      },
    });

    console.log(`Found ${popularSkus.length} popular SKUs to stock\n`);

    let created = 0;
    let updated = 0;

    // 2. Add inventory for each SKU across all warehouses
    const warehouses = ['Baltimore', 'Warrenton', 'main'];

    for (const sku of popularSkus) {
      for (const warehouse of warehouses) {
        // Check if inventory exists
        const existing = await prisma.inventory.findUnique({
          where: {
            tenantId_skuId_location: {
              tenantId: TENANT_ID,
              skuId: sku.id,
              location: warehouse,
            },
          },
        });

        if (existing) {
          // Update existing
          await prisma.inventory.update({
            where: { id: existing.id },
            data: {
              onHand: 100,
              allocated: Math.min(existing.allocated, 20), // Keep some allocated for realism
            },
          });
          updated++;
          console.log(`  ✅ Updated: ${sku.product.name} at ${warehouse} → 100 on hand`);
        } else {
          // Create new
          await prisma.inventory.create({
            data: {
              tenantId: TENANT_ID,
              skuId: sku.id,
              location: warehouse,
              onHand: 100,
              allocated: 10, // Some pre-allocated for realism
            },
          });
          created++;
          console.log(`  ✅ Created: ${sku.product.name} at ${warehouse} → 100 on hand`);
        }
      }
    }

    console.log(`\n🎉 Test inventory seeded successfully!`);
    console.log(`  Created: ${created} new inventory records`);
    console.log(`  Updated: ${updated} existing records`);
    console.log(`  Total SKUs: ${popularSkus.length}`);
    console.log(`  Warehouses: ${warehouses.join(', ')}`);

    // 3. Verify available inventory
    const verification = await prisma.inventory.findMany({
      where: {
        tenantId: TENANT_ID,
        onHand: { gt: 0 },
      },
      include: {
        sku: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 5,
    });

    console.log(`\n✅ Sample products with available inventory:`);
    verification.forEach(inv => {
      const available = inv.onHand - inv.allocated;
      console.log(`  - ${inv.sku.product.name} at ${inv.location}: ${available} available (${inv.onHand} on hand, ${inv.allocated} allocated)`);
    });

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestInventory()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { seedTestInventory };
