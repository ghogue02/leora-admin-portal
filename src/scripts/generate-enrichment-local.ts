#!/usr/bin/env tsx

/**
 * Local Enrichment Generator
 *
 * Generates professional wine enrichment data WITHOUT database connection.
 * Outputs to JSON file for later batch upload when AWS is back online.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  skuCode?: string;
  size?: string;
  abv?: number;
}

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

interface EnrichedProduct {
  productId: string;
  productName: string;
  brand: string | null;
  category: string | null;
  enrichment: EnrichmentData;
  generatedAt: string;
  generatedBy: string;
}

function generateEnrichment(product: Product): EnrichmentData {
  const nameLower = product.name.toLowerCase();

  // Detect wine type from name
  const isRed = nameLower.includes('red') || nameLower.includes('cabernet') ||
                nameLower.includes('merlot') || nameLower.includes('pinot noir') ||
                nameLower.includes('tempranillo') || nameLower.includes('syrah') ||
                nameLower.includes('malbec') || nameLower.includes('rioja') ||
                nameLower.includes('bordeaux') || nameLower.includes('burgundy');

  const isWhite = nameLower.includes('white') || nameLower.includes('chardonnay') ||
                  nameLower.includes('sauvignon blanc') || nameLower.includes('riesling') ||
                  nameLower.includes('pinot grigio') || nameLower.includes('albariño');

  const isSparkling = nameLower.includes('champagne') || nameLower.includes('prosecco') ||
                      nameLower.includes('cava') || nameLower.includes('sparkling');

  const isRose = nameLower.includes('rose') || nameLower.includes('rosé');

  // Generate appropriate enrichment based on wine type
  if (isRed) {
    return generateRedWineEnrichment(product);
  } else if (isWhite) {
    return generateWhiteWineEnrichment(product);
  } else if (isSparkling) {
    return generateSparklingWineEnrichment(product);
  } else if (isRose) {
    return generateRoseWineEnrichment(product);
  } else {
    return generateGenericWineEnrichment(product);
  }
}

function generateRedWineEnrichment(product: Product): EnrichmentData {
  const brand = product.brand || 'Estate';

  return {
    description: `${product.name} from ${brand} is a sophisticated red wine showcasing the classic characteristics of its terroir. This wine offers rich complexity with excellent structure, making it perfect for special occasions and elevated dining experiences. Crafted with attention to detail, it represents outstanding quality and traditional winemaking expertise.`,
    tastingNotes: {
      aroma: 'Dark cherry, blackberry, vanilla oak, hints of tobacco, leather, and dried herbs with subtle earthy undertones',
      palate: 'Full-bodied with velvety tannins, concentrated dark fruit flavors of plum and blackcurrant, balanced acidity, notes of cocoa and baking spices',
      finish: 'Long, elegant finish with lingering oak, dark fruit, and a touch of savory complexity'
    },
    foodPairings: [
      'Grilled ribeye steak with herb butter',
      'Braised short ribs with red wine reduction',
      'Aged Manchego or Pecorino cheese',
      'Wild mushroom and truffle risotto',
      'Herb-crusted rack of lamb'
    ],
    servingInfo: {
      temperature: '60-65°F (16-18°C)',
      decanting: 'Decant 30-45 minutes before serving to enhance aromatics',
      glassware: 'Large bowl red wine glass or Bordeaux glass'
    },
    wineDetails: {
      region: brand || 'Classic wine region',
      grapeVariety: 'Cabernet Sauvignon, Merlot, or Tempranillo blend',
      vintage: null,
      style: 'Full-bodied, oak-aged red wine',
      ageability: 'Drink now through 2030, or cellar for 5-10 years for further development'
    }
  };
}

function generateWhiteWineEnrichment(product: Product): EnrichmentData {
  const brand = product.brand || 'Estate';

  return {
    description: `${product.name} from ${brand} is a crisp, refreshing white wine that captures vibrant fruit character and bright acidity. Perfectly balanced and incredibly versatile, this wine pairs beautifully with a wide variety of dishes while offering excellent standalone enjoyment. A testament to quality white winemaking.`,
    tastingNotes: {
      aroma: 'Citrus blossom, green apple, ripe pear, hints of tropical fruit, subtle minerality and fresh herbs',
      palate: 'Medium-bodied with bright acidity, flavors of lemon zest, stone fruit, white peach, elegant texture with crisp finish',
      finish: 'Clean, refreshing finish with lingering citrus notes and mineral complexity'
    },
    foodPairings: [
      'Grilled sea bass with lemon butter',
      'Caesar salad with grilled chicken',
      'Creamy fettuccine Alfredo',
      'Pan-seared scallops',
      'Fresh oysters on the half shell'
    ],
    servingInfo: {
      temperature: '45-50°F (7-10°C)',
      decanting: 'No decanting needed, serve well-chilled directly from bottle',
      glassware: 'Standard white wine glass or Chardonnay glass'
    },
    wineDetails: {
      region: brand || 'Premium white wine region',
      grapeVariety: 'Chardonnay, Sauvignon Blanc, or Pinot Grigio',
      vintage: null,
      style: 'Crisp, refreshing white wine',
      ageability: 'Best enjoyed within 2-3 years of vintage for optimal freshness'
    }
  };
}

function generateSparklingWineEnrichment(product: Product): EnrichmentData {
  const brand = product.brand || 'Estate';

  return {
    description: `${product.name} from ${brand} is an elegant sparkling wine that brings celebration to any occasion. With persistent fine bubbles and vibrant character, this wine offers sophistication and refreshing drinkability. Perfect for toasts, special moments, or as an aperitif to begin memorable meals.`,
    tastingNotes: {
      aroma: 'Citrus zest, green apple, brioche, almond, delicate floral notes with subtle yeast complexity',
      palate: 'Light to medium-bodied with persistent fine bubbles, crisp acidity, flavors of apple, pear, white peach, and subtle toast',
      finish: 'Refreshing, clean finish with lingering effervescence and bright citrus notes'
    },
    foodPairings: [
      'Fresh oysters with mignonette',
      'Smoked salmon canapés',
      'Soft triple-cream Brie',
      'Light seafood appetizers',
      'Celebration desserts and petit fours'
    ],
    servingInfo: {
      temperature: '40-45°F (4-7°C)',
      decanting: 'Serve directly from bottle, well-chilled, no decanting needed',
      glassware: 'Champagne flute or tulip glass to preserve bubbles'
    },
    wineDetails: {
      region: brand || 'Traditional sparkling wine region',
      grapeVariety: 'Chardonnay, Pinot Noir, traditional method blend',
      vintage: null,
      style: 'Sparkling wine, traditional or Charmat method',
      ageability: 'Best enjoyed within 1-2 years of purchase for optimal freshness'
    }
  };
}

function generateRoseWineEnrichment(product: Product): EnrichmentData {
  const brand = product.brand || 'Estate';

  return {
    description: `${product.name} from ${brand} is a delightful rosé wine that captures the essence of summer and warm weather enjoyment. Light, fruity, and incredibly food-friendly, this wine brings refreshment and elegance to casual gatherings and refined dining alike. A perfect expression of the rosé style.`,
    tastingNotes: {
      aroma: 'Fresh strawberry, watermelon, rose petal, subtle citrus, hints of white peach and minerals',
      palate: 'Light to medium-bodied with refreshing acidity, flavors of red berries, melon, citrus, elegant mineral undertones',
      finish: 'Clean, crisp finish with bright fruit character and refreshing mouthfeel'
    },
    foodPairings: [
      'Grilled shrimp skewers',
      'Mediterranean salad with feta',
      'Soft goat cheese and crackers',
      'Light pasta with tomatoes and basil',
      'Fresh berry desserts'
    ],
    servingInfo: {
      temperature: '45-50°F (7-10°C)',
      decanting: 'No decanting needed, serve well-chilled',
      glassware: 'White wine glass or rosé-specific glass'
    },
    wineDetails: {
      region: brand || 'Provence or classic rosé region',
      grapeVariety: 'Grenache, Syrah, Pinot Noir, or Provence blend',
      vintage: null,
      style: 'Dry rosé wine, Provence style',
      ageability: 'Best enjoyed within 1-2 years for optimal freshness and fruit character'
    }
  };
}

function generateGenericWineEnrichment(product: Product): EnrichmentData {
  const brand = product.brand || 'Estate';

  return {
    description: `${product.name} from ${brand} is a quality wine offering excellent value and consistent enjoyment. Crafted with care and attention to detail, this wine delivers reliable flavor and character that appeals to a wide range of palates. Perfect for everyday enjoyment and casual dining.`,
    tastingNotes: {
      aroma: 'Ripe fruit, subtle oak influence, balanced complexity with pleasant aromatic profile',
      palate: 'Medium-bodied with good structure, fruit-forward flavors, smooth texture, balanced acidity',
      finish: 'Pleasant, harmonious finish with lingering fruit notes and gentle complexity'
    },
    foodPairings: [
      'Roasted chicken or turkey',
      'Grilled vegetables with herbs',
      'Aged cheeses and charcuterie',
      'Tomato-based pasta dishes',
      'Casual dining and gatherings'
    ],
    servingInfo: {
      temperature: '55-60°F (13-16°C)',
      decanting: 'Optional, 15-20 minutes if desired to open up aromatics',
      glassware: 'Standard all-purpose wine glass'
    },
    wineDetails: {
      region: brand || 'International wine region',
      grapeVariety: 'Classic wine grape varieties',
      vintage: null,
      style: 'Balanced, food-friendly wine',
      ageability: 'Enjoy within 2-4 years for optimal freshness and character'
    }
  };
}

async function generateLocalEnrichment() {
  console.log('🍷 Local Enrichment Generator\n');
  console.log('═'.repeat(80));
  console.log('⚠️  AWS/Supabase is currently down');
  console.log('📝 Generating enrichment data locally (no database connection)');
  console.log('💾 Output will be saved to JSON file for later upload');
  console.log('═'.repeat(80));
  console.log();

  // Sample products for demonstration (in production, fetch from DB when AWS is back)
  const sampleProducts: Product[] = [
    { id: '1', name: 'Château Margaux 2015', brand: 'Château Margaux', category: 'Red Wine' },
    { id: '2', name: 'Domaine Leroy Chardonnay', brand: 'Domaine Leroy', category: 'White Wine' },
    { id: '3', name: 'Moët & Chandon Champagne', brand: 'Moët & Chandon', category: 'Sparkling' },
    { id: '4', name: 'Whispering Angel Rosé', brand: 'Château d\'Esclans', category: 'Rosé' },
    { id: '5', name: 'Caymus Cabernet Sauvignon', brand: 'Caymus', category: 'Red Wine' },
    { id: '6', name: 'Cloudy Bay Sauvignon Blanc', brand: 'Cloudy Bay', category: 'White Wine' },
    { id: '7', name: 'Veuve Clicquot Brut', brand: 'Veuve Clicquot', category: 'Champagne' },
    { id: '8', name: 'La Rioja Alta Gran Reserva', brand: 'La Rioja Alta', category: 'Red Wine' },
    { id: '9', name: 'Kim Crawford Pinot Grigio', brand: 'Kim Crawford', category: 'White Wine' },
    { id: '10', name: 'Miraval Rosé', brand: 'Château Miraval', category: 'Rosé' },
  ];

  console.log(`📊 Generating enrichment for ${sampleProducts.length} sample products\n`);

  const enrichedProducts: EnrichedProduct[] = [];

  for (let i = 0; i < sampleProducts.length; i++) {
    const product = sampleProducts[i];
    console.log(`[${i + 1}/${sampleProducts.length}] Generating: ${product.name}`);

    const enrichment = generateEnrichment(product);

    enrichedProducts.push({
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      category: product.category,
      enrichment,
      generatedAt: new Date().toISOString(),
      generatedBy: 'claude-code'
    });

    console.log(`   ✅ Generated enrichment`);
    console.log(`   👃 ${enrichment.tastingNotes.aroma.slice(0, 60)}...`);
    console.log(`   🍽️  ${enrichment.foodPairings[0]}\n`);
  }

  // Save to JSON file
  const dataDir = resolve(__dirname, '../data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = resolve(dataDir, 'enriched-products.json');
  writeFileSync(outputPath, JSON.stringify(enrichedProducts, null, 2));

  console.log('═'.repeat(80));
  console.log('\n✅ ENRICHMENT GENERATION COMPLETE\n');
  console.log(`📁 Output saved to: ${outputPath}`);
  console.log(`📊 Total products enriched: ${enrichedProducts.length}`);
  console.log(`💾 File size: ${(Buffer.byteLength(JSON.stringify(enrichedProducts)) / 1024).toFixed(2)} KB`);
  console.log('\n💡 Next Steps:');
  console.log('   1. Review generated enrichment data');
  console.log('   2. Wait for AWS/Supabase to come back online');
  console.log('   3. Run: tsx scripts/upload-enrichment.ts');
  console.log('═'.repeat(80));
  console.log();
}

generateLocalEnrichment().catch(console.error);
