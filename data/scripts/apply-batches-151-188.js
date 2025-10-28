#!/usr/bin/env node

/**
 * Apply Wine Enrichment Results to Database - FINAL Batches 151-188
 * Reads enrichment results and updates the Supabase database
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATA_DIR = '/Users/greghogue/Leora2/web/data';

// Parse command line arguments
const args = process.argv.slice(2);
const START_BATCH = parseInt(args[0]) || 151;
const END_BATCH = parseInt(args[1]) || 188;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyEnrichmentToDB(enrichmentData) {
  const updates = [];
  const errors = [];

  for (const wine of enrichmentData.wines) {
    try {
      // Find product by name
      const { data: products, error: findError } = await supabase
        .from('products')
        .select('id, productName')
        .ilike('productName', wine.productName)
        .limit(1);

      if (findError) throw findError;

      if (!products || products.length === 0) {
        errors.push({
          productName: wine.productName,
          error: 'Product not found in database'
        });
        continue;
      }

      const productId = products[0].id;

      // Prepare update data
      const updateData = {
        description: wine.description,
        tastingNotes: wine.tastingNotes,
        foodPairings: wine.foodPairings,
        servingInfo: wine.servingInfo,
        wineDetails: wine.wineDetails,
        enrichmentMetadata: wine.metadata,
        updatedAt: new Date().toISOString()
      };

      // Update product
      const { error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId);

      if (updateError) throw updateError;

      updates.push({
        productId,
        productName: wine.productName,
        status: 'success'
      });

    } catch (error) {
      errors.push({
        productName: wine.productName,
        error: error.message
      });
    }
  }

  return { updates, errors };
}

async function processBatch(batchNum) {
  try {
    const filePath = path.join(DATA_DIR, `wine-research-results-batch-${batchNum}.json`);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      console.log(`⊘ Batch ${batchNum}: File not found, skipping`);
      return { batch: batchNum, status: 'skipped', reason: 'file_not_found' };
    }

    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Handle array format (from old batches) or object format (from new batches)
    let enrichmentData;
    try {
      const parsed = JSON.parse(fileContent);
      if (Array.isArray(parsed)) {
        enrichmentData = { wines: parsed };
      } else {
        enrichmentData = parsed;
      }
    } catch (parseError) {
      console.error(`✗ Batch ${batchNum}: JSON parse error - ${parseError.message}`);
      return { batch: batchNum, status: 'error', error: parseError.message };
    }

    if (!enrichmentData.wines || enrichmentData.wines.length === 0) {
      console.log(`⊘ Batch ${batchNum}: No wines to process`);
      return { batch: batchNum, status: 'skipped', reason: 'no_wines' };
    }

    console.log(`Processing batch ${batchNum}: ${enrichmentData.wines.length} wines...`);

    const { updates, errors } = await applyEnrichmentToDB(enrichmentData);

    console.log(`✓ Batch ${batchNum}: ${updates.length} updated, ${errors.length} errors`);

    if (errors.length > 0 && errors.length <= 3) {
      errors.forEach(err => console.log(`  ⚠ ${err.productName}: ${err.error}`));
    }

    return {
      batch: batchNum,
      status: 'completed',
      updated: updates.length,
      errors: errors.length,
      errorDetails: errors
    };

  } catch (error) {
    console.error(`✗ Batch ${batchNum}: ${error.message}`);
    return {
      batch: batchNum,
      status: 'error',
      error: error.message
    };
  }
}

async function main() {
  console.log('🍷 Applying Wine Enrichment to Database');
  console.log(`📦 Processing batches ${START_BATCH}-${END_BATCH}`);
  console.log('=' + '='.repeat(60));

  const batches = [];
  for (let i = START_BATCH; i <= END_BATCH; i++) {
    batches.push(i);
  }

  const results = [];

  // Process in chunks of 5 to avoid rate limits
  const CHUNK_SIZE = 5;
  for (let i = 0; i < batches.length; i += CHUNK_SIZE) {
    const chunk = batches.slice(i, i + CHUNK_SIZE);
    const chunkResults = await Promise.all(chunk.map(processBatch));
    results.push(...chunkResults);

    // Brief pause between chunks
    if (i + CHUNK_SIZE < batches.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 PROCESSING COMPLETE');
  console.log('='.repeat(60));

  const completed = results.filter(r => r.status === 'completed');
  const skipped = results.filter(r => r.status === 'skipped');
  const errors = results.filter(r => r.status === 'error');

  const totalUpdated = completed.reduce((sum, r) => sum + (r.updated || 0), 0);
  const totalErrors = completed.reduce((sum, r) => sum + (r.errors || 0), 0);

  console.log(`✓ Completed: ${completed.length} batches`);
  console.log(`⊘ Skipped: ${skipped.length} batches`);
  console.log(`✗ Failed: ${errors.length} batches`);
  console.log(`\n📈 Wines updated: ${totalUpdated}`);
  console.log(`⚠ Update errors: ${totalErrors}`);

  if (errors.length > 0) {
    console.log('\n❌ Failed batches:');
    errors.forEach(e => console.log(`  - Batch ${e.batch}: ${e.error}`));
  }

  // Save detailed results
  const reportPath = path.join(DATA_DIR, 'checkpoints', `apply-results-${START_BATCH}-${END_BATCH}.json`);
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    batchRange: `${START_BATCH}-${END_BATCH}`,
    summary: {
      totalBatches: results.length,
      completed: completed.length,
      skipped: skipped.length,
      failed: errors.length,
      winesUpdated: totalUpdated,
      updateErrors: totalErrors
    },
    results
  }, null, 2));

  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  console.log('\n🎉 DATABASE UPDATE COMPLETE!\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
