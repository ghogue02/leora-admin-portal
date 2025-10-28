import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

config({ path: resolve(__dirname, '../.env.local') });
const prisma = new PrismaClient();

interface WineEnrichment {
  productId?: string;
  productName: string;
  description: string;
  tastingNotes: { aroma: string; palate: string; finish: string; };
  foodPairings: string[];
  servingInfo: { temperature: string; decanting: string; glassware: string; };
  wineDetails: { region: string; grapeVarieties: string[]; vintage?: string; abv?: string; agingPotential?: string; [key: string]: any; };
  metadata?: { researchedAt?: string; source?: string; confidence?: string; [key: string]: any; };
}

function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^\w\s]/g, '').trim();
  const s2 = str2.toLowerCase().replace(/[^\w\s]/g, '').trim();
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const commonWords = words1.filter(w => words2.includes(w));
  return commonWords.length / Math.max(words1.length, words2.length);
}

async function applyBatchEnrichment(startBatch: number, endBatch: number) {
  console.log(`\n🍷 BATCH ENRICHMENT APPLICATION (Batches ${startBatch}-${endBatch})\n`);
  let totalProcessed = 0, totalUpdated = 0, totalNotFound = 0, totalErrors = 0;
  const notFoundProducts: string[] = [];

  for (let batchNum = startBatch; batchNum <= endBatch; batchNum++) {
    const resultsFile = resolve(__dirname, `../data/wine-research-results-batch-${batchNum}.json`);
    if (!existsSync(resultsFile)) { console.log(`⚠️  Batch ${batchNum}: File not found`); continue; }

    console.log(`\n📦 Processing Batch ${batchNum}...`);
    try {
      const fileContent = JSON.parse(readFileSync(resultsFile, 'utf-8'));
      let wines: WineEnrichment[] = Array.isArray(fileContent) ? fileContent : (fileContent.wines || fileContent.researchResults || []);
      if (wines.length === 0) { console.log(`❌ Unknown JSON structure`); totalErrors++; continue; }
      console.log(`Found ${wines.length} wines`);

      let batchUpdated = 0, batchNotFound = 0, batchErrors = 0;
      for (const wine of wines) {
        try {
          await prisma.$transaction(async (tx) => {
            totalProcessed++;
            let product = await tx.product.findFirst({ where: { name: wine.productName } });
            if (!product) {
              const allProducts = await tx.product.findMany({ select: { id: true, name: true } });
              let bestMatch = null, bestScore = 0.8;
              for (const p of allProducts) {
                const score = fuzzyMatch(wine.productName, p.name);
                if (score > bestScore) { bestScore = score; bestMatch = p; }
              }
              if (bestMatch) {
                product = await tx.product.findUnique({ where: { id: bestMatch.id } });
                console.log(`  🔍 Fuzzy: ${wine.productName} -> ${product?.name} (${(bestScore*100).toFixed(0)}%)`);
              }
            }
            if (!product) { console.log(`  ⚠️  Not found: ${wine.productName}`); notFoundProducts.push(wine.productName); batchNotFound++; return; }
            const timestamp = new Date();
            const enrichedBy = `accurate-v2-${timestamp.getTime()}`;
            await tx.product.update({
              where: { id: product.id },
              data: { description: wine.description, tastingNotes: wine.tastingNotes as any, foodPairings: wine.foodPairings, servingInfo: wine.servingInfo as any, wineDetails: wine.wineDetails as any, enrichedAt: timestamp, enrichedBy }
            });
            console.log(`  ✅ ${product.name}`);
            batchUpdated++;
          });
        } catch (error) { console.error(`  ❌ Error: ${error}`); batchErrors++; }
      }
      totalUpdated += batchUpdated; totalNotFound += batchNotFound; totalErrors += batchErrors;
      console.log(`Batch ${batchNum}: ✅${batchUpdated} ⚠️${batchNotFound} ❌${batchErrors}`);
    } catch (error) { console.error(`❌ Batch ${batchNum} error: ${error}`); totalErrors++; }
  }

  console.log(`\n\n🎉 FINAL SUMMARY\n`);
  console.log(`Total processed: ${totalProcessed}`);
  console.log(`✅ Updated: ${totalUpdated}`);
  console.log(`⚠️  Not found: ${totalNotFound}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log(`📊 Match rate: ${totalProcessed > 0 ? ((totalUpdated/totalProcessed)*100).toFixed(1) : 0}%`);
  if (notFoundProducts.length > 0) {
    console.log(`\n📝 Not found (${notFoundProducts.length}):`);
    notFoundProducts.slice(0, 20).forEach(name => console.log(`  - ${name}`));
    if (notFoundProducts.length > 20) console.log(`  ... +${notFoundProducts.length - 20} more`);
  }
  await prisma.$disconnect();
}

const start = process.argv[2] ? parseInt(process.argv[2]) : 1;
const end = process.argv[3] ? parseInt(process.argv[3]) : 50;
applyBatchEnrichment(start, end).catch(console.error);