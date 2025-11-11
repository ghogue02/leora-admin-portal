#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import OpenAI from 'openai';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

// Initialize Anthropic client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TastingNotes {
  aroma: string;
  palate: string;
  finish: string;
}

interface ServingInfo {
  temperature: string;
  decanting: string;
  glassware: string;
}

interface WineDetails {
  region: string;
  grapeVariety: string;
  vintage: number | null;
  style: string;
  ageability: string;
}

interface EnrichedProductData {
  description: string;
  tastingNotes: TastingNotes;
  foodPairings: string[];
  servingInfo: ServingInfo;
  wineDetails: WineDetails;
}

interface CliOptions {
  preview: boolean;
  test: number | null;
  batch: number;
  all: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    preview: false,
    test: null,
    batch: 20,
    all: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--preview') {
      options.preview = true;
    } else if (arg === '--test' && args[i + 1]) {
      options.test = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--batch' && args[i + 1]) {
      options.batch = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--all') {
      options.all = true;
    }
  }

  return options;
}

async function generateProductData(
  product: {
    name: string;
    brand: string | null;
    category: string | null;
  },
  sku:
    | {
        code: string;
        size: string | null;
        abv: number | null;
      }
    | undefined
): Promise<EnrichedProductData> {
  const prompt = `You are an expert sommelier with deep knowledge of wines from around the world. Generate detailed, professional wine product information for this product:

Product Name: ${product.name}
Brand: ${product.brand || 'Unknown'}
Category: ${product.category || 'Wine'}
Size: ${sku?.size || 'Unknown'}
ABV: ${sku?.abv || 'Unknown'}%

Generate comprehensive product data in JSON format with EXACTLY this structure:

{
  "description": "Write a professional 2-3 sentence description highlighting the wine's origin, producer reputation, and key characteristics. Be compelling but accurate.",
  "tastingNotes": {
    "aroma": "Describe primary and secondary aromas using professional wine terminology (e.g., 'Dark cherry, violet, leather, and subtle oak')",
    "palate": "Describe taste profile including body, tannins, acidity, fruit characteristics (e.g., 'Full-bodied with silky tannins, balanced acidity, flavors of blackberry and dark chocolate')",
    "finish": "Describe the length and quality of finish (e.g., 'Long, elegant finish with lingering spice notes')"
  },
  "foodPairings": [
    "Pairing 1 (be specific, e.g., 'Grilled ribeye steak')",
    "Pairing 2",
    "Pairing 3",
    "Pairing 4",
    "Pairing 5"
  ],
  "servingInfo": {
    "temperature": "Optimal serving temperature with range (e.g., '60-65°F (16-18°C)')",
    "decanting": "Decanting recommendation (e.g., 'Decant 30 minutes before serving' or 'No decanting needed')",
    "glassware": "Recommended glass type (e.g., 'Bordeaux glass' or 'White wine glass')"
  },
  "wineDetails": {
    "region": "Specific wine region if identifiable (e.g., 'Napa Valley, California' or 'Bordeaux, France')",
    "grapeVariety": "Primary grape variety/varieties (e.g., 'Cabernet Sauvignon' or 'Chardonnay, Viognier blend')",
    "vintage": null or specific year as number,
    "style": "Wine style category (e.g., 'Full-bodied red', 'Crisp white', 'Sparkling rosé')",
    "ageability": "Aging potential and drinking window (e.g., 'Drink now through 2028' or 'Peak in 5-10 years')"
  }
}

IMPORTANT INSTRUCTIONS:
- Be specific and professional. Use proper wine terminology.
- Base information on the product name and any recognizable producer/region.
- If specific details cannot be determined, make reasonable inferences based on wine type and traditional regional styles.
- Ensure all JSON fields are present and properly formatted.
- For vintage, use null if not determinable from the name, otherwise use a 4-digit year number.
- Make food pairings specific and diverse (include proteins, dishes, and occasions).
- Respond ONLY with valid JSON, no additional text.`;

  try {
    const response = await openai.responses.create({
      model: process.env.WINE_ENRICHMENT_MODEL ?? 'gpt-5-mini',
      reasoning: { effort: 'medium' },
      max_output_tokens: 2048,
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt,
            },
          ],
        },
      ],
    });

    const responseText = (response.output_text ?? []).join('').trim();

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in OpenAI response');
    }
    const data = JSON.parse(jsonMatch[0]);

    // Validate the structure
    if (
      !data.description ||
      !data.tastingNotes ||
      !data.foodPairings ||
      !data.servingInfo ||
      !data.wineDetails
    ) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return data as EnrichedProductData;
  } catch (error) {
    console.error('Error generating product data:', error);
    throw error;
  }
}

