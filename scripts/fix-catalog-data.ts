import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCatalogData() {
  try {
    const tenantId = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

    console.log('🚀 Starting catalog data fix...\n');

    // Step 1: Extract and populate brand names from product names
    console.log('📝 Step 1: Populating brand names...');

    const products = await prisma.product.findMany({
      where: {
        tenantId,
        brand: null
      },
      select: {
        id: true,
        name: true
      }
    });

    console.log(`Found ${products.length} products without brands`);

    let updatedBrands = 0;
    for (const product of products) {
      // Extract brand from product name
      // Common patterns:
      // - "Brand Name Product 2023" -> "Brand Name"
      // - "Domaine Des Sanzay Saumur Les Bazilles" -> "Domaine Des Sanzay"

      const name = product.name;
      let brand = 'Various Producers'; // Default fallback

      // Try to extract first 2-3 words as brand
      const words = name.split(' ');

      if (name.toLowerCase().startsWith('domaine ')) {
        // Handle "Domaine X" pattern - take first 3 words
        brand = words.slice(0, 3).join(' ');
      } else if (words.length >= 2) {
        // Take first 2 words as brand
        brand = words.slice(0, 2).join(' ');
      } else {
        brand = words[0] || 'Various Producers';
      }

      // Clean up common suffixes
      brand = brand
        .replace(/\s+\d{4}$/, '') // Remove year
        .replace(/\s+Partial cs!$/, '')
        .replace(/\s+6pk!$/, '')
        .trim();

      await prisma.product.update({
        where: { id: product.id },
        data: { brand }
      });

      updatedBrands++;

      if (updatedBrands % 100 === 0) {
        console.log(`  Updated ${updatedBrands}/${products.length} products...`);
      }
    }

    console.log(`✅ Updated ${updatedBrands} product brands\n`);

    // Step 2: Create inventory records for SKUs without inventory
    console.log('📦 Step 2: Creating inventory records...');

    const skusWithoutInventory = await prisma.sku.findMany({
      where: {
        tenantId,
        isActive: true,
        inventories: {
          none: {}
        }
      },
      select: {
        id: true,
        code: true
      }
    });

    console.log(`Found ${skusWithoutInventory.length} SKUs without inventory`);

    let createdInventory = 0;
    for (const sku of skusWithoutInventory) {
      await prisma.inventory.create({
        data: {
          tenantId,
          skuId: sku.id,
          location: 'main',
          onHand: 10, // Default starter quantity
          allocated: 0,
          status: 'AVAILABLE'
        }
      });

      createdInventory++;

      if (createdInventory % 100 === 0) {
        console.log(`  Created ${createdInventory}/${skusWithoutInventory.length} inventory records...`);
      }
    }

    console.log(`✅ Created ${createdInventory} inventory records\n`);

    // Step 3: Verification
    console.log('✅ Step 3: Verification...');

    const totalProducts = await prisma.product.count({ where: { tenantId } });
    const productsWithBrand = await prisma.product.count({
      where: { tenantId, brand: { not: null } }
    });

    const totalSkus = await prisma.sku.count({
      where: { tenantId, isActive: true }
    });
    const skusWithInventory = await prisma.sku.count({
      where: {
        tenantId,
        isActive: true,
        inventories: { some: {} }
      }
    });

    console.log('📊 Final Status:');
    console.log(`  Products with brands: ${productsWithBrand}/${totalProducts} (${Math.round(productsWithBrand/totalProducts*100)}%)`);
    console.log(`  SKUs with inventory: ${skusWithInventory}/${totalSkus} (${Math.round(skusWithInventory/totalSkus*100)}%)`);

    console.log('\n🎉 Catalog data fix complete!');
    console.log('🌐 Refresh your catalog page to see the changes.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCatalogData();
