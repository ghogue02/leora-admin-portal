#!/usr/bin/env node

/**
 * Apply Wine Enrichment Results via MCP Supabase - Batches 151-188
 * Uses MCP supabase tools to update database
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const DATA_DIR = '/Users/greghogue/Leora2/web/data';

// Parse command line arguments
const args = process.argv.slice(2);
const START_BATCH = parseInt(args[0]) || 151;
const END_BATCH = parseInt(args[1]) || 188;

async function processBatch(batchNum) {
  try {
    const filePath = path.join(DATA_DIR, `wine-research-results-batch-${batchNum}.json`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return { batch: batchNum, status: 'skipped', reason: 'file_not_found' };
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Handle array format or object format
    let enrichmentData;
    try {
      const parsed = JSON.parse(fileContent);
      if (Array.isArray(parsed)) {
        enrichmentData = { wines: parsed };
      } else {
        enrichmentData = parsed;
      }
    } catch (parseError) {
      return { batch: batchNum, status: 'error', error: parseError.message };
    }

    if (!enrichmentData.wines || enrichmentData.wines.length === 0) {
      return { batch: batchNum, status: 'skipped', reason: 'no_wines' };
    }

    return {
      batch: batchNum,
      status: 'ready',
      wines: enrichmentData.wines,
      count: enrichmentData.wines.length
    };

  } catch (error) {
    return {
      batch: batchNum,
      status: 'error',
      error: error.message
    };
  }
}

async function main() {
  console.log('🍷 Wine Enrichment Data Preparation');
  console.log(`📦 Loading batches ${START_BATCH}-${END_BATCH}`);
  console.log('=' + '='.repeat(60));

  const batches = [];
  for (let i = START_BATCH; i <= END_BATCH; i++) {
    batches.push(i);
  }

  const results = await Promise.all(batches.map(processBatch));

  const ready = results.filter(r => r.status === 'ready');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  console.log('\n📊 BATCH LOADING COMPLETE');
  console.log('='.repeat(60));
  console.log(`✓ Ready: ${ready.length} batches`);
  console.log(`⊘ Skipped: ${skipped.length} batches`);
  console.log(`✗ Errors: ${errors.length} batches`);

  const totalWines = ready.reduce((sum, r) => sum + r.count, 0);
  console.log(`\n🍷 Total wines ready: ${totalWines}`);

  // Save consolidated data for MCP processing
  const allWines = ready.flatMap(r => r.wines);
  const outputPath = path.join(DATA_DIR, 'checkpoints', `enrichment-batch-${START_BATCH}-${END_BATCH}.json`);

  await fs.writeFile(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    batchRange: `${START_BATCH}-${END_BATCH}`,
    totalBatches: ready.length,
    totalWines: allWines.length,
    wines: allWines.slice(0, 10), // Sample of first 10
    summary: {
      ready: ready.length,
      skipped: skipped.length,
      errors: errors.length
    }
  }, null, 2));

  console.log(`\n💾 Data saved to: ${outputPath}`);
  console.log('\n📝 Sample wines from batches:');

  allWines.slice(0, 3).forEach((wine, idx) => {
    console.log(`\n${idx + 1}. ${wine.productName}`);
    console.log(`   Region: ${wine.wineDetails?.region || 'N/A'}`);
    console.log(`   Variety: ${wine.wineDetails?.grapeVariety || 'N/A'}`);
  });

  console.log('\n✅ Data ready for database update!');
  console.log(`📊 Total: ${totalWines} wines across ${ready.length} batches`);

  // Generate SQL update statements
  console.log('\n📝 Generating update summary...\n');

  return {
    totalWines,
    totalBatches: ready.length,
    wines: allWines
  };
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
