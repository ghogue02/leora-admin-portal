/**
 * LOVABLE MIGRATION - Sample Data Seeder
 *
 * Creates sample data for testing the migration
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tenant' },
    update: {},
    create: {
      slug: 'demo-tenant',
      name: 'Demo Wine Company',
      timezone: 'America/New_York',
    },
  });
  console.log('✅ Created tenant:', tenant.name);

  // 2. Create Sales Rep User
  const hashedPassword = await bcrypt.hash('password123', 10);
  const salesUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'rep@demo.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'rep@demo.com',
      fullName: 'John Sales',
      hashedPassword,
      isActive: true,
    },
  });
  console.log('✅ Created sales user:', salesUser.email);

  // 3. Create Sales Rep Profile
  const salesRep = await prisma.salesRep.upsert({
    where: { userId: salesUser.id },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: salesUser.id,
      territoryName: 'Northeast Region',
      deliveryDay: 'Tuesday',
      weeklyRevenueQuota: 50000,
      monthlyRevenueQuota: 200000,
      quarterlyRevenueQuota: 600000,
      annualRevenueQuota: 2400000,
      isActive: true,
    },
  });
  console.log('✅ Created sales rep:', salesRep.territoryName);

  // 4. Create Sample Products
  const products = [
    { name: 'Cabernet Sauvignon Reserve', brand: 'Napa Valley Estates', category: 'Red Wine' },
    { name: 'Chardonnay', brand: 'Sonoma Vineyards', category: 'White Wine' },
    { name: 'Pinot Noir', brand: 'Oregon Hills', category: 'Red Wine' },
    { name: 'Sauvignon Blanc', brand: 'Sonoma Vineyards', category: 'White Wine' },
    { name: 'Merlot', brand: 'Napa Valley Estates', category: 'Red Wine' },
  ];

  for (const prod of products) {
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: prod.name,
        brand: prod.brand,
        category: prod.category,
        description: `Premium ${prod.name} from ${prod.brand}`,
        isSampleOnly: false,
      },
    });

    // Create SKU for each product
    const sku = await prisma.sku.create({
      data: {
        tenantId: tenant.id,
        productId: product.id,
        code: `SKU-${product.id.slice(0, 8)}`,
        size: '750ml',
        unitOfMeasure: 'bottle',
        abv: 13.5,
        pricePerUnit: 24.99,
        isActive: true,
      },
    });

    // Create Inventory
    await prisma.inventory.create({
      data: {
        tenantId: tenant.id,
        skuId: sku.id,
        location: 'Main Warehouse',
        onHand: Math.floor(Math.random() * 1000) + 100,
        allocated: Math.floor(Math.random() * 50),
      },
    });

    console.log(`✅ Created product: ${prod.name} with SKU and inventory`);
  }

  // 5. Create Sample Customers
  const customers = [
    {
      name: 'The Wine Cellar',
      email: 'orders@winecellar.com',
      riskStatus: 'HEALTHY',
      revenue: 15000,
    },
    {
      name: 'Downtown Bistro',
      email: 'manager@downtownbistro.com',
      riskStatus: 'HEALTHY',
      revenue: 8500,
    },
    {
      name: 'Sunset Restaurant',
      email: 'purchasing@sunsetrest.com',
      riskStatus: 'AT_RISK_CADENCE',
      revenue: 5200,
    },
    {
      name: 'Gourmet Market',
      email: 'buyer@gourmetmarket.com',
      riskStatus: 'DORMANT',
      revenue: 0,
    },
  ];

  for (const cust of customers) {
    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        salesRepId: salesRep.id,
        name: cust.name,
        billingEmail: cust.email,
        accountNumber: `ACC-${Math.floor(Math.random() * 10000)}`,
        phone: '555-' + Math.floor(Math.random() * 9000 + 1000),
        street1: '123 Main St',
        city: 'Boston',
        state: 'MA',
        postalCode: '02101',
        country: 'US',
        riskStatus: cust.riskStatus as any,
        lastOrderDate: cust.revenue > 0 ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : null,
        nextExpectedOrderDate: cust.riskStatus === 'HEALTHY'
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          : null,
        averageOrderIntervalDays: cust.riskStatus === 'HEALTHY' ? 21 : null,
      },
    });

    console.log(`✅ Created customer: ${cust.name}`);

    // Create sample order if revenue > 0
    if (cust.revenue > 0) {
      const order = await prisma.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          status: 'FULFILLED',
          orderedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          fulfilledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          total: cust.revenue,
          currency: 'USD',
        },
      });

      // Create invoice
      await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          orderId: order.id,
          customerId: customer.id,
          invoiceNumber: `INV-${Math.floor(Math.random() * 10000)}`,
          status: 'PAID',
          subtotal: cust.revenue,
          total: cust.revenue,
          issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          dueDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
        },
      });

      console.log(`  ✅ Created order and invoice for ${cust.name}`);
    }
  }

  console.log('🎉 Seeding complete!');
  console.log('\n📧 Login credentials:');
  console.log('  Email: rep@demo.com');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
