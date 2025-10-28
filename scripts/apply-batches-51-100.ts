import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

// Fuzzy matching function using Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

function fuzzyMatch(target: string, candidate: string, threshold: number = 0.8): boolean {
  const normalizedTarget = target.toLowerCase().trim();
  const normalizedCandidate = candidate.toLowerCase().trim();

  // Exact match
  if (normalizedTarget === normalizedCandidate) {
    return true;
  }

  // Contains match
  if (normalizedTarget.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedTarget)) {
    return true;
  }

  // Levenshtein distance match
  const maxLength = Math.max(normalizedTarget.length, normalizedCandidate.length);
  const distance = levenshteinDistance(normalizedTarget, normalizedCandidate);
  const similarity = 1 - distance / maxLength;

  return similarity >= threshold;
}

interface WineMetadata {
  source: string;
  confidence: number;
  researchedAt: string;
}

interface TastingNotes {
  aroma: string;
  palate: string;
  finish: string;
}

interface ServingInfo {
  temperature: string;
  decanting: string;
  glassware: string;
}

interface WineDetails {
  region: string;
  grapeVariety: string;
  vintage: string;
  style: string;
  ageability: string;
}

interface EnrichedWine {
  productId: string;
  productName: string;
  description: string;
  tastingNotes: TastingNotes;
  foodPairings: string[];
  servingInfo: ServingInfo;
  wineDetails: WineDetails;
  metadata: WineMetadata;
}

interface BatchData {
  batch: number;
  researchedAt: string;
  totalWines: number;
  wines: EnrichedWine[];
}

interface ProcessingStats {
  batchNumber: number;
  success: number;
  exactMatch: number;
  fuzzyMatch: number;
  notFound: number;
  errors: number;
  wines: Array<{
    name: string;
    status: 'success' | 'fuzzy' | 'notFound' | 'error';
    matchType?: string;
    confidence?: number;
    message?: string;
  }>;
}

async function findProductByName(productName: string): Promise<any | null> {
  // Try exact match first
  let product = await prisma.product.findFirst({
    where: {
      name: productName,
    },
  });

  if (product) {
    return { product, matchType: 'exact' };
  }

  // Try fuzzy matching
  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true },
  });

  for (const dbProduct of allProducts) {
    if (fuzzyMatch(dbProduct.name, productName, 0.85)) {
      product = await prisma.product.findUnique({
        where: { id: dbProduct.id },
      });
      return { product, matchType: 'fuzzy' };
    }
  }

  return null;
}

