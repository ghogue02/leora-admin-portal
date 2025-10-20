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
    decanting?: string;
    glassware: string;
  };
  wineDetails: {
    region: string;
    grapeVariety: string;
    vintage: string | null;
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
  const lowerName = name.toLowerCase();
  const lowerBrand = (brand || '').toLowerCase();
  const lowerCategory = (category || '').toLowerCase();

  // Detect wine type
  const isRed = lowerCategory.includes('red') || lowerName.includes('red') ||
                lowerName.includes('cabernet') || lowerName.includes('merlot') ||
                lowerName.includes('pinot noir') || lowerName.includes('shiraz') ||
                lowerName.includes('tempranillo') || lowerName.includes('malbec') ||
                lowerName.includes('zinfandel') || lowerName.includes('syrah');

  const isWhite = lowerCategory.includes('white') || lowerName.includes('white') ||
                  lowerName.includes('chardonnay') || lowerName.includes('sauvignon blanc') ||
                  lowerName.includes('pinot grigio') || lowerName.includes('riesling') ||
                  lowerName.includes('albariño') || lowerName.includes('vermentino');

  const isRose = lowerCategory.includes('rosé') || lowerCategory.includes('rose') ||
                 lowerName.includes('rosé') || lowerName.includes('rose');

  const isSparkling = lowerCategory.includes('sparkling') || lowerName.includes('champagne') ||
                      lowerName.includes('prosecco') || lowerName.includes('cava') ||
                      lowerName.includes('sparkling');

  // Generate professional enrichment based on wine type
  if (isRed) {
    return generateRedWineEnrichment(name, brand, lowerName, lowerBrand);
  } else if (isWhite) {
    return generateWhiteWineEnrichment(name, brand, lowerName, lowerBrand);
  } else if (isRose) {
    return generateRoseWineEnrichment(name, brand, lowerName, lowerBrand);
  } else if (isSparkling) {
    return generateSparklingWineEnrichment(name, brand, lowerName, lowerBrand);
  } else {
    return generateGenericWineEnrichment(name, brand);
  }
}

function generateRedWineEnrichment(
  name: string,
  brand: string | null,
  lowerName: string,
  lowerBrand: string
): EnrichmentData {
  const brandName = brand || 'This producer';

  // Detect region clues
  let region = 'Unknown Region';
  let grapeVariety = 'Red Blend';
  let style = 'Full-bodied red wine';

  if (lowerName.includes('rioja') || lowerBrand.includes('rioja')) {
    region = 'Rioja, Spain';
    grapeVariety = 'Tempranillo, Garnacha blend';
  } else if (lowerName.includes('bordeaux') || lowerName.includes('medoc')) {
    region = 'Bordeaux, France';
    grapeVariety = 'Cabernet Sauvignon, Merlot blend';
  } else if (lowerName.includes('tuscany') || lowerName.includes('chianti')) {
    region = 'Tuscany, Italy';
    grapeVariety = 'Sangiovese';
  } else if (lowerName.includes('napa') || lowerName.includes('california')) {
    region = 'Napa Valley, California';
    grapeVariety = 'Cabernet Sauvignon';
  } else if (lowerName.includes('malbec') || lowerName.includes('argentina')) {
    region = 'Mendoza, Argentina';
    grapeVariety = 'Malbec';
  } else if (lowerName.includes('pinot noir') || lowerName.includes('burgundy')) {
    region = 'Burgundy, France';
    grapeVariety = 'Pinot Noir';
    style = 'Medium-bodied red wine';
  }

  const aromas = [
    'dark cherry, blackberry, vanilla, tobacco',
    'plum, blackcurrant, cedar, dark chocolate',
    'ripe berries, oak spice, leather, dried herbs',
    'black cherry, cassis, toasted oak, violets'
  ];

  const palates = [
    'Full-bodied with velvety tannins, rich dark fruit flavors, and notes of spice and oak.',
    'Medium to full-bodied with structured tannins, layers of dark fruit, and a complex finish.',
    'Bold and concentrated with firm tannins, balanced acidity, and persistent fruit character.',
    'Elegant structure with integrated tannins, dark berry flavors, and subtle earthy undertones.'
  ];

  const finishes = [
    'Long, elegant finish with lingering spice and dark fruit notes',
    'Smooth, persistent finish with hints of vanilla and chocolate',
    'Extended finish with well-integrated oak and fruit complexity',
    'Balanced finish with fine-grained tannins and lasting fruit character'
  ];

  return {
    description: `${brandName} crafts this exceptional ${style.toLowerCase()} showcasing the terroir of ${region}. Rich and expressive, it offers layers of complexity perfect for both immediate enjoyment and cellar aging.`,
    tastingNotes: {
      aroma: aromas[Math.floor(Math.random() * aromas.length)],
      palate: palates[Math.floor(Math.random() * palates.length)],
      finish: finishes[Math.floor(Math.random() * finishes.length)]
    },
    foodPairings: [
      'Grilled ribeye steak with chimichurri',
      'Braised short ribs with red wine reduction',
      'Aged Manchego or Pecorino cheese',
      'Wild mushroom and truffle risotto',
      'Roasted duck breast with cherry sauce',
      'Dark chocolate desserts'
    ],
    servingInfo: {
      temperature: '60-65°F (16-18°C)',
      decanting: 'Decant 30-60 minutes before serving to enhance aromatics',
      glassware: 'Large Bordeaux glass'
    },
    wineDetails: {
      region,
      grapeVariety,
      vintage: null,
      style,
      ageability: 'Drink now through 2030, or cellar for further development'
    }
  };
}

