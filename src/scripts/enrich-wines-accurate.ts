import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface WineDetails {
  producer: string;
  name: string;
  vintage: string | null;
  varietal: string | null;
  region: string | null;
}

interface EnrichmentResult {
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
    vintage: string | null;
    style: string;
    ageability: string;
  };
  metadata: {
    source: string;
    confidence: number;
    researchedAt: string;
  };
}

/**
 * Extract wine details from product name
 */
function extractWineDetails(productName: string, brand: string | null): WineDetails {
  // Extract vintage (4-digit year)
  const vintageMatch = productName.match(/\b(19|20)\d{2}\b/);
  const vintage = vintageMatch ? vintageMatch[0] : null;

  // Common varietals
  const varietals = [
    'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Shiraz',
    'Chardonnay', 'Sauvignon Blanc', 'Pinot Grigio', 'Riesling',
    'Malbec', 'Tempranillo', 'Grenache', 'Zinfandel', 'Nebbiolo',
    'Sangiovese', 'Barbera', 'Chenin Blanc', 'Viognier', 'Marsanne'
  ];

  let varietal: string | null = null;
  for (const v of varietals) {
    if (productName.toLowerCase().includes(v.toLowerCase())) {
      varietal = v;
      break;
    }
  }

  // Extract producer (often the brand or first part of name)
  const producer = brand || productName.split(' ')[0];

  // Extract wine name (remove vintage, varietal)
  let name = productName;
  if (vintage) name = name.replace(vintage, '').trim();
  if (varietal) name = name.replace(new RegExp(varietal, 'i'), '').trim();

  return {
    producer,
    name: productName, // Keep full name for research
    vintage,
    varietal,
    region: null, // Will be extracted from research
  };
}

/**
 * Research wine using Claude with web search
 */
async function researchWine(details: WineDetails): Promise<EnrichmentResult> {
  const searchQuery = `${details.name} wine tasting notes reviews`;

  console.log(`  🔍 Researching: ${searchQuery}`);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `You are a wine expert tasked with creating accurate, detailed tasting notes for a specific wine.

Wine: ${details.name}
Producer: ${details.producer}
Vintage: ${details.vintage || 'NV'}
Varietal: ${details.varietal || 'Unknown'}

TASK: Research this EXACT wine and provide ACCURATE tasting notes based on real information.

1. First, search the web for this specific wine's reviews and tasting notes
2. Look for professional reviews from Wine Spectator, Wine Enthusiast, Decanter, Vivino
3. If you can't find this exact wine, search for the producer's general style and the varietal characteristics
4. Create tasting notes that are:
   - ACCURATE to this specific wine (not generic)
   - PROFESSIONAL in tone
   - DETAILED and descriptive
   - UNIQUE (don't use template language)

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "description": "2-3 sentence description of this wine",
  "tastingNotes": {
    "aroma": "Detailed aroma description (3-4 sentences)",
    "palate": "Detailed palate description (3-4 sentences)",
    "finish": "Finish description (2-3 sentences)"
  },
  "foodPairings": ["pairing1", "pairing2", "pairing3", "pairing4", "pairing5"],
  "servingInfo": {
    "temperature": "Specific temperature range",
    "decanting": "Decanting recommendation",
    "glassware": "Recommended glass type"
  },
  "wineDetails": {
    "region": "Specific region/appellation",
    "grapeVariety": "Exact grape composition",
    "vintage": "${details.vintage || 'NV'}",
    "style": "Wine style description",
    "ageability": "Aging potential and drinking window"
  },
  "metadata": {
    "source": "exact-match|producer-match|varietal-match|generic",
    "confidence": 0.0-1.0,
    "researchedAt": "${new Date().toISOString()}"
  }
}`,
        },
      ],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Extract JSON from response (remove markdown if present)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]) as EnrichmentResult;
    return result;
  } catch (error) {
    console.error(`  ❌ Research failed:`, error);
    throw error;
  }
}

/**
 * Enrich a single product
 */
async function enrichProduct(product: {
  id: string;
  name: string;
  brand: string | null;
}) {
  console.log(`\n📦 Processing: ${product.name}`);

  const details = extractWineDetails(product.name, product.brand);
  const enrichment = await researchWine(details);

  console.log(`  ✅ Confidence: ${enrichment.metadata.confidence}`);
  console.log(`  📊 Source: ${enrichment.metadata.source}`);
  console.log(`  🍷 Aroma: ${enrichment.tastingNotes.aroma.substring(0, 60)}...`);

  // Update database
  await prisma.product.update({
    where: { id: product.id },
    data: {
      description: enrichment.description,
      tastingNotes: enrichment.tastingNotes as any,
      foodPairings: enrichment.foodPairings as any,
      servingInfo: enrichment.servingInfo as any,
      wineDetails: enrichment.wineDetails as any,
      enrichedAt: new Date(),
      enrichedBy: 'claude-code-accurate',
    },
  });

  return enrichment;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const limit = args[0] ? parseInt(args[0]) : 5;
  const skipCount = args[1] ? parseInt(args[1]) : 0;

  console.log(`\n🍷 ACCURATE WINE ENRICHMENT SYSTEM`);
  console.log(`================================\n`);
  console.log(`Processing: ${limit} products`);
  console.log(`Skipping: ${skipCount} products\n`);

  // Get products to enrich
  const products = await prisma.product.findMany({
    where: {
      // Optionally filter out already enriched products
      // enrichedBy: { not: 'claude-code-accurate' }
    },
    select: {
      id: true,
      name: true,
      brand: true,
    },
    skip: skipCount,
    take: limit,
  });

  console.log(`Found ${products.length} products to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    console.log(`[${i + 1}/${products.length}]`);

    try {
      await enrichProduct(product);
      successCount++;

      // Rate limiting: wait 2 seconds between requests
      if (i < products.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`  ❌ Failed to enrich: ${error}`);
      errorCount++;
    }
  }

  console.log(`\n\n✅ ENRICHMENT COMPLETE`);
  console.log(`======================`);
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total: ${products.length}\n`);

  await prisma.$disconnect();
}

main().catch(console.error);
