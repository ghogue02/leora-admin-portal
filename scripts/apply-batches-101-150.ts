import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

/**
 * Apply Wine Enrichment Results - Batches 101-150
 *
 * This script applies accurate wine enrichment data from batches 101-150
 * to the database, updating products with tasting notes, food pairings,
 * serving information, and wine details.
 */

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

interface WineEnrichment {
  productId?: string;
  productName: string;
  brand?: string | null;
  description: string;
  tastingNotes: {
    aroma: string;
    palate: string;
    finish: string;
  };
  foodPairings: string[];
  servingInfo: {
    temperature: string;
    decanting: string;
    glassware: string;
  };
  wineDetails: {
    region: string;
    grapeVariety: string;
    vintage: string;
    style: string;
    ageability: string;
  };
  metadata: {
    source: string;
    confidence: number;
    researchedAt: string;
  };
}

interface BatchResults {
  batchId?: number;
  batch?: number;
  processedAt?: string;
  timestamp?: string;
  totalWines?: number;
  winesProcessed?: number;
  wines: WineEnrichment[];
}

async function applyBatch(batchNumber: number): Promise<{
  batch: number;
  success: number;
  errors: number;
  skipped: number;
}> {
  const resultsFile = resolve(__dirname, `../data/wine-research-results-batch-${batchNumber}.json`);

  // Check if results file exists
  if (!existsSync(resultsFile)) {
    console.log(`  ⚠️  Results file not found: batch-${batchNumber}.json`);
    return { batch: batchNumber, success: 0, errors: 0, skipped: 0 };
  }

  console.log(`\n📦 Processing Batch ${batchNumber}`);
  console.log(`━`.repeat(60));

  // Read results
  const batchData: BatchResults = JSON.parse(readFileSync(resultsFile, 'utf-8'));
  const wines = batchData.wines || [];

  if (wines.length === 0) {
    console.log(`  ⚠️  No wines found in batch ${batchNumber}`);
    return { batch: batchNumber, success: 0, errors: 0, skipped: 0 };
  }

  console.log(`Found ${wines.length} enriched wines\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const wine of wines) {
    try {
      // Find product by name (exact match, case-insensitive)
      const product = await prisma.product.findFirst({
        where: {
          name: {
            equals: wine.productName,
            mode: 'insensitive',
          },
        },
      });

      if (!product) {
        console.log(`  ⊘ ${wine.productName}`);
        console.log(`     Product not found in database`);
        skippedCount++;
        continue;
      }

      // Check if already enriched
      if (product.enrichedAt && product.tastingNotes) {
        console.log(`  ⊘ ${wine.productName}`);
        console.log(`     Already enriched (skipping)`);
        skippedCount++;
        continue;
      }

      // Update product with enrichment data
      await prisma.product.update({
        where: { id: product.id },
        data: {
          description: wine.description,
          tastingNotes: wine.tastingNotes as any,
          foodPairings: wine.foodPairings as any,
          servingInfo: wine.servingInfo as any,
          wineDetails: wine.wineDetails as any,
          enrichedAt: new Date(wine.metadata.researchedAt),
          enrichedBy: `claude-code-accurate-v2 (${wine.metadata.source}, conf:${wine.metadata.confidence})`,
        },
      });

      console.log(`  ✅ ${wine.productName}`);
      console.log(`     Updated (confidence: ${wine.metadata.confidence})`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ ${wine.productName}`);
      console.error(`     Error: ${error instanceof Error ? error.message : String(error)}`);
      errorCount++;
    }
  }

  console.log(`\nBatch ${batchNumber} Summary:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log(`  ⊘ Skipped: ${skippedCount}`);

  return {
    batch: batchNumber,
    success: successCount,
    errors: errorCount,
    skipped: skippedCount,
  };
}

async function applyBatches101to150() {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🍷 APPLYING WINE ENRICHMENT RESULTS - BATCHES 101-150`);
  console.log(`${'='.repeat(70)}\n`);
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results: {
    batch: number;
    success: number;
    errors: number;
    skipped: number;
  }[] = [];

  // Process batches 101-150 (50 batches total)
  for (let batchNum = 101; batchNum <= 150; batchNum++) {
    const result = await applyBatch(batchNum);
    results.push(result);

    // Small delay to avoid overwhelming the database
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Final summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log(`📊 FINAL SUMMARY - BATCHES 101-150`);
  console.log(`${'='.repeat(70)}\n`);

  const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalProcessed = totalSuccess + totalErrors + totalSkipped;

  console.log(`Total Wines Processed: ${totalProcessed}`);
  console.log(`✅ Successfully Updated: ${totalSuccess}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`⊘ Skipped: ${totalSkipped}`);
  console.log(`\nBatches Processed: ${results.length}/50`);

  const batchesWithErrors = results.filter((r) => r.errors > 0);
  if (batchesWithErrors.length > 0) {
    console.log(`\n⚠️  Batches with errors: ${batchesWithErrors.map((r) => r.batch).join(', ')}`);
  }

  const batchesWithNoData = results.filter((r) => r.success === 0 && r.errors === 0 && r.skipped === 0);
  if (batchesWithNoData.length > 0) {
    console.log(`\n⚠️  Batches with no data: ${batchesWithNoData.map((r) => r.batch).join(', ')}`);
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);
  console.log(`${'='.repeat(70)}\n`);

  await prisma.$disconnect();

  return {
    totalProcessed,
    totalSuccess,
    totalErrors,
    totalSkipped,
    results,
  };
}

// Run the script
applyBatches101to150()
  .then((summary) => {
    console.log(`\n✅ Script completed successfully!`);
    console.log(`   ${summary.totalSuccess} products enriched across 50 batches.\n`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`\n❌ Script failed:`, error);
    process.exit(1);
  });
