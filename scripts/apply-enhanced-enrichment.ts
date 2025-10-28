import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFile, writeFile } from 'fs/promises';
import { matchProduct, findClosestMatches, type EnrichedWineData } from '../src/lib/enhanced-product-matcher';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

interface EnrichmentStats {
  totalProducts: number;
  enrichedBefore: number;
  processedBatches: number;
  newEnrichments: number;
  matchesByType: Record<string, number>;
  unmatchedProducts: Array<{
    productId: string;
    productName: string;
    closestMatches: Array<{
      wineName: string;
      similarityScore: number;
    }>;
  }>;
  errors: string[];
}

const stats: EnrichmentStats = {
  totalProducts: 0,
  enrichedBefore: 0,
  processedBatches: 0,
  newEnrichments: 0,
  matchesByType: {
    exact: 0,
    normalized: 0,
    fuzzy: 0,
    'vintage-agnostic': 0,
    partial: 0,
    'no-match': 0,
  },
  unmatchedProducts: [],
  errors: [],
};

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFilePath = `/Users/greghogue/Leora2/web/data/logs/enhanced-matching-${timestamp}.log`;

/**
 * Append to log file
 */
async function log(message: string) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  console.log(message);
  await writeFile(logFilePath, logMessage, { flag: 'a' });
}

/**
 * Load enriched wines from a batch result file
 */
