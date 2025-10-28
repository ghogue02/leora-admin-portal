#!/usr/bin/env ts-node

/**
 * Seed Warehouse Configuration
 * Creates default warehouse configuration for tenants
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_CONFIG = {
  aisleCount: 15, // A-O (15 aisles)
  rowsPerAisle: 25,
  shelfLevels: ['Top', 'Middle', 'Bottom'],
  pickStrategy: 'aisle_then_row',
};

async function seedWarehouseConfig() {
  console.log('🏭 Seeding warehouse configurations...\n');

  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  console.log(`Found ${tenants.length} tenants\n`);

  for (const tenant of tenants) {
    // Check if config already exists
    const existing = await prisma.warehouseConfig.findUnique({
      where: { tenantId: tenant.id },
    });

    if (existing) {
      console.log(`✓ Tenant "${tenant.name}" already has warehouse config`);
      continue;
    }

    // Create config
    await prisma.warehouseConfig.create({
      data: {
        tenantId: tenant.id,
        ...DEFAULT_CONFIG,
      },
    });

    console.log(`✓ Created warehouse config for tenant "${tenant.name}"`);
    console.log(`  - ${DEFAULT_CONFIG.aisleCount} aisles`);
    console.log(`  - ${DEFAULT_CONFIG.rowsPerAisle} rows per aisle`);
    console.log(`  - ${DEFAULT_CONFIG.shelfLevels.length} shelf levels\n`);
  }

  console.log('\n✅ Warehouse configuration seeding complete!');
}

seedWarehouseConfig()
  .catch((error) => {
    console.error('❌ Error seeding warehouse configs:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
