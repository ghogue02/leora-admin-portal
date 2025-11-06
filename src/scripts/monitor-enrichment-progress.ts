import { readdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function monitorProgress() {
  const dataDir = resolve(__dirname, '../data');

  console.log(`\n🍷 WINE ENRICHMENT PROGRESS MONITOR`);
  console.log(`===================================\n`);

  // Count task files
  const taskFiles = readdirSync(dataDir).filter(f => f.startsWith('wine-research-batch-'));
  console.log(`📋 Total Batches Created: ${taskFiles.length}`);

  // Count result files
  const resultFiles = readdirSync(dataDir).filter(f => f.startsWith('wine-research-results-batch-'));
  console.log(`✅ Batches Researched: ${resultFiles.length}`);
  console.log(`⏳ Batches Remaining: ${taskFiles.length - resultFiles.length}\n`);

  // Check database enrichment status
  const totalProducts = await prisma.product.count();
  const accurateEnriched = await prisma.product.count({
    where: {
      enrichedBy: { contains: 'accurate-v2' }
    }
  });
  const oldEnriched = await prisma.product.count({
    where: {
      enrichedBy: { not: { contains: 'accurate-v2' } },
      tastingNotes: { not: null }
    }
  });

  console.log(`📊 DATABASE STATUS:`);
  console.log(`   Total Products: ${totalProducts}`);
  console.log(`   Accurately Enriched: ${accurateEnriched} (${((accurateEnriched/totalProducts)*100).toFixed(1)}%)`);
  console.log(`   Old Enrichment: ${oldEnriched}`);
  console.log(`   Not Enriched: ${totalProducts - accurateEnriched - oldEnriched}\n`);

  // Calculate progress
  const expectedWinesResearched = resultFiles.length * 10;
  const progressPercent = ((accurateEnriched / totalProducts) * 100).toFixed(1);

  console.log(`📈 PROGRESS:`);
  console.log(`   Batches: ${resultFiles.length}/${taskFiles.length} (${((resultFiles.length/taskFiles.length)*100).toFixed(1)}%)`);
  console.log(`   Wines: ${accurateEnriched}/${totalProducts} (${progressPercent}%)\n`);

  // Estimate remaining time
  const avgTimePerBatch = 10; // minutes
  const remainingBatches = taskFiles.length - resultFiles.length;
  const estimatedHours = (remainingBatches * avgTimePerBatch) / 60;

  console.log(`⏱️  ESTIMATES:`);
  console.log(`   Remaining batches: ${remainingBatches}`);
  console.log(`   Estimated time: ${estimatedHours.toFixed(1)} hours (at ${avgTimePerBatch} min/batch)\n`);

  // List next batches to process
  console.log(`🎯 NEXT BATCHES TO PROCESS:`);
  const nextBatches = [];
  for (let i = 1; i <= taskFiles.length; i++) {
    const resultFile = resolve(dataDir, `wine-research-results-batch-${i}.json`);
    if (!existsSync(resultFile)) {
      nextBatches.push(i);
      if (nextBatches.length >= 10) break;
    }
  }
  console.log(`   ${nextBatches.join(', ')}\n`);

  await prisma.$disconnect();
}

monitorProgress().catch(console.error);