async function enrichProducts(options: CliOptions) {
  const { preview, test, batch, all } = options;

  console.log('🍷 OpenAI Product Enrichment\n');
  console.log('═'.repeat(80));
  console.log(`Mode: ${preview ? '👁️  PREVIEW (No saves)' : '💾 SAVE to database'}`);
  console.log(`Batch size: ${batch}`);
  if (test) {
    console.log(`Test mode: Processing ${test} products`);
  } else if (all) {
    console.log('Processing: ALL products without descriptions');
  }
  console.log('═'.repeat(80));
  console.log();

  try {
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Error: OPENAI_API_KEY not found in environment variables');
      console.error('   Add it to .env.local file');
      process.exit(1);
    }

    // Get products to enrich
    const query = {
      where: {
        description: null,
      },
      include: {
        skus: {
          take: 1,
          select: {
            code: true,
            size: true,
            abv: true,
          },
        },
      },
      orderBy: {
        name: 'asc' as const,
      },
    };

    // Apply limits
    if (test) {
      Object.assign(query, { take: test });
    } else if (!all) {
      Object.assign(query, { take: batch });
    }

    const products = await prisma.product.findMany(query);

    if (products.length === 0) {
      console.log('✅ No products need enrichment!');
      console.log('   All products already have descriptions.');
      return;
    }

    console.log(`📊 Found ${products.length} products to enrich\n`);

    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    // Process products
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const sku = product.skus[0];

      console.log('─'.repeat(80));
      console.log(`\n[${i + 1}/${products.length}] Processing: ${product.name}`);
      console.log(`   Brand: ${product.brand || 'N/A'} | Category: ${product.category || 'N/A'}`);
      if (sku) {
        console.log(`   SKU: ${sku.code} | Size: ${sku.size || 'N/A'} | ABV: ${sku.abv || 'N/A'}%`);
      }

      try {
        // Generate enriched data using OpenAI
        console.log('\n   🤖 Generating enrichment data with OpenAI...');
        const enrichedData = await generateProductData(product, sku);

        // Display preview
        console.log('\n   ✅ Generated Data:');
        console.log(`   📝 Description: ${enrichedData.description.slice(0, 120)}...`);
        console.log(`   👃 Aroma: ${enrichedData.tastingNotes.aroma}`);
        console.log(`   👅 Palate: ${enrichedData.tastingNotes.palate.slice(0, 80)}...`);
        console.log(`   🍽️  Food Pairings: ${enrichedData.foodPairings.slice(0, 3).join(', ')}`);
        console.log(`   🍷 Region: ${enrichedData.wineDetails.region}`);
        console.log(`   🍇 Grapes: ${enrichedData.wineDetails.grapeVariety}`);

        // Save to database if not in preview mode
        if (!preview) {
          console.log('\n   💾 Saving to database...');

          // Store enrichment data in a metadata JSON field
          // Since the schema doesn't have a metadata field, we'll update description only
          // and log a note about storing the full data
          await prisma.product.update({
            where: { id: product.id },
            data: {
              description: enrichedData.description,
              // Note: Full enrichment data would go in a metadata JSON field
              // Add this field to your schema if you want to store:
              // metadata: enrichedData
            },
          });

          console.log('   ✓ Saved description to database');
          console.log(
            '   ℹ️  Note: To save full enrichment data, add a metadata Json field to Product schema'
          );
        } else {
          console.log('\n   👁️  PREVIEW MODE - Not saving to database');
        }

        successCount++;

        // Rate limiting: 1 second between requests to avoid hitting API limits
        if (i < products.length - 1) {
          console.log('\n   ⏱️  Waiting 1 second (rate limiting)...');
          await sleep(1000);
        }
      } catch (error) {
        errorCount++;
        console.error(
          `\n   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        if (error instanceof Error && error.stack) {
          console.error('   Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
        }

        // Continue with next product
        await sleep(500);
      }
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 ENRICHMENT SUMMARY');
    console.log('─'.repeat(80));
    console.log(`✅ Successful: ${successCount}/${products.length}`);
    console.log(`❌ Errors: ${errorCount}/${products.length}`);
    console.log(`⏱️  Time: ${elapsed}s`);
    console.log(`⚡ Rate: ${(products.length / parseFloat(elapsed)).toFixed(1)} products/sec`);

    if (preview) {
      console.log('\n💡 To save to database, run without --preview flag');
    } else {
      console.log('\n✅ Products enriched and saved to database!');
    }

    console.log('═'.repeat(80) + '\n');
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printUsage() {
  console.log(`
🍷 OpenAI Product Enrichment Script

USAGE:
  tsx scripts/claude-enrich-products.ts [options]

OPTIONS:
  --preview       Preview mode - don't save to database (default: save)
  --test N        Process only N products for testing
  --batch N       Set batch size (default: 20)
  --all           Process all products without descriptions

EXAMPLES:
  # Preview 5 products (test mode)
  tsx scripts/claude-enrich-products.ts --preview --test 5

  # Enrich 20 products (default batch) and save
  tsx scripts/claude-enrich-products.ts

  # Enrich 50 products and save
  tsx scripts/claude-enrich-products.ts --batch 50

  # Enrich all products without preview
  tsx scripts/claude-enrich-products.ts --all

  # Preview all products without saving
  tsx scripts/claude-enrich-products.ts --preview --all

REQUIREMENTS:
  - OPENAI_API_KEY must be set in .env.local
  - Products must have null descriptions to be processed

RATE LIMITING:
  - 1 second delay between requests
  - Adjust batch size based on API limits

OUTPUT FORMAT:
  Each product receives:
  - Professional description (2-3 sentences)
  - Tasting notes (aroma, palate, finish)
  - 5 food pairings
  - Serving info (temperature, decanting, glassware)
  - Wine details (region, grapes, vintage, style, ageability)
`);
}

// Main execution
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

const options = parseArgs();
enrichProducts(options);
