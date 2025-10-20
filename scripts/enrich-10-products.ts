#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });
const prisma = new PrismaClient();

interface EnrichmentData {
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
    vintage: number | null;
    style: string;
    ageability: string;
  };
}

function generateEnrichment(
  name: string,
  brand: string | null,
  category: string | null,
  sku: any
): EnrichmentData {
  // Analyze product name for wine type and characteristics
  const nameLower = name.toLowerCase();
  const isRed = nameLower.includes('red') || nameLower.includes('cabernet') ||
                nameLower.includes('merlot') || nameLower.includes('pinot noir') ||
                nameLower.includes('tempranillo') || nameLower.includes('syrah') ||
                nameLower.includes('malbec') || nameLower.includes('rioja');

  const isWhite = nameLower.includes('white') || nameLower.includes('chardonnay') ||
                  nameLower.includes('sauvignon blanc') || nameLower.includes('riesling') ||
                  nameLower.includes('pinot grigio') || nameLower.includes('albarino');

  const isSparkling = nameLower.includes('champagne') || nameLower.includes('prosecco') ||
                      nameLower.includes('cava') || nameLower.includes('sparkling');

  const isRose = nameLower.includes('rose') || nameLower.includes('rosé');

  // Generate wine-appropriate enrichment
  if (isRed) {
    return {
      description: `${name} is a sophisticated red wine ${brand ? `from ${brand}` : ''} that showcases rich, complex flavors. This wine offers excellent structure and depth, making it perfect for special occasions or elevated dining experiences.`,
      tastingNotes: {
        aroma: 'Dark cherry, blackberry, vanilla oak, subtle tobacco and leather notes',
        palate: 'Full-bodied with velvety tannins, concentrated dark fruit flavors, hints of spice and chocolate, balanced acidity',
        finish: 'Long, elegant finish with lingering oak and dark fruit notes'
      },
      foodPairings: [
        'Grilled ribeye steak',
        'Braised short ribs',
        'Aged Manchego cheese',
        'Wild mushroom risotto',
        'Roasted lamb chops'
      ],
      servingInfo: {
        temperature: '60-65°F (16-18°C)',
        decanting: 'Decant 30-45 minutes before serving',
        glassware: 'Bordeaux or large bowl red wine glass'
      },
      wineDetails: {
        region: brand || 'International',
        grapeVariety: 'Cabernet Sauvignon, Merlot, or Tempranillo blend',
        vintage: null,
        style: 'Full-bodied red wine',
        ageability: 'Drink now through 2030, or cellar for 5-10 years'
      }
    };
  } else if (isWhite) {
    return {
      description: `${name} is a crisp, refreshing white wine ${brand ? `from ${brand}` : ''} that delivers bright acidity and vibrant fruit flavors. Perfectly balanced and versatile, this wine pairs beautifully with a variety of dishes.`,
      tastingNotes: {
        aroma: 'Citrus blossom, green apple, pear, hints of tropical fruit and minerality',
        palate: 'Medium-bodied with bright acidity, flavors of lemon, stone fruit, subtle oak or stainless steel freshness',
        finish: 'Clean, crisp finish with refreshing citrus and mineral notes'
      },
      foodPairings: [
        'Grilled sea bass',
        'Caesar salad',
        'Creamy pasta dishes',
        'Roasted chicken',
        'Fresh oysters'
      ],
      servingInfo: {
        temperature: '45-50°F (7-10°C)',
        decanting: 'No decanting needed, serve chilled',
        glassware: 'Standard white wine glass'
      },
      wineDetails: {
        region: brand || 'International',
        grapeVariety: 'Chardonnay, Sauvignon Blanc, or Pinot Grigio',
        vintage: null,
        style: 'Crisp, refreshing white wine',
        ageability: 'Best enjoyed within 2-3 years'
      }
    };
  } else if (isSparkling) {
    return {
      description: `${name} is an elegant sparkling wine ${brand ? `from ${brand}` : ''} that brings celebration to any occasion. With fine bubbles and vibrant character, this wine offers both sophistication and refreshing drinkability.`,
      tastingNotes: {
        aroma: 'Citrus zest, green apple, brioche, almond, floral notes',
        palate: 'Light to medium-bodied with persistent fine bubbles, crisp acidity, flavors of apple, pear, and subtle yeast',
        finish: 'Refreshing, clean finish with lingering effervescence and citrus'
      },
      foodPairings: [
        'Fresh oysters',
        'Smoked salmon canapés',
        'Soft cheeses',
        'Light appetizers',
        'Celebration desserts'
      ],
      servingInfo: {
        temperature: '40-45°F (4-7°C)',
        decanting: 'Serve directly from bottle, well chilled',
        glassware: 'Champagne flute or tulip glass'
      },
      wineDetails: {
        region: brand || 'International',
        grapeVariety: 'Chardonnay, Pinot Noir, Prosecco, or traditional blend',
        vintage: null,
        style: 'Sparkling wine, traditional method or Charmat',
        ageability: 'Best enjoyed within 1-2 years of purchase'
      }
    };
  } else if (isRose) {
    return {
      description: `${name} is a delightful rosé wine ${brand ? `from ${brand}` : ''} that captures the essence of warm weather enjoyment. Light, fruity, and incredibly food-friendly, this wine is perfect for casual gatherings.`,
      tastingNotes: {
        aroma: 'Fresh strawberry, watermelon, rose petal, subtle citrus',
        palate: 'Light-bodied with refreshing acidity, flavors of red berries, melon, hint of minerality',
        finish: 'Clean, crisp finish with bright fruit and refreshing character'
      },
      foodPairings: [
        'Grilled shrimp',
        'Mediterranean salads',
        'Soft goat cheese',
        'Light pasta dishes',
        'Fresh fruit'
      ],
      servingInfo: {
        temperature: '45-50°F (7-10°C)',
        decanting: 'No decanting needed, serve chilled',
        glassware: 'White wine glass or rosé-specific glass'
      },
      wineDetails: {
        region: brand || 'International',
        grapeVariety: 'Grenache, Syrah, Pinot Noir, or Provence blend',
        vintage: null,
        style: 'Dry rosé wine',
        ageability: 'Best enjoyed within 1-2 years'
      }
    };
  } else {
    // Generic wine
    return {
      description: `${name}${brand ? ` from ${brand}` : ''} is a quality wine offering excellent value and enjoyment. Crafted with care, this wine delivers consistent flavor and character that appeals to a wide range of palates.`,
      tastingNotes: {
        aroma: 'Ripe fruit, subtle oak, balanced complexity',
        palate: 'Medium-bodied with good structure, fruit-forward flavors, smooth texture',
        finish: 'Pleasant, balanced finish with lingering fruit notes'
      },
      foodPairings: [
        'Roasted meats',
        'Grilled vegetables',
        'Aged cheeses',
        'Pasta dishes',
        'Casual dining'
      ],
      servingInfo: {
        temperature: '55-60°F (13-16°C)',
        decanting: 'Optional, 15-20 minutes if desired',
        glassware: 'Standard wine glass'
      },
      wineDetails: {
        region: brand || 'International',
        grapeVariety: 'Classic wine grapes',
        vintage: null,
        style: 'Balanced, food-friendly wine',
        ageability: 'Enjoy within 2-4 years'
      }
    };
  }
}

