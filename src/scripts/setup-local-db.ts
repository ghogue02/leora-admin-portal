#!/usr/bin/env tsx

/**
 * Setup Local SQLite Database with Enriched Sample Data
 *
 * This creates a local database and seeds it with enriched products
 * so you can visualize the UI without waiting for AWS.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface EnrichedProduct {
  productId: string;
  productName: string;
  brand: string | null;
  category: string | null;
  enrichment: {
    description: string;
    tastingNotes: any;
    foodPairings: any;
    servingInfo: any;
    wineDetails: any;
  };
  generatedAt: string;
  generatedBy: string;
}

async function setupLocalDatabase() {
  console.log('🍷 Setting Up Local SQLite Database\n');
  console.log('═'.repeat(80));
  console.log('This will create a local database with enriched sample products');
  console.log('so you can visualize the UI before enriching production data.');
  console.log('═'.repeat(80));
  console.log();

  try {
    // Step 1: Create local database
    console.log('📦 Step 1: Creating local SQLite database...');

    // Set DATABASE_URL to SQLite
    const envPath = resolve(__dirname, '../.env.local.dev');
    writeFileSync(envPath, 'DATABASE_URL="file:./dev.db"\n');
    console.log('   ✅ Created .env.local.dev with SQLite connection\n');

    // Step 2: Initialize database with schema
    console.log('📋 Step 2: Initializing database schema...');
    console.log('   Running: npx prisma db push --schema prisma/schema.local.prisma\n');

    try {
      execSync('npx prisma db push --schema prisma/schema.local.prisma --accept-data-loss', {
        cwd: resolve(__dirname, '..'),
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: 'file:./dev.db' }
      });
      console.log('   ✅ Database schema created\n');
    } catch (error) {
      console.log('   ⚠️  Schema push failed, continuing anyway...\n');
    }

    // Step 3: Generate Prisma Client for local DB
    console.log('🔧 Step 3: Generating Prisma Client...');
    try {
      execSync('npx prisma generate --schema prisma/schema.local.prisma', {
        cwd: resolve(__dirname, '..'),
        stdio: 'inherit'
      });
      console.log('   ✅ Prisma Client generated\n');
    } catch (error) {
      console.log('   ⚠️  Client generation failed, using existing client\n');
    }

    // Step 4: Create seed data script
    console.log('🌱 Step 4: Creating seed data...');
    const seedScript = createSeedScript();
    const seedPath = resolve(__dirname, '../scripts/seed-local-db.ts');
    writeFileSync(seedPath, seedScript);
    console.log(`   ✅ Created: ${seedPath}\n`);

    // Step 5: Instructions
    console.log('═'.repeat(80));
    console.log('\n✅ LOCAL DATABASE SETUP COMPLETE!\n');
    console.log('📋 Next Steps:\n');
    console.log('1. Seed the database with sample data:');
    console.log('   DATABASE_URL="file:./dev.db" tsx scripts/seed-local-db.ts\n');
    console.log('2. Start the dev server with local database:');
    console.log('   DATABASE_URL="file:./dev.db" npm run dev\n');
    console.log('3. Navigate to sales catalog and see enriched products!\n');
    console.log('═'.repeat(80));
    console.log();

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

function createSeedScript(): string {
  return `#!/usr/bin/env tsx

/**
 * Seed Local Database with Enriched Sample Products
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding local database...\\n');

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
    console.log('✅ Created tenant: demo\\n');

    // Load enrichment data
    const dataPath = resolve(__dirname, '../data/enriched-products.json');
    const enrichedProducts = JSON.parse(readFileSync(dataPath, 'utf-8'));

    console.log(\`📊 Loading \${enrichedProducts.length} enriched products...\\n\`);

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
          code: \`SKU-\${item.productName.slice(0, 10).toUpperCase().replace(/\\s/g, '')}\`,
          size: '750ml',
          unitOfMeasure: 'Bottle',
          abv: 13.5,
          pricePerUnit: 45.00,
          isActive: true,
        },
      });

      console.log(\`   ✅ \${item.productName}\`);
    }

    console.log(\`\\n✅ Seeded \${enrichedProducts.length} products with enrichment data!\`);
    console.log('\\n🚀 Ready to start dev server with: DATABASE_URL="file:./dev.db" npm run dev\\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
`;
}

setupLocalDatabase();