async function applyBatch(batchNumber: number): Promise<ProcessingStats> {
  const resultsFile = resolve(__dirname, `../data/wine-research-results-batch-${batchNumber}.json`);

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Processing Batch ${batchNumber}`);
  console.log(`${'='.repeat(80)}\n`);

  let batchData: BatchData;
  try {
    batchData = JSON.parse(readFileSync(resultsFile, 'utf-8'));
  } catch (error) {
    console.error(`Failed to read batch ${batchNumber}: ${error}`);
    return {
      batchNumber,
      success: 0,
      exactMatch: 0,
      fuzzyMatch: 0,
      notFound: 0,
      errors: 1,
      wines: [],
    };
  }

  const stats: ProcessingStats = {
    batchNumber,
    success: 0,
    exactMatch: 0,
    fuzzyMatch: 0,
    notFound: 0,
    errors: 0,
    wines: [],
  };

  // Handle malformed batch data
  if (!batchData.wines || !Array.isArray(batchData.wines)) {
    console.error(`Invalid batch data structure for batch ${batchNumber}`);
    return {
      batchNumber,
      success: 0,
      exactMatch: 0,
      fuzzyMatch: 0,
      notFound: 0,
      errors: 1,
      wines: [],
    };
  }

  console.log(`Found ${batchData.wines.length} wines to process\n`);

  for (const wine of batchData.wines) {
    try {
      console.log(`  Processing: ${wine.productName}`);

      const result = await findProductByName(wine.productName);

      if (!result) {
        console.log(`    ⚠️  Not found in database (tried exact + fuzzy matching)`);
        stats.notFound++;
        stats.wines.push({
          name: wine.productName,
          status: 'notFound',
          confidence: wine.metadata.confidence,
        });
        continue;
      }

      const { product, matchType } = result;

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

      stats.success++;
      if (matchType === 'exact') {
        stats.exactMatch++;
        console.log(`    ✅ Updated (EXACT match, ${wine.metadata.confidence} confidence)`);
      } else {
        stats.fuzzyMatch++;
        console.log(`    ✅ Updated (FUZZY match: "${product.name}", ${wine.metadata.confidence} confidence)`);
      }

      stats.wines.push({
        name: wine.productName,
        status: matchType === 'exact' ? 'success' : 'fuzzy',
        matchType,
        confidence: wine.metadata.confidence,
      });
    } catch (error) {
      console.error(`    ❌ Error: ${error}`);
      stats.errors++;
      stats.wines.push({
        name: wine.productName,
        status: 'error',
        message: String(error),
      });
    }
  }

  console.log(`\nBatch ${batchNumber} Complete:`);
  console.log(`  Success: ${stats.success} (${stats.exactMatch} exact, ${stats.fuzzyMatch} fuzzy)`);
  console.log(`  Not Found: ${stats.notFound}`);
  console.log(`  Errors: ${stats.errors}\n`);

  return stats;
}

async function applyBatches51to100() {
  console.log('\n' + '='.repeat(80));
  console.log('WINE ENRICHMENT APPLICATION: BATCHES 51-100');
  console.log('='.repeat(80) + '\n');

  const startTime = Date.now();
  const allStats: ProcessingStats[] = [];

  for (let batch = 51; batch <= 100; batch++) {
    const stats = await applyBatch(batch);
    allStats.push(stats);
  }

  // Calculate totals
  const totals = allStats.reduce(
    (acc, stat) => ({
      batches: acc.batches + 1,
      totalWines: acc.totalWines + stat.wines.length,
      success: acc.success + stat.success,
      exactMatch: acc.exactMatch + stat.exactMatch,
      fuzzyMatch: acc.fuzzyMatch + stat.fuzzyMatch,
      notFound: acc.notFound + stat.notFound,
      errors: acc.errors + stat.errors,
    }),
    {
      batches: 0,
      totalWines: 0,
      success: 0,
      exactMatch: 0,
      fuzzyMatch: 0,
      notFound: 0,
      errors: 0,
    }
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULTS - BATCHES 51-100');
  console.log('='.repeat(80) + '\n');
  console.log(`Batches Processed: ${totals.batches}`);
  console.log(`Total Wines: ${totals.totalWines}`);
  console.log(`\nSuccessful Updates: ${totals.success} (${((totals.success / totals.totalWines) * 100).toFixed(1)}%)`);
  console.log(`  - Exact Matches: ${totals.exactMatch}`);
  console.log(`  - Fuzzy Matches: ${totals.fuzzyMatch}`);
  console.log(`\nNot Found: ${totals.notFound} (${((totals.notFound / totals.totalWines) * 100).toFixed(1)}%)`);
  console.log(`Errors: ${totals.errors}`);
  console.log(`\nProcessing Time: ${duration}s`);
  console.log(`Average Time per Batch: ${(parseFloat(duration) / totals.batches).toFixed(2)}s\n`);

  // Save detailed report
  const report = {
    summary: {
      dateRun: new Date().toISOString(),
      batchRange: '51-100',
      ...totals,
      durationSeconds: parseFloat(duration),
    },
    batchDetails: allStats,
  };

  const reportPath = resolve(__dirname, '../data/docs/batch-51-100-application-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📊 Detailed report saved to: ${reportPath}\n`);

  await prisma.$disconnect();
}

// Run the application
applyBatches51to100().catch(console.error);