async function loadBatchResults(batchNumber: number): Promise<EnrichedWineData[]> {
  const filePath = `/Users/greghogue/Leora2/web/data/wine-research-results-batch-${batchNumber}.json`;

  try {
    const content = await readFile(filePath, 'utf-8');
    const wines = JSON.parse(content) as EnrichedWineData[];
    return wines;
  } catch (error) {
    await log(`ERROR: Could not load batch ${batchNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    stats.errors.push(`Batch ${batchNumber} load failed`);
    return [];
  }
}

/**
 * Apply enrichment to a single product
 */
async function enrichProduct(productId: string, wine: EnrichedWineData) {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        description: wine.description,
        tastingNotes: wine.tastingNotes as any,
        foodPairings: wine.foodPairings as any,
        servingInfo: wine.servingInfo as any,
        wineDetails: wine.wineDetails as any,
        enrichedAt: new Date(),
        enrichedBy: 'enhanced-matcher-v2',
      },
    });

    stats.newEnrichments++;
    return true;
  } catch (error) {
    await log(`ERROR: Failed to enrich product ${productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    stats.errors.push(`Product ${productId} enrichment failed`);
    return false;
  }
}

/**
 * Process all batches and match products
 */
async function processAllBatches() {
  await log('=== ENHANCED PRODUCT ENRICHMENT STARTED ===');
  await log('');

  // Get all products without enrichment
  const unenrichedProducts = await prisma.product.findMany({
    where: {
      OR: [
        { tastingNotes: { equals: null } },
        { description: { equals: null } },
      ],
    },
    select: {
      id: true,
      name: true,
    },
  });

  stats.totalProducts = await prisma.product.count();
  stats.enrichedBefore = stats.totalProducts - unenrichedProducts.length;

  await log(`Total products in database: ${stats.totalProducts}`);
  await log(`Already enriched: ${stats.enrichedBefore}`);
  await log(`Products to enrich: ${unenrichedProducts.length}`);
  await log('');

  // Create a map of products by normalized name for quick lookup
  const productMap = new Map(
    unenrichedProducts.map(p => [p.name.toLowerCase(), p])
  );

  // Process batches 1-188
  for (let batchNumber = 1; batchNumber <= 188; batchNumber++) {
    await log(`--- Processing Batch ${batchNumber} ---`);

    const enrichedWines = await loadBatchResults(batchNumber);

    if (enrichedWines.length === 0) {
      await log(`Batch ${batchNumber}: No data found, skipping`);
      continue;
    }

    stats.processedBatches++;

    // Try to match each unenriched product against this batch's wines
    const batchMatches: string[] = [];
    const batchUpdates: Array<{ productId: string; wine: EnrichedWineData }> = [];

    for (const product of unenrichedProducts) {
      const matchResult = matchProduct(product.name, enrichedWines);

      if (matchResult.wine) {
        stats.matchesByType[matchResult.matchType]++;
        batchMatches.push(
          `  ✓ ${product.name} → ${matchResult.wine.productName} [${matchResult.matchType}, ${(matchResult.score * 100).toFixed(1)}%]`
        );
        batchUpdates.push({ productId: product.id, wine: matchResult.wine });
      }
    }

    // Apply updates in batches of 50
    if (batchUpdates.length > 0) {
      await log(`Batch ${batchNumber}: Found ${batchUpdates.length} matches`);

      for (let i = 0; i < batchUpdates.length; i += 50) {
        const batch = batchUpdates.slice(i, i + 50);
        await log(`  Updating products ${i + 1}-${Math.min(i + 50, batchUpdates.length)}...`);

        for (const { productId, wine } of batch) {
          await enrichProduct(productId, wine);
        }
      }

      // Log matches
      for (const match of batchMatches) {
        await log(match);
      }
    } else {
      await log(`Batch ${batchNumber}: No matches found`);
    }

    await log('');
  }

  // Find unmatched products and their closest matches
  await log('=== ANALYZING UNMATCHED PRODUCTS ===');
  await log('');

  const stillUnenriched = await prisma.product.findMany({
    where: {
      OR: [
        { tastingNotes: { equals: null } },
        { description: { equals: null } },
      ],
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (stillUnenriched.length > 0) {
    await log(`Still unenriched: ${stillUnenriched.length} products`);
    await log('');

    // For each unenriched product, find closest matches across all batches
    for (const product of stillUnenriched.slice(0, 100)) {
      // Limit to first 100 for logging
      let allWines: EnrichedWineData[] = [];

      // Collect wines from a few representative batches
      for (const batchNum of [1, 50, 100, 150, 188]) {
        const wines = await loadBatchResults(batchNum);
        allWines = allWines.concat(wines);
      }

      const closestMatches = findClosestMatches(product.name, allWines, 3);

      stats.unmatchedProducts.push({
        productId: product.id,
        productName: product.name,
        closestMatches: closestMatches.map(m => ({
          wineName: m.wine.productName,
          similarityScore: m.score,
        })),
      });

      await log(`Unmatched: ${product.name}`);
      await log(`  Closest matches:`);
      for (const match of closestMatches) {
        await log(`    - ${match.wine.productName} (${(match.score * 100).toFixed(1)}% similar)`);
      }
      await log('');
    }
  } else {
    await log('All products successfully enriched!');
  }

  await log('');
  await log('=== ENRICHMENT COMPLETE ===');
  await log('');
}

/**
 * Generate final report
 */
async function generateFinalReport() {
  const enrichedAfter = await prisma.product.count({
    where: {
      tastingNotes: { not: { equals: null } },
    },
  });

  const report = `# Final Enrichment Report

## Summary

- **Total Products**: ${stats.totalProducts}
- **Enriched Before**: ${stats.enrichedBefore} (${((stats.enrichedBefore / stats.totalProducts) * 100).toFixed(1)}%)
- **Enriched After**: ${enrichedAfter} (${((enrichedAfter / stats.totalProducts) * 100).toFixed(1)}%)
- **New Enrichments**: ${stats.newEnrichments}
- **Processed Batches**: ${stats.processedBatches} / 188

## Match Statistics by Strategy

| Strategy | Matches | Percentage |
|----------|---------|------------|
| Exact Match | ${stats.matchesByType.exact} | ${((stats.matchesByType.exact / stats.newEnrichments) * 100).toFixed(1)}% |
| Normalized Match | ${stats.matchesByType.normalized} | ${((stats.matchesByType.normalized / stats.newEnrichments) * 100).toFixed(1)}% |
| Fuzzy Match (85%+) | ${stats.matchesByType.fuzzy} | ${((stats.matchesByType.fuzzy / stats.newEnrichments) * 100).toFixed(1)}% |
| Vintage-Agnostic | ${stats.matchesByType['vintage-agnostic']} | ${((stats.matchesByType['vintage-agnostic'] / stats.newEnrichments) * 100).toFixed(1)}% |
| Partial Match | ${stats.matchesByType.partial} | ${((stats.matchesByType.partial / stats.newEnrichments) * 100).toFixed(1)}% |
| No Match | ${stats.matchesByType['no-match']} | - |

## Remaining Unenriched Products

${stats.unmatchedProducts.length > 0 ? `
Found ${stats.unmatchedProducts.length} products that could not be matched automatically.

### Sample Unmatched Products (Top 10)

${stats.unmatchedProducts.slice(0, 10).map((p, i) => `
#### ${i + 1}. ${p.productName}

**Closest Matches:**
${p.closestMatches.map(m => `- ${m.wineName} (${(m.similarityScore * 100).toFixed(1)}% similarity)`).join('\n')}
`).join('\n')}

### Recommendations for Manual Review

1. **Review closest matches** - Many unmatched products may have very close matches (70-84% similarity) that could be manually verified
2. **Check for name variations** - Some products may have different naming conventions (e.g., abbreviations, different word order)
3. **Missing batches** - Verify that all 188 batch files were successfully processed
4. **Consider bulk matching** - Products with >75% similarity to a batch wine might be safe to match with manual verification
` : 'All products successfully matched and enriched!'}

## Errors Encountered

${stats.errors.length > 0 ? `
\`\`\`
${stats.errors.join('\n')}
\`\`\`
` : 'No errors encountered during processing.'}

## Next Steps

1. **Manual Review**: Review unmatched products and their closest matches
2. **Quality Check**: Sample verify enriched products for accuracy
3. **Bulk Update**: Consider batch-updating products with high-similarity matches (75-84%)
4. **Missing Data**: Investigate any missing or failed batch files

---

Generated: ${new Date().toISOString()}
Tool: enhanced-product-matcher v2.0
Log File: ${logFilePath}
`;

  const reportPath = `/Users/greghogue/Leora2/web/docs/final-enrichment-report.md`;
  await writeFile(reportPath, report);

  console.log('\n' + report);
  console.log(`\nReport saved to: ${reportPath}`);
  console.log(`Log file saved to: ${logFilePath}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    await processAllBatches();
    await generateFinalReport();

    console.log('\n✅ Enhanced enrichment complete!');
    console.log(`New enrichments: ${stats.newEnrichments}`);
    console.log(`Match rate: ${((stats.newEnrichments / (stats.totalProducts - stats.enrichedBefore)) * 100).toFixed(1)}%`);
  } catch (error) {
    console.error('Fatal error:', error);
    await log(`FATAL ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
