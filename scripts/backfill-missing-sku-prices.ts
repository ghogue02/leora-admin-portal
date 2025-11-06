/**
 * Backfill Missing SKU Price Lists
 *
 * Problem: 213 SKUs have zero price list entries, blocking order creation
 * Solution: Create default GLOBAL price list entries for testing
 * MARKS: All backfilled SKUs are marked with "[DEFAULT PRICE - Needs Review]"
 *
 * Run: npx tsx scripts/backfill-missing-sku-prices.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Starting SKU Price List Backfill...\n');

  // Get Well Crafted tenant ID
  const tenant = await prisma.tenant.findFirst({
    where: { name: { contains: 'Well Crafted', mode: 'insensitive' } }
  });

  if (!tenant) {
    console.error('❌ Could not find Well Crafted tenant');
    process.exit(1);
  }

  console.log(`✅ Found tenant: ${tenant.name} (${tenant.id})\n`);

  // Find or create GLOBAL price list
  let globalPriceList = await prisma.priceList.findFirst({
    where: {
      tenantId: tenant.id,
      jurisdictionType: 'GLOBAL',
      isDefault: true,
    }
  });

  if (!globalPriceList) {
    console.log('📝 Creating GLOBAL default price list...');
    globalPriceList = await prisma.priceList.create({
      data: {
        tenantId: tenant.id,
        name: 'Global Default Pricing (Testing)',
        jurisdictionType: 'GLOBAL',
        isDefault: true,
        effectiveAt: new Date(),
      }
    });
    console.log(`✅ Created GLOBAL price list: ${globalPriceList.id}\n`);
  } else {
    console.log(`✅ Using existing GLOBAL price list: ${globalPriceList.id}\n`);
  }

  // Find all active SKUs for Well Crafted
  console.log('🔍 Finding active SKUs...');
  const allSkus = await prisma.sku.findMany({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
    include: {
      priceListItems: true,
    }
  });

  console.log(`✅ Found ${allSkus.length} active SKUs\n`);

  // Find SKUs with no price list entries
  const skusWithoutPrices = allSkus.filter(sku => sku.priceListItems.length === 0);

  console.log(`🎯 Found ${skusWithoutPrices.length} SKUs without price list entries\n`);

  if (skusWithoutPrices.length === 0) {
    console.log('✅ All SKUs already have price list entries!');
    return;
  }

  // Show first 10 examples
  console.log('📋 Examples of SKUs needing backfill:');
  skusWithoutPrices.slice(0, 10).forEach((sku, i) => {
    console.log(`   ${i + 1}. ${sku.code} - "${sku.description || sku.name}"`);
  });
  if (skusWithoutPrices.length > 10) {
    console.log(`   ... and ${skusWithoutPrices.length - 10} more\n`);
  } else {
    console.log();
  }

  // Get sample SKU to determine default price
  const sampleSkuWithPrice = allSkus.find(sku => sku.priceListItems.length > 0);
  const defaultPrice = sampleSkuWithPrice?.priceListItems[0]?.price || 9.99;

  console.log(`💰 Using default price: $${defaultPrice} per unit\n`);

  console.log(`⚠️  About to create ${skusWithoutPrices.length} price list entries`);
  console.log(`   Price List: ${globalPriceList.name}`);
  console.log(`   Default Price: $${defaultPrice} per unit`);
  console.log(`   Jurisdiction: GLOBAL`);
  console.log(`   ⚠️  All SKUs will be marked "[DEFAULT PRICE - Needs Review]"`);
  console.log();

  // Create price list entries in batches
  console.log('📝 Creating price list entries...');

  const batchSize = 100;
  let created = 0;

  for (let i = 0; i < skusWithoutPrices.length; i += batchSize) {
    const batch = skusWithoutPrices.slice(i, i + batchSize);

    await prisma.priceListItem.createMany({
      data: batch.map(sku => ({
        tenantId: tenant.id,
        priceListId: globalPriceList!.id,
        skuId: sku.id,
        price: defaultPrice,
        minQuantity: 1,
        maxQuantity: null,
      })),
      skipDuplicates: true,
    });

    created += batch.length;
    console.log(`   ✅ Created ${created}/${skusWithoutPrices.length} entries...`);
  }

  // Mark SKUs with default pricing indicator in description
  console.log('\n🏷️  Marking SKU descriptions with default pricing indicator...');

  let marked = 0;
  for (const sku of skusWithoutPrices) {
    const currentDesc = sku.description || sku.name || '';
    if (!currentDesc.includes('[DEFAULT PRICE]')) {
      await prisma.sku.update({
        where: { id: sku.id },
        data: {
          description: `${currentDesc} [DEFAULT PRICE - Needs Review]`.trim(),
        }
      });
      marked++;
    }
  }

  console.log(`   ✅ Marked ${marked} SKU descriptions`);

  // Export list of backfilled SKUs for reference
  console.log('\n📝 Creating reference file with backfilled SKUs...');
  const fs = await import('fs');
  const backfilledList = skusWithoutPrices.map(sku => ({
    code: sku.code,
    name: sku.name,
    description: sku.description,
    defaultPrice: defaultPrice.toString(),
  }));

  fs.writeFileSync(
    'backfilled-skus.json',
    JSON.stringify(backfilledList, null, 2)
  );
  console.log(`   ✅ Created backfilled-skus.json (${backfilledList.length} SKUs)`);

  console.log();
  console.log('✅ Backfill complete!');
  console.log();
  console.log('📊 Summary:');
  console.log(`   Total SKUs: ${allSkus.length}`);
  console.log(`   SKUs with prices before: ${allSkus.length - skusWithoutPrices.length}`);
  console.log(`   SKUs backfilled: ${skusWithoutPrices.length}`);
  console.log(`   SKUs with prices after: ${allSkus.length}`);
  console.log(`   Default price used: $${defaultPrice}`);
  console.log();
  console.log('⚠️  IMPORTANT:');
  console.log('   All backfilled SKUs are marked "[DEFAULT PRICE - Needs Review]"');
  console.log('   Users will see this indicator in product listings');
  console.log('   Reference file: backfilled-skus.json');
  console.log();
  console.log('🎉 All SKUs now have price list entries!');
  console.log();
  console.log('Next Steps:');
  console.log('1. Refresh your browser');
  console.log('2. Go to /sales/orders/new');
  console.log('3. Click "Add Products"');
  console.log('4. Verify products show prices');
  console.log('5. Notice "[DEFAULT PRICE - Needs Review]" in descriptions');
  console.log('6. Continue testing!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
