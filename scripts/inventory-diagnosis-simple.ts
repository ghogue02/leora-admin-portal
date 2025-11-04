#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

async function diagnose() {
  console.log('🔍 Inventory Diagnosis - Key Findings\n');
  console.log('='.repeat(80) + '\n');

  try {
    await prisma.$connect();

    // Count SKUs and inventory
    const skuCount = await prisma.sku.count({ where: { tenantId: TENANT_ID } });
    const inventoryCount = await prisma.inventory.count({ where: { tenantId: TENANT_ID } });
    const skusWithInventory = await prisma.sku.count({
      where: {
        tenantId: TENANT_ID,
        inventories: { some: {} }
      }
    });
    const skusWithoutInventory = skuCount - skusWithInventory;

    console.log('📊 Overall Counts:');
    console.log(`  Total SKUs: ${skuCount}`);
    console.log(`  Inventory records: ${inventoryCount}`);
    console.log(`  SKUs WITH inventory: ${skusWithInventory} (${Math.round(skusWithInventory/skuCount*100)}%)`);
    console.log(`  SKUs WITHOUT inventory: ${skusWithoutInventory} (${Math.round(skusWithoutInventory/skuCount*100)}%)\n`);

    // Check warehouse locations
    const locations = await prisma.inventory.groupBy({
      by: ['location'],
      where: { tenantId: TENANT_ID },
      _count: true
    });

    console.log('📍 Warehouse Locations:');
    locations.forEach(loc => {
      console.log(`  - ${loc.location}: ${loc._count} inventory records`);
    });

    // Simulate catalog API behavior
    console.log('\n📦 Catalog API Simulation:');

    const catalogSkus = await prisma.sku.findMany({
      where: { tenantId: TENANT_ID },
      take: 10,
      select: {
        id: true,
        code: true,
        product: { select: { name: true } }
      }
    });

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

    console.log(`  Fetched ${catalogSkus.length} SKUs from catalog`);
    console.log(`  Found inventory for ${inventoryRecords.length} of them\n`);

    console.log('🎯 Sample Results (first 10 SKUs):');
    catalogSkus.forEach(sku => {
      const inventory = inventoryMap.get(sku.id);
      if (inventory) {
        console.log(`  ✅ IN STOCK: ${sku.code} - ${sku.product?.name}`);
        console.log(`     → ${inventory.onHand} on hand, ${inventory.allocated} allocated, ${inventory.available} available`);
      } else {
        console.log(`  ❌ OUT OF STOCK: ${sku.code} - ${sku.product?.name}`);
        console.log(`     → NO INVENTORY RECORDS FOUND`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n🔍 ROOT CAUSE IDENTIFIED:');
    console.log(`   ${skusWithoutInventory} SKUs (${Math.round(skusWithoutInventory/skuCount*100)}%) have NO inventory records`);
    console.log('   These will ALL show as "Out of stock (0 on hand)"');
    console.log(`\n💡 SOLUTION: Populate inventory records for missing ${skusWithoutInventory} SKUs\n`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
