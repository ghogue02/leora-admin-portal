import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function investigateRIO1055() {
  console.log('🔍 Investigating RIO1055 Pricing Issue\n');
  console.log('=====================================\n');

  // Find the SKU
  const sku = await prisma.sku.findFirst({
    where: { code: 'RIO1055' },
    include: {
      product: true,
      priceListItems: {
        include: {
          priceList: true
        }
      }
    }
  });

  if (!sku) {
    console.log('❌ SKU RIO1055 not found in database!');
    await prisma.$disconnect();
    return;
  }

  console.log('✅ Found SKU:');
  console.log('   Code:', sku.code);
  console.log('   Product:', sku.product?.name || 'Unknown');
  console.log('   Active:', sku.isActive);
  console.log('   Tenant ID:', sku.tenantId);
  console.log();

  console.log('📋 Price List Items:');
  console.log('   Count:', sku.priceListItems.length);
  console.log();

  if (sku.priceListItems.length === 0) {
    console.log('❌ NO PRICE LIST ITEMS FOUND!');
    console.log('   This SKU was not backfilled.');
    console.log();
    console.log('🔍 Checking if SKU is inactive or different tenant...');
  } else {
    sku.priceListItems.forEach((item, i) => {
      console.log(`   Item ${i + 1}:`);
      console.log('     Price List:', item.priceList.name);
      console.log('     Jurisdiction:', item.priceList.jurisdictionType);
      console.log('     Price:', `$${item.price}`);
      console.log('     Min Qty:', item.minQuantity);
      console.log('     Max Qty:', item.maxQuantity || 'unlimited');
      console.log('     Is Default:', item.priceList.isDefault);
      console.log('     Effective:', item.priceList.effectiveAt);
      console.log('     Expires:', item.priceList.expiresAt || 'never');
      console.log();
    });
  }

  // Check what the API would return for this SKU
  console.log('🔍 Checking API Response Format:\n');
  const apiSku = await prisma.sku.findFirst({
    where: { code: 'RIO1055' },
    include: {
      product: {
        include: {
          brand: true,
          category: true,
        }
      },
      priceListItems: {
        include: {
          priceList: true,
        },
        where: {
          priceList: {
            effectiveAt: {
              lte: new Date(),
            },
            OR: [
              { expiresAt: null },
              { expiresAt: { gte: new Date() } },
            ],
          },
        },
      },
    },
  });

  console.log('API Would Return:');
  console.log('   Price Lists Count:', apiSku?.priceListItems.length || 0);
  if (apiSku && apiSku.priceListItems.length > 0) {
    console.log('   Available Price Lists:');
    apiSku.priceListItems.forEach(item => {
      console.log(`     - ${item.priceList.name} (${item.priceList.jurisdictionType}): $${item.price}`);
    });
  } else {
    console.log('   ❌ No price lists match API query filters!');
    console.log();
    console.log('Possible reasons:');
    console.log('   1. effectiveAt is in the future');
    console.log('   2. expiresAt is in the past');
    console.log('   3. Price list is not active');
  }

  await prisma.$disconnect();
}

investigateRIO1055();
