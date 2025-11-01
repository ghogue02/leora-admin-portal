/**
 * Cleanup Warehouse Locations Script
 *
 * Fixes "Not specified" warehouse records
 * Updates them to "main" or prompts for selection
 *
 * Run: npx tsx src/scripts/cleanup-warehouse-locations.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupWarehouseLocations() {
  console.log('🧹 Starting warehouse location cleanup...\n');

  try {
    // 1. Find all "Not specified" inventory records
    const notSpecifiedInventory = await prisma.inventory.findMany({
      where: {
        location: 'Not specified',
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
    });

    console.log(`Found ${notSpecifiedInventory.length} inventory records with "Not specified" location\n`);

    if (notSpecifiedInventory.length === 0) {
      console.log('✅ No cleanup needed - all inventory has proper locations');
      return;
    }

    // 2. Update to "main" warehouse
    const updated = await prisma.inventory.updateMany({
      where: {
        location: 'Not specified',
      },
      data: {
        location: 'main',
      },
    });

    console.log(`✅ Updated ${updated.count} inventory records to "main" warehouse`);

    // 3. Find orders with "Not specified" warehouse
    const ordersWithBadWarehouse = await prisma.order.findMany({
      where: {
        warehouseLocation: 'Not specified',
      },
      select: {
        id: true,
        deliveryDate: true,
        customer: {
          select: {
            name: true,
            territory: true,
          },
        },
      },
    });

    console.log(`\nFound ${ordersWithBadWarehouse.length} orders with "Not specified" warehouse`);

    if (ordersWithBadWarehouse.length > 0) {
      // Update to default based on territory
      for (const order of ordersWithBadWarehouse) {
        const territory = order.customer.territory;
        let newWarehouse = 'main';

        // Smart defaulting based on territory
        if (territory?.includes('MD')) {
          newWarehouse = 'Baltimore';
        } else if (territory?.includes('VA')) {
          newWarehouse = 'Warrenton';
        }

        await prisma.order.update({
          where: { id: order.id },
          data: {
            warehouseLocation: newWarehouse,
          },
        });

        console.log(`  ✅ Order ${order.id.slice(0, 8)} (${order.customer.name}) → ${newWarehouse}`);
      }
    }

    // 4. Update customer defaults
    const customersWithBadWarehouse = await prisma.customer.updateMany({
      where: {
        defaultWarehouseLocation: 'Not specified',
      },
      data: {
        defaultWarehouseLocation: 'main',
      },
    });

    if (customersWithBadWarehouse.count > 0) {
      console.log(`\n✅ Updated ${customersWithBadWarehouse.count} customer default warehouses to "main"`);
    }

    console.log('\n🎉 Warehouse cleanup complete!');
    console.log('\nSummary:');
    console.log(`  - Inventory records updated: ${updated.count}`);
    console.log(`  - Orders updated: ${ordersWithBadWarehouse.length}`);
    console.log(`  - Customer defaults updated: ${customersWithBadWarehouse.count}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanupWarehouseLocations()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { cleanupWarehouseLocations };