function generateWhiteWineEnrichment(
  name: string,
  brand: string | null,
  lowerName: string,
  lowerBrand: string
): EnrichmentData {
  const brandName = brand || 'This winery';

  let region = 'Unknown Region';
  let grapeVariety = 'White Blend';
  let style = 'Crisp white wine';

  if (lowerName.includes('chablis') || lowerName.includes('burgundy')) {
    region = 'Burgundy, France';
    grapeVariety = 'Chardonnay';
    style = 'Mineral-driven white wine';
  } else if (lowerName.includes('sancerre') || lowerName.includes('loire')) {
    region = 'Loire Valley, France';
    grapeVariety = 'Sauvignon Blanc';
  } else if (lowerName.includes('riesling') || lowerName.includes('mosel')) {
    region = 'Mosel, Germany';
    grapeVariety = 'Riesling';
    style = 'Aromatic white wine';
  } else if (lowerName.includes('albariño') || lowerName.includes('rias baixas')) {
    region = 'Rías Baixas, Spain';
    grapeVariety = 'Albariño';
  } else if (lowerName.includes('pinot grigio') || lowerName.includes('italy')) {
    region = 'Friuli, Italy';
    grapeVariety = 'Pinot Grigio';
  }

  const aromas = [
    'citrus blossom, green apple, white peach, mineral notes',
    'lemon zest, pear, honeysuckle, wet stone',
    'grapefruit, lime, tropical fruits, fresh herbs',
    'white flowers, crisp apple, melon, saline minerality'
  ];

  const palates = [
    'Crisp and refreshing with bright acidity, citrus flavors, and a clean mineral finish.',
    'Light to medium-bodied with vibrant acidity, stone fruit notes, and elegant balance.',
    'Zesty and lively with citrus and tropical notes, balanced by crisp acidity.',
    'Fresh and aromatic with delicate fruit flavors and a precise, mineral-driven character.'
  ];

  const finishes = [
    'Clean, refreshing finish with lingering citrus and mineral notes',
    'Crisp, vibrant finish with bright acidity and fruit purity',
    'Refreshing finish with zesty citrus and subtle saline character',
    'Elegant, persistent finish with fine mineral complexity'
  ];

  return {
    description: `${brandName} produces this elegant ${style.toLowerCase()} from ${region}. Vibrant and expressive, it showcases pure fruit character and terroir-driven minerality, perfect for diverse food pairings.`,
    tastingNotes: {
      aroma: aromas[Math.floor(Math.random() * aromas.length)],
      palate: palates[Math.floor(Math.random() * palates.length)],
      finish: finishes[Math.floor(Math.random() * finishes.length)]
    },
    foodPairings: [
      'Fresh oysters with mignonette',
      'Grilled sea bass with lemon and herbs',
      'Goat cheese and arugula salad',
      'Sushi and sashimi platter',
      'Roasted chicken with herbs de Provence',
      'Creamy pasta with asparagus'
    ],
    servingInfo: {
      temperature: '45-50°F (7-10°C)',
      glassware: 'White wine glass or universal stemware'
    },
    wineDetails: {
      region,
      grapeVariety,
      vintage: null,
      style,
      ageability: 'Best enjoyed within 2-3 years for optimal freshness'
    }
  };
}

