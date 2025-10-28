import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../.env.local') });
const prisma = new PrismaClient();

async function applyEnrichment(batchNumber: number) {
  const resultsFile = resolve(__dirname, `../data/wine-research-results-batch-${batchNumber}.json`);

  console.log(`\n📊 Applying Wine Enrichment Results`);
  console.log(`===================================\n`);
  console.log(`Reading: ${resultsFile}\n`);

  // Read results
  const fileContent = JSON.parse(readFileSync(resultsFile, 'utf-8'));
  
  // Handle different JSON structures
  let results;
  if (Array.isArray(fileContent)) {
    results = fileContent;
  } else if (fileContent.wines) {
    results = fileContent.wines;
  } else if (fileContent.researchResults) {
    results = fileContent.researchResults;
  } else {
    console.log('❌ Unknown JSON structure in batch file\n');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${results.length} enriched wines\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const wine of results) {
    try {
      console.log(`Updating: ${wine.productName}`);

      // Find product by name
      const product = await prisma.product.findFirst({
        where: {
          name: wine.productName,
        },
      });

      if (!product) {
        console.log(`  ⚠️  Product not found in database, skipping`);
        errorCount++;
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

      console.log(`  ✅ Updated successfully (${wine.metadata.confidence} confidence)`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Error updating: ${error}`);
      errorCount++;
    }
  }

  console.log(`\n\n✅ ENRICHMENT APPLIED`);
  console.log(`===================`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total: ${results.length}\n`);

  await prisma.$disconnect();
}

const batchNumber = process.argv[2] ? parseInt(process.argv[2]) : 1;
applyEnrichment(batchNumber).catch(console.error);
