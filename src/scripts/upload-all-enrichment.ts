#!/usr/bin/env tsx

/**
 * Upload All Enrichment Data to Database
 *
 * Batch uploads enrichment data for all products when AWS is back online.
 * Uses the real product data fetched from the database.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

config({ path: resolve(__dirname, '../.env.local') });
const prisma = new PrismaClient();

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

async function uploadAllEnrichment() {
  console.log('🍷 Upload ALL Enrichment to Database\n');
  console.log('═'.repeat(80));

  try {
    // Check database connection
    console.log('🔌 Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!\n');

    // Load enrichment data
    const dataPath = resolve(__dirname, '../data/real-products-enriched.json');

    if (!existsSync(dataPath)) {
      console.error('❌ Error: real-products-enriched.json not found');
      console.error(`   Expected at: ${dataPath}`);
      console.error('\n💡 Run this first:');
      console.error('   tsx scripts/fetch-and-enrich-all.ts');
      process.exit(1);
    }

    const data = JSON.parse(readFileSync(dataPath, 'utf-8')) as EnrichedProduct[];
    console.log(`📊 Loaded ${data.length} enriched products from file\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    console.log('📝 Uploading enrichment data in batches...\n');
    console.log('⏱️  This may take a few minutes\n');

    const startTime = Date.now();
    const batchSize = 50;

    // Process in batches for better performance
    for (let batchStart = 0; batchStart < data.length; batchStart += batchSize) {
      const batch = data.slice(batchStart, batchStart + batchSize);

      await Promise.all(
        batch.map(async (item, idx) => {
          const globalIdx = batchStart + idx;

          try {
            // Update product with enrichment
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                description: item.enrichment.description,
                tastingNotes: item.enrichment.tastingNotes as any,
                foodPairings: item.enrichment.foodPairings as any,
                servingInfo: item.enrichment.servingInfo as any,
                wineDetails: item.enrichment.wineDetails as any,
                enrichedAt: new Date(),
                enrichedBy: item.generatedBy,
              },
            });

            successCount++;
          } catch (error) {
            errorCount++;
            if (error instanceof Error && error.message.includes('Record to update not found')) {
              skippedCount++;
              console.error(`   ⚠️  [${globalIdx + 1}] Skipped: ${item.productName} (not found)`);
            } else {
              console.error(`   ❌ [${globalIdx + 1}] Error: ${item.productName}`);
              console.error(`      ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        })
      );

      // Progress indicator
      const progress = Math.min(((batchStart + batchSize) / data.length * 100), 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   [${Math.min(batchStart + batchSize, data.length)}/${data.length}] ${progress}% complete (${elapsed}s elapsed)`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 UPLOAD SUMMARY');
    console.log('─'.repeat(80));
    console.log(`✅ Successful: ${successCount}/${data.length}`);
    console.log(`⚠️  Skipped: ${skippedCount}/${data.length} (not found in database)`);
    console.log(`❌ Errors: ${errorCount - skippedCount}/${data.length}`);
    console.log(`⏱️  Upload time: ${elapsed}s`);
    console.log(`⚡ Rate: ${(successCount / parseFloat(elapsed)).toFixed(1)} products/sec`);
    console.log('\n✅ Enrichment upload complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Start your dev server: npm run dev');
    console.log('   2. Navigate to /enrichment-preview');
    console.log('   3. Verify enriched products display correctly');
    console.log('   4. Check your sales catalog for enriched data');
    console.log('═'.repeat(80));
    console.log();

  } catch (error) {
    if (error instanceof Error && error.message.includes('Can\'t reach database')) {
      console.error('\n❌ Database Connection Failed');
      console.error('   AWS/Supabase is still down or unreachable');
      console.error('   Try again later when the service is restored\n');
    } else {
      console.error('\n❌ Upload failed:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

uploadAllEnrichment();
