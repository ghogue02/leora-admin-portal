import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function investigateProducts() {
  console.log("=== INVESTIGATING PRODUCT TABLE ===\n");

  // 1. Count total products
  const totalProducts = await prisma.product.count();
  console.log(`📊 Total Products: ${totalProducts}\n`);

  // 2. Count products with enrichment data
  const enrichedCount = await prisma.product.count({
    where: {
      tastingNotes: { not: null }
    }
  });
  console.log(`🍷 Products with Tasting Notes: ${enrichedCount}\n`);

  // 3. Get sample products with enrichment
  console.log("=== SAMPLE PRODUCTS WITH ENRICHMENT ===\n");
  const enrichedProducts = await prisma.product.findMany({
    where: {
      tastingNotes: { not: null }
    },
    select: {
      id: true,
      name: true,
      brand: true,
      tastingNotes: true,
      enrichedAt: true,
      enrichedBy: true,
    },
    take: 5
  });

  enrichedProducts.forEach((product, index) => {
    console.log(`\n--- Product ${index + 1}: ${product.name} ---`);
    console.log(`Brand: ${product.brand}`);
    console.log(`ID: ${product.id}`);
    console.log(`Enriched: ${product.enrichedAt?.toISOString() || 'N/A'}`);
    console.log(`Enriched By: ${product.enrichedBy || 'N/A'}`);
    if (product.tastingNotes) {
      const notes = product.tastingNotes as any;
      console.log(`Aroma: ${notes.aroma?.substring(0, 60)}...`);
      console.log(`Palate: ${notes.palate?.substring(0, 60)}...`);
    }
  });

  // 4. Check SKU to Product mapping
  console.log("\n\n=== SKU TO PRODUCT MAPPING ===\n");
  const skuProductMapping = await prisma.sku.findMany({
    select: {
      id: true,
      code: true,
      productId: true,
      product: {
        select: {
          name: true,
          tastingNotes: true,
        }
      }
    },
    take: 10
  });

  console.log(`Total SKUs checked: ${skuProductMapping.length}\n`);

  const skuProductIds = new Set(skuProductMapping.map(s => s.productId));
  console.log(`Unique Products referenced: ${skuProductIds.size}\n`);

  skuProductMapping.forEach((sku, index) => {
    const hasNotes = sku.product.tastingNotes ? '✅' : '❌';
    console.log(`${index + 1}. ${sku.code} → ${sku.product.name} ${hasNotes}`);
  });

  // 5. Find duplicate product references
  console.log("\n\n=== CHECKING FOR DUPLICATE PRODUCT USAGE ===\n");
  const productUsage = await prisma.sku.groupBy({
    by: ['productId'],
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 10
  });

  for (const usage of productUsage) {
    const product = await prisma.product.findUnique({
      where: { id: usage.productId },
      select: { name: true, tastingNotes: true }
    });
    const hasNotes = product?.tastingNotes ? '✅' : '❌';
    console.log(`${product?.name}: ${usage._count.id} SKUs ${hasNotes}`);
  }

  await prisma.$disconnect();
}

investigateProducts().catch(console.error);
