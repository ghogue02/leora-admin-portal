/**
 * Wine Enrichment Script Using Claude Code Agent System
 *
 * This script uses Claude Code's Task tool to spawn researcher agents
 * that will accurately research each wine and generate unique tasting notes.
 *
 * Usage:
 *   npx tsx scripts/enrich-wines-with-agents.ts [limit] [skip]
 *
 * Examples:
 *   npx tsx scripts/enrich-wines-with-agents.ts 5 0    # Process first 5 wines
 *   npx tsx scripts/enrich-wines-with-agents.ts 50 0   # Pilot: 50 wines
 *   npx tsx scripts/enrich-wines-with-agents.ts 1879 0 # Full catalog
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, readFileSync, existsSync } from 'fs';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

interface WineResearchTask {
  productId: string;
  productName: string;
  brand: string | null;
  vintage: string | null;
  varietal: string | null;
}

/**
 * Extract wine details from product name
 */
function extractWineDetails(productName: string, brand: string | null): WineResearchTask {
  // Extract vintage
  const vintageMatch = productName.match(/\b(19|20)\d{2}\b/);
  const vintage = vintageMatch ? vintageMatch[0] : null;

  // Common varietals
  const varietals = [
    'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Shiraz',
    'Chardonnay', 'Sauvignon Blanc', 'Pinot Grigio', 'Riesling',
    'Malbec', 'Tempranillo', 'Grenache', 'Zinfandel', 'Nebbiolo',
    'Sangiovese', 'Barbera', 'Chenin Blanc', 'Viognier'
  ];

  let varietal: string | null = null;
  for (const v of varietals) {
    if (productName.toLowerCase().includes(v.toLowerCase())) {
      varietal = v;
      break;
    }
  }

  return {
    productId: '',
    productName,
    brand,
    vintage,
    varietal,
  };
}

/**
 * Create a research task file for Claude Code agents
 */
function createResearchTask(wines: WineResearchTask[], batchNumber: number): string {
  const taskFile = resolve(__dirname, `../data/wine-research-batch-${batchNumber}.json`);

  const instructions = {
    task: 'ACCURATE_WINE_ENRICHMENT',
    description: 'Research each wine and provide accurate, unique tasting notes',
    instructions: `
For each wine in the wines array below:

1. **WEB SEARCH** for the exact wine using WebFetch tool:
   - Search: "{productName} {vintage} wine tasting notes reviews"
   - Look for Wine Spectator, Wine Enthusiast, Decanter, Vivino reviews
   - Extract REAL tasting notes from professional sources

2. **FALLBACK STRATEGY** if exact wine not found:
   - Level 1: Search for the producer's general style
   - Level 2: Search for varietal + region characteristics
   - Level 3: Use professional wine knowledge for varietal

3. **GENERATE UNIQUE CONTENT**:
   - DO NOT use generic template language
   - Base notes on research findings
   - Create distinct descriptions for each wine
   - Professional wine critic tone

4. **RETURN JSON** for each wine with structure:
   {
     "productId": "...",
     "productName": "...",
     "description": "2-3 sentence wine description",
     "tastingNotes": {
       "aroma": "Detailed, unique aroma description (3-4 sentences)",
       "palate": "Detailed palate description (3-4 sentences)",
       "finish": "Finish description (2-3 sentences)"
     },
     "foodPairings": ["specific pairing 1", "pairing 2", "pairing 3", "pairing 4", "pairing 5"],
     "servingInfo": {
       "temperature": "Specific temperature for this wine",
       "decanting": "Decanting advice for this specific wine",
       "glassware": "Recommended glass"
     },
     "wineDetails": {
       "region": "Specific region/appellation",
       "grapeVariety": "Exact grape composition",
       "vintage": "...",
       "style": "Wine style",
       "ageability": "Aging potential and drinking window"
     },
     "metadata": {
       "source": "exact-match|producer-match|varietal-match|generic",
       "confidence": 0.0-1.0,
       "researchedAt": "ISO timestamp"
     }
   }

CRITICAL: Each wine MUST have UNIQUE tasting notes. NO DUPLICATES!
`,
    wines,
    outputFile: resolve(__dirname, `../data/wine-research-results-batch-${batchNumber}.json`),
  };

  writeFileSync(taskFile, JSON.stringify(instructions, null, 2));
  return taskFile;
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : 5;
  const skipCount = args[1] ? parseInt(args[1]) : 0;
  const batchSize = 10; // Process in batches

  console.log(`\n🍷 CLAUDE CODE AGENT-BASED WINE ENRICHMENT`);
  console.log(`=========================================\n`);
  console.log(`Total to process: ${limit} products`);
  console.log(`Starting from: ${skipCount}`);
  console.log(`Batch size: ${batchSize}\n`);

  // Get products
  const products = await prisma.product.findMany({
    where: {},
    select: {
      id: true,
      name: true,
      brand: true,
    },
    skip: skipCount,
    take: limit,
  });

  console.log(`Found ${products.length} products\n`);

  // Create research tasks
  const wineTasks: WineResearchTask[] = products.map(p => ({
    productId: p.id,
    ...extractWineDetails(p.name, p.brand),
  }));

  // Split into batches
  const batches: WineResearchTask[][] = [];
  for (let i = 0; i < wineTasks.length; i += batchSize) {
    batches.push(wineTasks.slice(i, i + batchSize));
  }

  console.log(`Created ${batches.length} batches\n`);

  // Create task files for each batch
  batches.forEach((batch, i) => {
    const taskFile = createResearchTask(batch, i + 1);
    console.log(`✅ Batch ${i + 1}: ${taskFile}`);
    console.log(`   Wines: ${batch.map(w => w.productName).join(', ').substring(0, 100)}...`);
  });

  console.log(`\n\n📋 NEXT STEPS:`);
  console.log(`=============\n`);
  console.log(`1. Review task files in /data/wine-research-batch-*.json`);
  console.log(`2. Use Claude Code to spawn researcher agents for each batch:`);
  console.log(`   \n   Example for batch 1:`);
  console.log(`   Task("Wine Researcher", "Read /data/wine-research-batch-1.json and research each wine...", "researcher")\n`);
  console.log(`3. Agents will create result files: /data/wine-research-results-batch-*.json`);
  console.log(`4. Run update script to apply results to database\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