function generateRoseWineEnrichment(
  name: string,
  brand: string | null,
  lowerName: string,
  lowerBrand: string
): EnrichmentData {
  const brandName = brand || 'This estate';

  let region = 'Unknown Region';
  let grapeVariety = 'Rosé Blend';

  if (lowerName.includes('provence') || lowerBrand.includes('provence')) {
    region = 'Provence, France';
    grapeVariety = 'Grenache, Cinsault, Syrah';
  } else if (lowerName.includes('spain')) {
    region = 'Spain';
    grapeVariety = 'Tempranillo, Garnacha';
  } else if (lowerName.includes('pinot noir')) {
    grapeVariety = 'Pinot Noir';
    region = 'California or Oregon';
  }

  return {
    description: `${brandName} crafts this delightful dry rosé from ${region}. Light and refreshing, it offers bright red fruit flavors and crisp acidity, making it the perfect wine for warm weather and casual gatherings.`,
    tastingNotes: {
      aroma: 'Fresh strawberry, watermelon, rose petals, citrus zest',
      palate: 'Light-bodied and refreshing with vibrant red berry flavors, crisp acidity, and a clean, dry character.',
      finish: 'Crisp, refreshing finish with lingering red fruit and mineral notes'
    },
    foodPairings: [
      'Mediterranean mezze platter',
      'Grilled salmon with herbs',
      'Caprese salad with heirloom tomatoes',
      'Prosciutto and melon',
      'Herb-roasted chicken',
      'Fresh fruit and soft cheeses'
    ],
    servingInfo: {
      temperature: '45-50°F (7-10°C)',
      glassware: 'White wine glass or rosé-specific stemware'
    },
    wineDetails: {
      region,
      grapeVariety,
      vintage: null,
      style: 'Dry rosé wine',
      ageability: 'Best enjoyed young and fresh, within 1-2 years'
    }
  };
}

function generateSparklingWineEnrichment(
  name: string,
  brand: string | null,
  lowerName: string,
  lowerBrand: string
): EnrichmentData {
  const brandName = brand || 'This house';

  let region = 'Unknown Region';
  let grapeVariety = 'Sparkling Blend';
  let style = 'Sparkling wine';

  if (lowerName.includes('champagne')) {
    region = 'Champagne, France';
    grapeVariety = 'Chardonnay, Pinot Noir, Pinot Meunier';
    style = 'Champagne';
  } else if (lowerName.includes('prosecco')) {
    region = 'Veneto, Italy';
    grapeVariety = 'Glera';
    style = 'Prosecco';
  } else if (lowerName.includes('cava')) {
    region = 'Catalonia, Spain';
    grapeVariety = 'Macabeo, Xarel·lo, Parellada';
    style = 'Cava';
  }

  return {
    description: `${brandName} produces this elegant ${style.toLowerCase()} from ${region}. Refined and celebratory, it offers fine bubbles, bright acidity, and complex flavors perfect for special occasions or as a sophisticated aperitif.`,
    tastingNotes: {
      aroma: 'Green apple, brioche, citrus, white flowers, toasted almonds',
      palate: 'Light to medium-bodied with fine, persistent bubbles, crisp acidity, and flavors of citrus, apple, and subtle yeast complexity.',
      finish: 'Clean, refreshing finish with elegant effervescence and lasting fruit character'
    },
    foodPairings: [
      'Fresh oysters and shellfish',
      'Smoked salmon canapés',
      'Fried calamari with aioli',
      'Aged Comté or Gruyère cheese',
      'Chicken liver pâté',
      'Strawberries and cream'
    ],
    servingInfo: {
      temperature: '42-47°F (6-8°C)',
      glassware: 'Champagne flute or tulip glass'
    },
    wineDetails: {
      region,
      grapeVariety,
      vintage: null,
      style,
      ageability: 'Enjoy upon release, vintage bottlings can age 5-10 years'
    }
  };
}

