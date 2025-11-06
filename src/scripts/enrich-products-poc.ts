import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import OpenAI from 'openai';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function enrichProducts(limit = 5) {
  console.log('🍷 Product Enrichment - Proof of Concept\n');
  console.log(`Enriching ${limit} products with GPT-4...\n`);

  try {
    // Get first N products without descriptions
    const products = await prisma.product.findMany({
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
      take: limit,
    });

    console.log(`Found ${products.length} products to enrich\n`);
    console.log('─'.repeat(80));

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const sku = product.skus[0];

      console.log(`\n[${i + 1}/${products.length}] ${product.name}`);
      console.log(`Brand: ${product.brand || 'Unknown'}`);
      console.log(`Category: ${product.category || 'Uncategorized'}`);

      try {
        const enrichedData = await generateProductData(product, sku);

        console.log('\n✓ Generated Data:');
        console.log(`  Description: ${enrichedData.description.slice(0, 100)}...`);
        console.log(`  Aroma: ${enrichedData.tastingNotes.aroma}`);
        console.log(`  Pairings: ${enrichedData.foodPairings.slice(0, 3).join(', ')}`);

        // Preview mode - don't actually update database
        console.log('\n  💾 [PREVIEW MODE - Not saving to database]');

        // Uncomment to actually save:
        // await prisma.product.update({
        //   where: { id: product.id },
        //   data: {
        //     description: enrichedData.description,
        //     metadata: enrichedData,
        //   },
        // });
        // console.log('  ✓ Saved to database');

        // Rate limiting
        await sleep(1000);
      } catch (error) {
        console.error(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      console.log('─'.repeat(80));
    }

    console.log('\n✅ Enrichment preview complete!');
    console.log('\nTo save to database, uncomment the update section in the script.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function generateProductData(
  product: { name: string; brand: string | null; category: string | null },
  sku: { code: string; size: string | null; abv: number | null } | undefined
) {
  const prompt = `You are an expert sommelier and wine educator. Generate detailed, professional product information for this wine:

Product Name: ${product.name}
Brand: ${product.brand || 'Unknown'}
Category: ${product.category || 'Wine'}
Size: ${sku?.size || 'Unknown'}
ABV: ${sku?.abv || 'Unknown'}%

Generate comprehensive product data in JSON format with these fields:

{
  "description": "Write a 2-3 sentence professional product description highlighting the wine's origin, style, and key characteristics. Make it compelling but accurate.",
  "tastingNotes": {
    "aroma": "Describe the nose/aroma in 5-8 words using professional wine terminology",
    "palate": "Describe the taste profile in 8-12 words including body, tannins, acidity",
    "finish": "Describe the finish in 5-8 words"
  },
  "foodPairings": ["pairing1", "pairing2", "pairing3", "pairing4", "pairing5"],
  "servingTemp": "Optimal serving temperature range",
  "servingSuggestions": "Brief serving suggestions (decanting, glassware, etc)",
  "ageability": "Drink now or age potential",
  "wineStyle": "Brief style description (e.g., 'Full-bodied red', 'Crisp white')",
  "region": "Wine region if identifiable from name",
  "grapeVariety": "Primary grape variety/varieties if identifiable"
}

Be specific, professional, and accurate. If information cannot be determined from the name, make reasonable inferences based on wine type and region conventions.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      {
        role: 'system',
        content:
          'You are a professional sommelier generating accurate wine product data. Respond only with valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(content);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get limit from command line args
const limit = parseInt(process.argv[2]) || 5;
enrichProducts(limit);