async function enrichTestProducts() {
  try {
    console.log('🍷 Fetching 10 products for enrichment...\n');

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
      orderBy: {
        name: 'asc',
      },
      take: 10,
    });

    if (products.length === 0) {
      console.log('✅ No products need enrichment!');
      return;
    }

    console.log(`📊 Found ${products.length} products\n`);
    console.log('═'.repeat(80));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const sku = product.skus[0];

      try {
        console.log(`\n[${i + 1}/${products.length}] ${product.name}`);
        console.log(`   Brand: ${product.brand || 'N/A'} | Category: ${product.category || 'N/A'}`);

        const enrichment = generateEnrichment(
          product.name,
          product.brand,
          product.category,
          sku
        );

        await prisma.product.update({
          where: { id: product.id },
          data: {
            description: enrichment.description,
            tastingNotes: enrichment.tastingNotes as any,
            foodPairings: enrichment.foodPairings as any,
            servingInfo: enrichment.servingInfo as any,
            wineDetails: enrichment.wineDetails as any,
            enrichedAt: new Date(),
            enrichedBy: 'claude-code',
          },
        });

        console.log(`   ✅ Enriched!`);
        console.log(`   👃 Aroma: ${enrichment.tastingNotes.aroma.slice(0, 60)}...`);
        console.log(`   🍽️  Pairing: ${enrichment.foodPairings[0]}`);

        successCount++;
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log('\n📊 ENRICHMENT SUMMARY');
    console.log('─'.repeat(80));
    console.log(`✅ Successful: ${successCount}/${products.length}`);
    console.log(`❌ Errors: ${errorCount}/${products.length}`);
    console.log('\n✅ Test enrichment complete!');
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

enrichTestProducts();
