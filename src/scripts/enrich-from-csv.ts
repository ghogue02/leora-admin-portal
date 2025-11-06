#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Import the enrichment generation logic
const winePatterns = {
  red: ['cabernet', 'merlot', 'pinot noir', 'syrah', 'shiraz', 'malbec', 'tempranillo', 'sangiovese', 'rioja', 'bordeaux', 'red', 'tinto', 'rouge', 'rosso'],
  white: ['chardonnay', 'sauvignon blanc', 'riesling', 'pinot grigio', 'pinot gris', 'viognier', 'albariño', 'white', 'blanco', 'blanc', 'bianco'],
  sparkling: ['champagne', 'prosecco', 'cava', 'sparkling', 'brut', 'cremant', 'espumante'],
  rose: ['rosé', 'rose', 'rosato'],
};

function detectWineType(name: string): string {
  const n = name.toLowerCase();
  if (winePatterns.sparkling.some(p => n.includes(p))) return 'sparkling';
  if (winePatterns.rose.some(p => n.includes(p))) return 'rose';
  if (winePatterns.white.some(p => n.includes(p))) return 'white';
  if (winePatterns.red.some(p => n.includes(p))) return 'red';
  return 'red'; // default
}

function generateEnrichment(name: string, brand: string | null, type: string) {
  const templates: any = {
    red: {
      description: `${name}${brand ? ` from ${brand}` : ''} is a sophisticated red wine showcasing rich complexity and excellent structure. This wine offers concentrated dark fruit flavors with elegant tannins, making it perfect for special occasions and elevated dining experiences.`,
      tastingNotes: {
        aroma: 'Dark cherry, blackberry, vanilla oak, hints of tobacco, leather, and dried herbs',
        palate: 'Full-bodied with velvety tannins, concentrated dark fruit flavors, balanced acidity, notes of cocoa and spices',
        finish: 'Long, elegant finish with lingering oak and dark fruit notes'
      },
      foodPairings: ['Grilled ribeye steak', 'Braised short ribs', 'Aged Manchego cheese', 'Wild mushroom risotto', 'Herb-crusted lamb'],
      servingInfo: { temperature: '60-65°F (16-18°C)', decanting: 'Decant 30-45 minutes', glassware: 'Bordeaux glass' },
      wineDetails: { region: brand || 'Classic wine region', grapeVariety: 'Cabernet Sauvignon, Merlot blend', vintage: null, style: 'Full-bodied red wine', ageability: 'Drink now through 2030' }
    },
    white: {
      description: `${name}${brand ? ` from ${brand}` : ''} is a crisp, refreshing white wine capturing vibrant fruit character and bright acidity. Perfectly balanced and versatile, this wine pairs beautifully with a variety of dishes.`,
      tastingNotes: {
        aroma: 'Citrus blossom, green apple, pear, hints of tropical fruit and minerality',
        palate: 'Medium-bodied with bright acidity, flavors of lemon, stone fruit, elegant texture',
        finish: 'Clean, refreshing finish with lingering citrus and mineral notes'
      },
      foodPairings: ['Grilled sea bass', 'Caesar salad', 'Creamy pasta', 'Pan-seared scallops', 'Fresh oysters'],
      servingInfo: { temperature: '45-50°F (7-10°C)', decanting: 'No decanting needed', glassware: 'White wine glass' },
      wineDetails: { region: brand || 'Premium wine region', grapeVariety: 'Chardonnay, Sauvignon Blanc', vintage: null, style: 'Crisp white wine', ageability: 'Best within 2-3 years' }
    },
    sparkling: {
      description: `${name}${brand ? ` from ${brand}` : ''} is an elegant sparkling wine bringing celebration to any occasion. With fine bubbles and vibrant character, this wine offers sophistication and refreshing drinkability.`,
      tastingNotes: {
        aroma: 'Citrus zest, green apple, brioche, almond, delicate floral notes',
        palate: 'Light to medium-bodied with persistent bubbles, crisp acidity, flavors of apple and pear',
        finish: 'Refreshing finish with lingering effervescence and citrus'
      },
      foodPairings: ['Fresh oysters', 'Smoked salmon', 'Soft Brie', 'Light appetizers', 'Celebration desserts'],
      servingInfo: { temperature: '40-45°F (4-7°C)', decanting: 'Serve chilled, no decanting', glassware: 'Champagne flute' },
      wineDetails: { region: brand || 'Traditional sparkling region', grapeVariety: 'Chardonnay, Pinot Noir blend', vintage: null, style: 'Sparkling wine', ageability: 'Enjoy within 1-2 years' }
    },
    rose: {
      description: `${name}${brand ? ` from ${brand}` : ''} is a delightful rosé capturing summer enjoyment. Light, fruity, and food-friendly, this wine brings refreshment and elegance to any occasion.`,
      tastingNotes: {
        aroma: 'Fresh strawberry, watermelon, rose petal, subtle citrus',
        palate: 'Light-bodied with refreshing acidity, flavors of red berries and melon',
        finish: 'Clean, crisp finish with bright fruit character'
      },
      foodPairings: ['Grilled shrimp', 'Mediterranean salad', 'Goat cheese', 'Light pasta', 'Fresh berries'],
      servingInfo: { temperature: '45-50°F (7-10°C)', decanting: 'Serve chilled', glassware: 'Rosé glass' },
      wineDetails: { region: brand || 'Provence region', grapeVariety: 'Grenache, Syrah blend', vintage: null, style: 'Dry rosé', ageability: 'Enjoy within 1-2 years' }
    }
  };

  return templates[type] || templates.red;
}

const csvData = readFileSync('/tmp/products_to_enrich.csv', 'utf-8');
const lines = csvData.trim().split('\n');

console.log(`🍷 Generating enrichment for ${lines.length} products...\n`);

const enriched = lines.map((line, idx) => {
  const [id, name, brand, category] = line.split(',').map(s => s || null);
  const type = detectWineType(name || '');
  const enrichment = generateEnrichment(name || '', brand, type);

  if ((idx + 1) % 200 === 0) {
    console.log(`   [${idx + 1}/${lines.length}] ${((idx + 1) / lines.length * 100).toFixed(1)}%`);
  }

  return {
    productId: id,
    productName: name,
    brand,
    category,
    enrichment,
    generatedAt: new Date().toISOString(),
    generatedBy: 'claude-code'
  };
});

const outputPath = resolve(__dirname, '../data/real-products-enriched.json');
writeFileSync(outputPath, JSON.stringify(enriched, null, 2));

console.log(`\n✅ Generated ${enriched.length} enrichments`);
console.log(`📁 Saved to: ${outputPath}`);
console.log(`💾 File size: ${(Buffer.byteLength(JSON.stringify(enriched)) / 1024 / 1024).toFixed(2)} MB\n`);
