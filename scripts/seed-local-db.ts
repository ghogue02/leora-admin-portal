#!/usr/bin/env tsx

/**
 * Seed Local Database with Enriched Sample Products
 */

// Use the local SQLite Prisma client
import { PrismaClient } from '@prisma/client-local';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding local database...\n');

  try {
    // Create tenant
    const tenant = await prisma.tenant.upsert({
      where: { slug: 'demo' },
      update: {},
      create: {
        slug: 'demo',
        name: 'Demo Tenant',
        timezone: 'America/New_York',
      },
    });
    console.log('✅ Created tenant: demo\n');

    // Load enrichment data
    const dataPath = resolve(__dirname, '../data/enriched-products.json');
    const enrichedProducts = JSON.parse(readFileSync(dataPath, 'utf-8'));

    console.log(`📊 Loading ${enrichedProducts.length} enriched products...\n`);

    for (const item of enrichedProducts) {
      // Create product
      const product = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          name: item.productName,
          brand: item.brand,
          category: item.category,
          description: item.enrichment.description,
          tastingNotes: JSON.stringify(item.enrichment.tastingNotes),
          foodPairings: JSON.stringify(item.enrichment.foodPairings),
          servingInfo: JSON.stringify(item.enrichment.servingInfo),
          wineDetails: JSON.stringify(item.enrichment.wineDetails),
          enrichedAt: new Date(item.generatedAt),
          enrichedBy: item.generatedBy,
        },
      });

      // Create SKU
      await prisma.sku.create({
        data: {
          tenantId: tenant.id,
          productId: product.id,
          code: `SKU-${item.productName.slice(0, 10).toUpperCase().replace(/\s/g, '')}`,
          size: '750ml',
          unitOfMeasure: 'Bottle',
          abv: 13.5,
          pricePerUnit: 45.00,
          isActive: true,
        },
      });

      console.log(`   ✅ ${item.productName}`);
    }

    console.log(`\n✅ Seeded ${enrichedProducts.length} products with enrichment data!`);
    console.log('\n🚀 Ready to start dev server with: DATABASE_URL="file:./dev.db" npm run dev\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
