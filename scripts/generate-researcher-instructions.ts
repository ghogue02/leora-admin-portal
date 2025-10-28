#!/usr/bin/env tsx
/**
 * Generate Researcher Agent Instructions
 *
 * Creates Task spawning commands for concurrent batch processing
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

function generateInstructions(startBatch: number, endBatch: number): void {
  console.log(`\n🎯 RESEARCHER AGENT TASK SPAWNING COMMANDS`);
  console.log(`==========================================\n`);
  console.log(`Copy and paste this entire message into Claude Code:\n`);
  console.log(`${'='.repeat(80)}\n`);

  console.log(`Process wine enrichment batches ${startBatch}-${endBatch} concurrently.\n`);
  console.log(`Spawn ${endBatch - startBatch + 1} researcher agents in parallel:\n`);

  for (let batchNum = startBatch; batchNum <= endBatch; batchNum++) {
    const taskFile = `/Users/greghogue/Leora2/web/data/wine-research-batch-${batchNum}.json`;
    const outputFile = `/Users/greghogue/Leora2/web/data/wine-research-results-batch-${batchNum}.json`;

    // Try to read batch task to get wine count
    let wineCount = 10; // default
    try {
      const task = JSON.parse(readFileSync(resolve(__dirname, `../data/wine-research-batch-${batchNum}.json`), 'utf-8'));
      wineCount = task.wines.length;
    } catch (e) {
      // Use default
    }

    console.log(`Task("Wine Researcher Batch ${batchNum}", \``);
    console.log(`  BATCH ${batchNum}: Research ${wineCount} wines with accurate, unique tasting notes`);
    console.log(`  `);
    console.log(`  📋 INPUT: ${taskFile}`);
    console.log(`  💾 OUTPUT: ${outputFile}`);
    console.log(`  `);
    console.log(`  BEFORE STARTING:`);
    console.log(`  npx claude-flow@alpha hooks pre-task --description "Research batch ${batchNum}"`);
    console.log(`  npx claude-flow@alpha hooks session-restore --session-id "swarm-enrichment-batch-${batchNum}"`);
    console.log(`  `);
    console.log(`  RESEARCH PROCESS:`);
    console.log(`  1. Read the batch task file above`);
    console.log(`  2. For EACH of the ${wineCount} wines:`);
    console.log(`     a) Use WebFetch to search: "{wine name} {vintage} wine tasting notes reviews"`);
    console.log(`     b) Target sources: Wine Spectator, Wine Enthusiast, Decanter, Vivino`);
    console.log(`     c) Extract REAL tasting notes from professional reviews`);
    console.log(`     d) Generate unique, accurate description (NO generic templates!)`);
    console.log(`     e) Update memory: npx claude-flow@alpha hooks post-edit --file "batch-${batchNum}.json" --memory-key "swarm/enrichment/batch-${batchNum}/wine-{index}"`);
    console.log(`  `);
    console.log(`  3. Create JSON array with enriched wines following exact schema:`);
    console.log(`     - productName, description (2-3 sentences)`);
    console.log(`     - tastingNotes: { aroma (3-4 sentences), palate (3-4 sentences), finish (2-3 sentences) }`);
    console.log(`     - foodPairings: [5 specific pairings]`);
    console.log(`     - servingInfo: { temperature, decanting, glassware }`);
    console.log(`     - wineDetails: { region, grapeVariety, vintage, style, ageability }`);
    console.log(`     - metadata: { source, confidence (0-1), researchedAt (ISO) }`);
    console.log(`  `);
    console.log(`  4. Save results to output file above`);
    console.log(`  `);
    console.log(`  AFTER COMPLETION:`);
    console.log(`  npx claude-flow@alpha hooks post-task --task-id "batch-${batchNum}"`);
    console.log(`  npx claude-flow@alpha hooks notify --message "Batch ${batchNum} complete: ${wineCount} wines researched"`);
    console.log(`  npx claude-flow@alpha hooks session-end --export-metrics true`);
    console.log(`  `);
    console.log(`  ⚠️ CRITICAL: Each wine MUST have UNIQUE tasting notes - NO DUPLICATES!`);
    console.log(`\`, "researcher")`);
    console.log(``);
  }

  console.log(`\n${'='.repeat(80)}\n`);
  console.log(`✅ Generated Task spawning commands for batches ${startBatch}-${endBatch}`);
  console.log(`📊 Total batches: ${endBatch - startBatch + 1}`);
  console.log(`🍇 Estimated wines: ~${(endBatch - startBatch + 1) * 10}\n`);
  console.log(`💡 TIP: After spawning, monitor progress with:`);
  console.log(`   npx tsx scripts/track-batch-progress.ts show\n`);
}

// CLI Usage
if (require.main === module) {
  const startBatch = process.argv[2] ? parseInt(process.argv[2]) : 78;
  const endBatch = process.argv[3] ? parseInt(process.argv[3]) : 87;

  if (endBatch < startBatch) {
    console.error('❌ End batch must be >= start batch');
    process.exit(1);
  }

  if (endBatch - startBatch > 20) {
    console.warn(`⚠️  Warning: Processing ${endBatch - startBatch + 1} batches at once may be too many.`);
    console.warn(`   Consider processing in groups of 10 for better management.\n`);
  }

  generateInstructions(startBatch, endBatch);
}