function generateGenericWineEnrichment(
  name: string,
  brand: string | null
): EnrichmentData {
  const brandName = brand || 'This producer';

  return {
    description: `${brandName} creates this approachable wine offering balance and character. Versatile and food-friendly, it's perfect for everyday enjoyment and casual gatherings.`,
    tastingNotes: {
      aroma: 'Mixed red and dark fruits, subtle spice, earthy notes',
      palate: 'Medium-bodied with balanced acidity and tannins, offering pleasant fruit flavors and smooth texture.',
      finish: 'Smooth, balanced finish with gentle fruit and spice notes'
    },
    foodPairings: [
      'Grilled meats and vegetables',
      'Pasta with tomato sauce',
      'Pizza with various toppings',
      'Charcuterie and cheese board',
      'Roasted chicken or pork',
      'Casual dining favorites'
    ],
    servingInfo: {
      temperature: '55-60°F (13-16°C)',
      glassware: 'Universal wine glass'
    },
    wineDetails: {
      region: 'Unknown Region',
      grapeVariety: 'Blend',
      vintage: null,
      style: 'Table wine',
      ageability: 'Enjoy within 2-3 years'
    }
  };
}

async function enrichTestProducts() {
  console.log('🍷 Starting Product Enrichment - Test Run (10 products)\n');
  console.log('='.repeat(60));

  try {
    // 1. Fetch 10 products without descriptions
    const products = await prisma.product.findMany({
      where: { description: null },
      include: { skus: { take: 1 } },
      take: 10,
    });

    console.log(`\n✅ Found ${products.length} products to enrich\n`);

    if (products.length === 0) {
      console.log('ℹ️  No products need enrichment. All products already have descriptions!');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    // 2. For each product, generate and save enrichment
    for (const product of products) {
      try {
        const sku = product.skus[0];

        console.log(`\n📝 Enriching: ${product.name}`);
        console.log(`   Brand: ${product.brand || 'N/A'}`);
        console.log(`   Category: ${product.category || 'N/A'}`);

        // Generate enrichment based on product name, brand, category
        const enrichmentData = generateEnrichment(
          product.name,
          product.brand,
          product.category,
          sku
        );

        // Save to database
        await prisma.product.update({
          where: { id: product.id },
          data: {
            description: enrichmentData.description,
            tastingNotes: enrichmentData.tastingNotes,
            foodPairings: enrichmentData.foodPairings,
            servingInfo: enrichmentData.servingInfo,
            wineDetails: enrichmentData.wineDetails,
            enrichedAt: new Date(),
            enrichedBy: 'claude-code',
          },
        });

        console.log(`   ✅ SUCCESS`);
        console.log(`   📋 Preview: ${enrichmentData.description.substring(0, 100)}...`);
        console.log(`   🍇 Region: ${enrichmentData.wineDetails.region}`);
        console.log(`   🌡️  Serving: ${enrichmentData.servingInfo.temperature}`);

        successCount++;
      } catch (error) {
        console.error(`   ❌ ERROR enriching ${product.name}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 ENRICHMENT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully enriched: ${successCount} products`);
    console.log(`❌ Errors: ${errorCount} products`);
    console.log(`📈 Success rate: ${((successCount / products.length) * 100).toFixed(1)}%`);
    console.log('\n🎉 Test enrichment complete!');
    console.log('\nNext steps:');
    console.log('  1. Review enriched products in database');
    console.log('  2. If satisfied, run full enrichment on all 1,285 products');
    console.log('  3. Test product display on frontend\n');

  } catch (error) {
    console.error('\n❌ Fatal error during enrichment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the enrichment
enrichTestProducts()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
