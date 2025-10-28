import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function checkUniqueNotes() {
  console.log("=== CHECKING IF TASTING NOTES ARE TRULY UNIQUE ===\n");

  // Get 10 random products with tasting notes
  const products = await prisma.product.findMany({
    where: {
      tastingNotes: { not: null }
    },
    select: {
      id: true,
      name: true,
      brand: true,
      tastingNotes: true,
      _count: {
        select: {
          skus: true
        }
      }
    },
    take: 15
  });

  console.log(`Analyzing ${products.length} products...\n`);

  // Track unique aroma texts
  const aromaMap = new Map<string, string[]>();

  products.forEach((product) => {
    if (product.tastingNotes) {
      const notes = product.tastingNotes as any;
      const aroma = notes.aroma || '';

      if (!aromaMap.has(aroma)) {
        aromaMap.set(aroma, []);
      }
      aromaMap.get(aroma)!.push(product.name);
    }
  });

  console.log(`=== UNIQUENESS ANALYSIS ===`);
  console.log(`Total products checked: ${products.length}`);
  console.log(`Unique aroma descriptions: ${aromaMap.size}\n`);

  if (aromaMap.size < products.length) {
    console.log(`⚠️  FOUND DUPLICATES!\n`);

    aromaMap.forEach((productNames, aroma) => {
      if (productNames.length > 1) {
        console.log(`\n🔴 DUPLICATE AROMA (used ${productNames.length} times):`);
        console.log(`"${aroma.substring(0, 80)}..."\n`);
        console.log(`Products sharing this aroma:`);
        productNames.forEach((name, i) => {
          console.log(`  ${i + 1}. ${name}`);
        });
      }
    });
  } else {
    console.log(`✅ All tasting notes are unique!`);
  }

  // Show 5 examples side by side
  console.log(`\n\n=== SAMPLE TASTING NOTES (First 5) ===\n`);
  products.slice(0, 5).forEach((product, index) => {
    const notes = product.tastingNotes as any;
    console.log(`\n${index + 1}. ${product.name}`);
    console.log(`   SKUs: ${product._count.skus}`);
    console.log(`   Aroma: ${notes.aroma?.substring(0, 70)}...`);
    console.log(`   Palate: ${notes.palate?.substring(0, 70)}...`);
  });

  await prisma.$disconnect();
}

checkUniqueNotes().catch(console.error);
