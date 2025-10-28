#!/usr/bin/env tsx
/**
 * Process Single Batch with Researcher Agent
 *
 * This script processes a single wine research batch using proper wine research
 * methodology with WebFetch for accurate data.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface WineResearchTask {
  productId: string;
  productName: string;
  brand: string | null;
  vintage: string | null;
  varietal: string | null;
}

interface EnrichedWine {
  productId: string;
  productName: string;
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

async function processBatchWithResearcher(batchNumber: number): Promise<void> {
  console.log(`\n🔬 PROCESSING BATCH ${batchNumber} WITH RESEARCHER AGENT`);
  console.log(`====================================================\n`);

  // Read batch task
  const taskFile = resolve(__dirname, `../data/wine-research-batch-${batchNumber}.json`);
  const task = JSON.parse(readFileSync(taskFile, 'utf-8'));

  console.log(`📋 Task has ${task.wines.length} wines to research\n`);
  console.log(`Instructions:`);
  console.log(task.instructions);
  console.log(`\n${'='.repeat(80)}\n`);

  console.log(`⚠️  IMPORTANT: This script prepares the batch for researcher agent processing.`);
  console.log(`The actual wine research should be done by a Claude Code researcher agent`);
  console.log(`using the WebFetch tool for accurate, real tasting notes.\n`);

  console.log(`🎯 TO PROCESS THIS BATCH:\n`);
  console.log(`Use Claude Code to spawn a researcher agent with this task:\n`);
  console.log(`Task("Wine Researcher Batch ${batchNumber}", \``);
  console.log(`  Read the task file at ${taskFile}`);
  console.log(`  `);
  console.log(`  For each of the ${task.wines.length} wines in the batch:`);
  console.log(`  1. Use WebFetch to search for "{wine name} {vintage} wine tasting notes reviews"`);
  console.log(`  2. Look for Wine Spectator, Wine Enthusiast, Decanter, Vivino reviews`);
  console.log(`  3. Extract REAL tasting notes from professional sources`);
  console.log(`  4. Generate unique, accurate content based on research`);
  console.log(`  `);
  console.log(`  Save results to: ${task.outputFile}`);
  console.log(`  `);
  console.log(`  Each wine should have unique tasting notes - NO DUPLICATES!`);
  console.log(`\`, "researcher")\n`);

  // Display wines in this batch
  console.log(`📝 Wines in Batch ${batchNumber}:\n`);
  task.wines.forEach((wine: WineResearchTask, index: number) => {
    console.log(`   ${index + 1}. ${wine.productName}`);
    if (wine.vintage) console.log(`      Vintage: ${wine.vintage}`);
    if (wine.varietal) console.log(`      Varietal: ${wine.varietal}`);
    if (wine.brand) console.log(`      Brand: ${wine.brand}`);
  });

  console.log(`\n${'='.repeat(80)}\n`);
  console.log(`✅ Batch ${batchNumber} is ready for researcher agent processing`);
  console.log(`Expected output: ${task.outputFile}\n`);
}

// CLI Usage
if (require.main === module) {
  const batchNumber = process.argv[2] ? parseInt(process.argv[2]) : 78;
  processBatchWithResearcher(batchNumber).catch(console.error);
}

export { processBatchWithResearcher };
