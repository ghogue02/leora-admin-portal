import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

interface BatchResult {
  batchNumber: number;
  success: number;
  errors: number;
  skipped: number;
  details: string[];
}

async function reapplyBatch(batchNumber: number): Promise<BatchResult> {
  const resultsFile = resolve(__dirname, `../data/wine-research-results-batch-${batchNumber}.json`);

  console.log(`\n📦 Processing Batch ${batchNumber}`);
  console.log(`Reading: ${resultsFile}`);

  const rawData = JSON.parse(readFileSync(resultsFile, 'utf-8'));

  // Handle both array format and object format with wines property
  const results = Array.isArray(rawData) ? rawData : (rawData.wines || []);
  console.log(`Found ${results.length} enriched wines`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const details: string[] = [];

  for (const wine of results) {
    try {
      // Find product by name
      const product = await prisma.product.findFirst({
        where: { name: wine.productName }
      });

      if (!product) {
        const msg = `⚠️  ${wine.productName} - Product not found in database`;
        console.log(`  ${msg}`);
        details.push(msg);
        skippedCount++;
        continue;
      }

      // Check if already enriched
      if (product.enrichedAt) {
        const msg = `⏭️  ${wine.productName} - Already enriched, skipping`;
        console.log(`  ${msg}`);
        details.push(msg);
        skippedCount++;
        continue;
      }

      // Update product with enrichment data
      await prisma.product.update({
        where: { id: product.id },
        data: {
          description: wine.description,
          tastingNotes: wine.tastingNotes,
          foodPairings: wine.foodPairings,
          servingInfo: wine.servingInfo,
          wineDetails: wine.wineDetails,
          enrichedAt: new Date(wine.metadata.researchedAt),
          enrichedBy: `claude-code-accurate-v2 (${wine.metadata.source}, conf:${wine.metadata.confidence})`,
        },
      });

      const msg = `✅ ${wine.productName} - Updated (${wine.metadata.confidence} confidence)`;
      console.log(`  ${msg}`);
      details.push(msg);
      successCount++;
    } catch (error) {
      const msg = `❌ ${wine.productName} - Error: ${error}`;
      console.error(`  ${msg}`);
      details.push(msg);
      errorCount++;
    }
  }

  return {
    batchNumber,
    success: successCount,
    errors: errorCount,
    skipped: skippedCount,
    details
  };
}

async function reapplyMissingBatches(batchNumbers?: number[]) {
  console.log(`\n🔄 RE-APPLYING MISSING BATCHES`);
  console.log(`==============================\n`);

  let batches: number[];

  if (batchNumbers && batchNumbers.length > 0) {
    // Use provided batch numbers
    batches = batchNumbers;
    console.log(`Processing provided batches: ${batches.join(', ')}`);
  } else {
    // Load from missing-batches.json
    const missingDataPath = resolve(__dirname, '../data/missing-batches.json');
    try {
      const missingData = JSON.parse(readFileSync(missingDataPath, 'utf-8'));
      batches = missingData.missingBatches;
      console.log(`Loaded ${batches.length} missing batches from verification`);
    } catch (error) {
      console.error(`❌ Could not load missing-batches.json. Please run verify-batch-application.ts first.`);
      process.exit(1);
    }
  }

  if (batches.length === 0) {
    console.log('✅ No batches to reapply!');
    await prisma.$disconnect();
    return;
  }

  const batchResults: BatchResult[] = [];
  let totalSuccess = 0;
  let totalErrors = 0;
  let totalSkipped = 0;

  for (const batchNum of batches) {
    try {
      const result = await reapplyBatch(batchNum);
      batchResults.push(result);
      totalSuccess += result.success;
      totalErrors += result.errors;
      totalSkipped += result.skipped;

      console.log(`\nBatch ${batchNum} Summary:`);
      console.log(`  Success: ${result.success}`);
      console.log(`  Errors: ${result.errors}`);
      console.log(`  Skipped: ${result.skipped}`);
    } catch (error) {
      console.error(`\n❌ Failed to process batch ${batchNum}: ${error}`);
      batchResults.push({
        batchNumber: batchNum,
        success: 0,
        errors: 1,
        skipped: 0,
        details: [`Failed to process batch: ${error}`]
      });
      totalErrors++;
    }
  }

  // Get final database counts
  console.log(`\n\n📊 Querying final database counts...`);
  const totalProducts = await prisma.product.count();
  const enrichedProducts = await prisma.product.count({
    where: { enrichedAt: { not: null } }
  });
  const unenrichedProducts = totalProducts - enrichedProducts;

  console.log(`\n\n✅ REAPPLICATION COMPLETE`);
  console.log(`========================`);
  console.log(`Batches processed: ${batches.length}`);
  console.log(`Total success: ${totalSuccess}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total skipped: ${totalSkipped}`);
  console.log(`\nDatabase Status:`);
  console.log(`  Total products: ${totalProducts}`);
  console.log(`  Enriched products: ${enrichedProducts} (${((enrichedProducts/totalProducts)*100).toFixed(2)}%)`);
  console.log(`  Unenriched products: ${unenrichedProducts}`);

  // Log details for batches with errors
  const failedBatches = batchResults.filter(r => r.errors > 0);
  if (failedBatches.length > 0) {
    console.log(`\n⚠️  BATCHES WITH ERRORS:`);
    failedBatches.forEach(batch => {
      console.log(`\nBatch ${batch.batchNumber}:`);
      batch.details.filter(d => d.includes('❌')).forEach(d => console.log(`  ${d}`));
    });
  }

  await prisma.$disconnect();
}

// Parse command line arguments
const args = process.argv.slice(2);
let batchNumbers: number[] | undefined;

if (args.length > 0) {
  if (args[0] === '--batches' && args[1]) {
    // Format: --batches "1,2,3,4"
    batchNumbers = args[1].split(',').map(n => parseInt(n.trim()));
    console.log(`Using provided batch numbers: ${batchNumbers.join(', ')}`);
  } else {
    // Format: individual batch numbers as arguments
    batchNumbers = args.map(n => parseInt(n));
    console.log(`Using provided batch numbers: ${batchNumbers.join(', ')}`);
  }
}

reapplyMissingBatches(batchNumbers).catch(console.error);
