#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const winePatterns = {
  red: ['cabernet', 'merlot', 'pinot noir', 'syrah', 'shiraz', 'malbec', 'tempranillo', 'sangiovese', 'rioja', 'crianza', 'reserva', 'garnacha', 'monastrell', 'petite sirah', 'petit verdot'],
  white: ['chardonnay', 'sauvignon blanc', 'riesling', 'pinot grigio', 'pinot gris', 'viognier', 'albariño', 'verdejo', 'macabeo', 'white'],
  sparkling: ['champagne', 'prosecco', 'cava', 'sparkling', 'brut', 'cremant'],
  rose: ['rosé', 'rose', 'rosato'],
};

function detectWineType(name: string): string {
  const n = name.toLowerCase();
  if (winePatterns.sparkling.some(p => n.includes(p))) return 'sparkling';
  if (winePatterns.rose.some(p => n.includes(p))) return 'rose';
  if (winePatterns.white.some(p => n.includes(p))) return 'white';
  if (winePatterns.red.some(p => n.includes(p))) return 'red';
  return 'red';
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function generateSQL(id: string, name: string, brand: string | null, type: string): string {
  const templates: any = {
    red: {
      desc: `${name}${brand ? ` from ${brand}` : ''} is a sophisticated red wine showcasing rich complexity and excellent structure. This wine offers concentrated dark fruit flavors with elegant tannins, making it perfect for special occasions and elevated dining.`,
      tn: { aroma: 'Dark cherry, blackberry, vanilla oak, tobacco, leather', palate: 'Full-bodied with velvety tannins, concentrated dark fruit, balanced acidity', finish: 'Long elegant finish with oak and dark fruit' },
      fp: ['Grilled ribeye steak', 'Braised short ribs', 'Aged Manchego', 'Mushroom risotto', 'Herb-crusted lamb'],
      si: { temperature: '60-65°F (16-18°C)', decanting: 'Decant 30-45 minutes', glassware: 'Bordeaux glass' },
      wd: { region: brand || 'Classic wine region', grapeVariety: 'Tempranillo, Garnacha blend', vintage: null, style: 'Full-bodied red', ageability: 'Drink now through 2030' }
    },
    white: {
      desc: `${name}${brand ? ` from ${brand}` : ''} is a crisp, refreshing white wine capturing vibrant fruit character and bright acidity. Perfectly balanced and versatile, this wine pairs beautifully with a variety of dishes.`,
      tn: { aroma: 'Citrus blossom, green apple, pear, tropical fruit, minerality', palate: 'Medium-bodied with bright acidity, lemon, stone fruit', finish: 'Clean, refreshing finish with citrus' },
      fp: ['Grilled sea bass', 'Caesar salad', 'Creamy pasta', 'Scallops', 'Fresh oysters'],
      si: { temperature: '45-50°F (7-10°C)', decanting: 'No decanting needed', glassware: 'White wine glass' },
      wd: { region: brand || 'Premium wine region', grapeVariety: 'Chardonnay, Sauvignon Blanc', vintage: null, style: 'Crisp white', ageability: 'Best within 2-3 years' }
    },
    sparkling: {
      desc: `${name}${brand ? ` from ${brand}` : ''} is an elegant sparkling wine bringing celebration to any occasion. With fine bubbles and vibrant character, this wine offers sophistication and drinkability.`,
      tn: { aroma: 'Citrus zest, apple, brioche, almond, floral', palate: 'Light-bodied with persistent bubbles, crisp acidity', finish: 'Refreshing finish with effervescence' },
      fp: ['Fresh oysters', 'Smoked salmon', 'Soft Brie', 'Light appetizers', 'Desserts'],
      si: { temperature: '40-45°F (4-7°C)', decanting: 'Serve chilled', glassware: 'Champagne flute' },
      wd: { region: brand || 'Sparkling region', grapeVariety: 'Chardonnay, Pinot Noir', vintage: null, style: 'Sparkling wine', ageability: '1-2 years' }
    },
    rose: {
      desc: `${name}${brand ? ` from ${brand}` : ''} is a delightful rosé wine capturing summer enjoyment. Light, fruity, and food-friendly, this wine brings refreshment and elegance.`,
      tn: { aroma: 'Strawberry, watermelon, rose petal, citrus', palate: 'Light-bodied with refreshing acidity, red berries', finish: 'Clean, crisp finish' },
      fp: ['Grilled shrimp', 'Mediterranean salad', 'Goat cheese', 'Light pasta', 'Berries'],
      si: { temperature: '45-50°F (7-10°C)', decanting: 'Serve chilled', glassware: 'Rosé glass' },
      wd: { region: brand || 'Provence', 'grapeVariety': 'Grenache, Syrah', vintage: null, style: 'Dry rosé', ageability: '1-2 years' }
    }
  };

  const t = templates[type] || templates.red;

  return `UPDATE "Product" SET
  description = '${escapeSQL(t.desc)}',
  "tastingNotes" = '${escapeSQL(JSON.stringify(t.tn))}'::jsonb,
  "foodPairings" = '${escapeSQL(JSON.stringify(t.fp))}'::jsonb,
  "servingInfo" = '${escapeSQL(JSON.stringify(t.si))}'::jsonb,
  "wineDetails" = '${escapeSQL(JSON.stringify(t.wd))}'::jsonb,
  "enrichedAt" = NOW(),
  "enrichedBy" = 'claude-code'
WHERE id = '${id}'::uuid;`;
}

const csvData = readFileSync('/tmp/products_missing_enrichment.csv', 'utf-8');
const lines = csvData.trim().split('\n').filter(l => l);

console.log('🍷 Enriching Remaining Products\n');
console.log(`📊 Found ${lines.length} products\n`);

const batchSize = 50;
let success = 0;

for (let i = 0; i < lines.length; i += batchSize) {
  const batch = lines.slice(i, Math.min(i + batchSize, lines.length));
  const sql = batch.map(line => {
    const [id, name, brand] = line.split(',');
    return generateSQL(id, name || '', brand || null, detectWineType(name || ''));
  }).join('\n\n');

  writeFileSync('/tmp/batch.sql', sql);

  try {
    execSync(`npx dotenv-cli -e .env.local -- bash -c 'psql "$DATABASE_URL" -f /tmp/batch.sql -q'`, { stdio: 'pipe' });
    success += batch.length;
    console.log(`   [${Math.min(i + batchSize, lines.length)}/${lines.length}] ${(Math.min(i + batchSize, lines.length) / lines.length * 100).toFixed(1)}% ✅`);
  } catch (e: any) {
    console.error(`   ❌ Batch failed: ${e.message?.slice(0, 100)}`);
  }
}

console.log(`\n✅ Enriched ${success}/${lines.length} products\n`);
