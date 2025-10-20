#!/usr/bin/env tsx

/**
 * Upload Enrichment Data to Database
 *
 * Batch uploads enrichment data from JSON file to database when AWS is back online.
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

async function uploadEnrichment() {
  console.log('🍷 Upload Enrichment to Database\n');
  console.log('═'.repeat(80));

  try {
    // Check database connection
    console.log('🔌 Testing database connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!\n');

    // Load enrichment data
    const dataPath = resolve(__dirname, '../data/enriched-products.json');

    if (!existsSync(dataPath)) {
      console.error('❌ Error: enriched-products.json not found');
      console.error(`   Expected at: ${dataPath}`);
      console.error('   Run: tsx scripts/generate-enrichment-local.ts first');
      process.exit(1);
    }

    const data = JSON.parse(readFileSync(dataPath, 'utf-8')) as EnrichedProduct[];
    console.log(`📊 Loaded ${data.length} enriched products from file\n`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    console.log('📝 Uploading enrichment data...\n');

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      try {
        // Check if product exists
        const product = await prisma.product.findFirst({
          where: {
            name: item.productName,
          },
        });

        if (!product) {
          console.log(`[${i + 1}/${data.length}] ⚠️  Skipped: ${item.productName} (not found in DB)`);
          skippedCount++;
          continue;
        }

        // Update product with enrichment
        await prisma.product.update({
          where: { id: product.id },
          data: {
            description: item.enrichment.description,
            tastingNotes: item.enrichment.tastingNotes,
            foodPairings: item.enrichment.foodPairings,
            servingInfo: item.enrichment.servingInfo,
            wineDetails: item.enrichment.wineDetails,
            enrichedAt: new Date(),
            enrichedBy: item.generatedBy,
          },
        });

        console.log(`[${i + 1}/${data.length}] ✅ Uploaded: ${item.productName}`);
        successCount++;

      } catch (error) {
        console.error(`[${i + 1}/${data.length}] ❌ Error: ${item.productName}`);
        console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 UPLOAD SUMMARY');
    console.log('─'.repeat(80));
    console.log(`✅ Successful: ${successCount}/${data.length}`);
    console.log(`⚠️  Skipped: ${skippedCount}/${data.length} (not found in database)`);
    console.log(`❌ Errors: ${errorCount}/${data.length}`);
    console.log('\n✅ Enrichment upload complete!');
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

uploadEnrichment();
