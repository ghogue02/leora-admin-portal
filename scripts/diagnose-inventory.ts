#!/usr/bin/env tsx

/**
 * Diagnostic Script: Inventory Display Issue
 *
 * Investigates why products show "Out of stock (0 on hand)"
 * when inventory records exist in database.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

async function diagnose() {
  console.log('🔍 Diagnosing Inventory Display Issue\n');
  console.log('='.repeat(80) + '\n');

  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Step 1: Check total counts
    console.log('📊 Step 1: Database Counts');
    const skuCount = await prisma.sku.count({ where: { tenantId: TENANT_ID } });
    const inventoryCount = await prisma.inventory.count({ where: { tenantId: TENANT_ID } });
    console.log(`  SKUs: ${skuCount}`);
    console.log(`  Inventory records: ${inventoryCount}\n`);

    // Step 2: Check for SKU/Inventory mismatches
    console.log('🔎 Step 2: SKU/Inventory Matching');

    // Get SKUs with inventory
    const skusWithInventory = await prisma.sku.findMany({
      where: {
        tenantId: TENANT_ID,
        inventories: { some: {} }
      },
      take: 5,
      select: {
        id: true,
        code: true,
        product: { select: { name: true } },
        inventories: {
          select: {
            location: true,
            onHand: true,
            allocated: true
          }
        }
      }
    });

    console.log(`  SKUs WITH inventory: ${skusWithInventory.length} (showing first 5):`);
    skusWithInventory.forEach(sku => {
      console.log(`    ✅ ${sku.code} - ${sku.product?.name}`);
      sku.inventories.forEach(inv => {
        const available = inv.onHand - inv.allocated;
        console.log(`       ${inv.location}: ${inv.onHand} on hand, ${inv.allocated} allocated, ${available} available`);
      });
    });

    // Get SKUs without inventory
    const skusWithoutInventory = await prisma.sku.count({
      where: {
        tenantId: TENANT_ID,
        inventories: { none: {} }
      }
    });

    console.log(`\n  SKUs WITHOUT inventory: ${skusWithoutInventory}`);

    // Step 3: Simulate catalog API query
    console.log('\n📦 Step 3: Simulating Catalog API Query\n');

    const catalogSkus = await prisma.sku.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
        product: {
          isActive: true,
          status: 'ACTIVE'
        }
      },
      take: 10,
      select: {
        id: true,
        code: true,
        product: {
          select: {
            name: true,
            brand: true,
            category: true
          }
        }
      }
    });

    console.log(`  Found ${catalogSkus.length} active SKUs (showing first 10)`);

    // Get inventory for these SKUs
    const skuIds = catalogSkus.map(s => s.id);

    const inventoryRecords = await prisma.inventory.groupBy({
      by: ['skuId'],
      where: {
        skuId: { in: skuIds },
        tenantId: TENANT_ID,
      },
      _sum: {
        onHand: true,
        allocated: true,
      },
    });

    console.log(`  Found inventory for ${inventoryRecords.length} of these SKUs\n`);

    // Create inventory map
    const inventoryMap = new Map(
      inventoryRecords.map(inv => [
        inv.skuId,
        {
          onHand: inv._sum.onHand || 0,
          allocated: inv._sum.allocated || 0,
          available: (inv._sum.onHand || 0) - (inv._sum.allocated || 0),
        }
      ])
    );

    console.log('  Sample Results:\n');
    catalogSkus.slice(0, 5).forEach(sku => {
      const inventory = inventoryMap.get(sku.id) || { onHand: 0, allocated: 0, available: 0 };
      const status = inventory.available > 0 ? '✅ IN STOCK' : '❌ OUT OF STOCK';

      console.log(`    ${status} ${sku.code} - ${sku.product?.name}`);
      console.log(`       Inventory: ${inventory.onHand} on hand, ${inventory.allocated} allocated, ${inventory.available} available`);
      console.log(`       SKU ID: ${sku.id}`);
      console.log(`       In inventory map: ${inventoryMap.has(sku.id) ? 'YES' : 'NO'}\n`);
    });

    // Step 4: Check for common issues
    console.log('🔧 Step 4: Common Issues Check\n');

    // Check if inactive SKUs are being queried
    const inactiveSKUCount = await prisma.sku.count({
      where: {
        tenantId: TENANT_ID,
        OR: [
          { isActive: false },
          { product: { isActive: false } },
          { product: { status: { not: 'ACTIVE' } } }
        ]
      }
    });
    console.log(`  Inactive/filtered SKUs: ${inactiveSKUCount}`);

    // Check if there are multiple warehouse locations
    const locations = await prisma.inventory.groupBy({
      by: ['location'],
      where: { tenantId: TENANT_ID },
      _count: true
    });
    console.log(`  Warehouse locations: ${locations.length}`);
    locations.forEach(loc => {
      console.log(`    - ${loc.location}: ${loc._count} records`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Diagnosis Complete!');

  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
