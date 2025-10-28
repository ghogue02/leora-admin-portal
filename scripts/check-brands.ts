import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBrands() {
  try {
    const tenantId = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

    // Count products with and without brands
    const totalProducts = await prisma.product.count({
      where: { tenantId }
    });

    const productsWithBrand = await prisma.product.count({
      where: {
        tenantId,
        brand: { not: null }
      }
    });

    const productsWithoutBrand = totalProducts - productsWithBrand;

    console.log('\n📊 Brand Analysis:');
    console.log(`Total products: ${totalProducts}`);
    console.log(`Products with brand: ${productsWithBrand}`);
    console.log(`Products without brand: ${productsWithoutBrand}`);

    // Get sample products
    const sampleProducts = await prisma.product.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
      },
      take: 10
    });

    console.log('\n📦 Sample Products:');
    sampleProducts.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Brand: ${p.brand || '❌ NULL'}`);
      console.log(`   Category: ${p.category || 'N/A'}`);
    });

    // Check inventory status
    const totalSkus = await prisma.sku.count({
      where: { tenantId, isActive: true }
    });

    const skusWithInventory = await prisma.sku.count({
      where: {
        tenantId,
        isActive: true,
        inventories: {
          some: {}
        }
      }
    });

    console.log('\n📦 Inventory Analysis:');
    console.log(`Total active SKUs: ${totalSkus}`);
    console.log(`SKUs with inventory: ${skusWithInventory}`);
    console.log(`SKUs without inventory: ${totalSkus - skusWithInventory}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrands();
