/**
 * Generate Test Data for Leora CRM Testing
 *
 * This script creates sample data for testing purposes:
 * - Test customers
 * - Test orders
 * - Test samples
 * - Test activities
 * - Test call plans
 *
 * Usage: npx tsx web/tests/generate-test-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Generating test data for Leora CRM...\n');

  // Test configuration
  const testConfig = {
    customers: 10,
    ordersPerCustomer: 5,
    samplesPerCustomer: 3,
    activitiesPerCustomer: 8,
    callPlans: 2,
  };

  // ========================================
  // 1. Create Test Customers
  // ========================================
  console.log('📋 Creating test customers...');

  const testCustomers = [];
  const testBusinessTypes = ['Restaurant', 'Wine Shop', 'Hotel', 'Country Club', 'Liquor Store'];
  const testLocations = ['Washington DC', 'Alexandria VA', 'Arlington VA', 'Bethesda MD', 'Georgetown DC'];
  const testRiskStatuses = ['ACTIVE', 'TARGET', 'PROSPECT'];

  for (let i = 1; i <= testConfig.customers; i++) {
    const customer = await prisma.customer.upsert({
      where: { accountNumber: `TEST-${i.toString().padStart(4, '0')}` },
      update: {},
      create: {
        accountNumber: `TEST-${i.toString().padStart(4, '0')}`,
        name: `Test Customer ${i}`,
        businessType: testBusinessTypes[Math.floor(Math.random() * testBusinessTypes.length)],
        billingEmail: `testcustomer${i}@example.com`,
        billingPhone: `(555) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        shippingAddress: `${i}00 Test Street`,
        shippingCity: testLocations[Math.floor(Math.random() * testLocations.length)].split(' ')[0],
        shippingState: testLocations[Math.floor(Math.random() * testLocations.length)].split(' ')[1] || 'DC',
        shippingZip: `20${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
        riskStatus: testRiskStatuses[Math.floor(Math.random() * testRiskStatuses.length)] as any,
        averageOrderIntervalDays: 30 + Math.floor(Math.random() * 30),
        createdAt: new Date(),
      },
    });
    testCustomers.push(customer);
  }

  console.log(`✅ Created ${testCustomers.length} test customers\n`);

  // ========================================
  // 2. Create Test Orders
  // ========================================
  console.log('📦 Creating test orders...');

  let totalOrders = 0;

  for (const customer of testCustomers) {
    for (let i = 1; i <= testConfig.ordersPerCustomer; i++) {
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - (i * 30)); // Orders spaced 30 days apart

      await prisma.order.create({
        data: {
          orderNumber: `TEST-ORD-${customer.accountNumber}-${i}`,
          customerId: customer.id,
          orderDate,
          totalAmount: Math.floor(Math.random() * 5000) + 500, // $500-$5500
          status: i === 1 ? 'PENDING' : 'DELIVERED',
          createdAt: orderDate,
        },
      });

      totalOrders++;
    }
  }

  console.log(`✅ Created ${totalOrders} test orders\n`);

  // ========================================
  // 3. Create Test SKUs (for samples)
  // ========================================
  console.log('🍷 Creating test SKUs...');

  const testSkus = [];
  const testProducts = [
    { name: 'Cabernet Sauvignon 2021', category: 'Red Wine', supplier: 'Test Winery A' },
    { name: 'Chardonnay 2022', category: 'White Wine', supplier: 'Test Winery B' },
    { name: 'Pinot Noir 2020', category: 'Red Wine', supplier: 'Test Winery C' },
    { name: 'Sauvignon Blanc 2023', category: 'White Wine', supplier: 'Test Winery D' },
    { name: 'Champagne Brut NV', category: 'Sparkling', supplier: 'Test Winery E' },
  ];

  for (let i = 0; i < testProducts.length; i++) {
    const product = testProducts[i];
    const sku = await prisma.sKU.upsert({
      where: { skuNumber: `TEST-SKU-${i + 1}` },
      update: {},
      create: {
        skuNumber: `TEST-SKU-${i + 1}`,
        productName: product.name,
        category: product.category,
        supplier: product.supplier,
        unitPrice: Math.floor(Math.random() * 50) + 20, // $20-$70
        inventoryQuantity: 100,
        isSample: true, // Mark as sample SKU
      },
    });
    testSkus.push(sku);
  }

  console.log(`✅ Created ${testSkus.length} test SKUs\n`);

  // ========================================
  // 4. Create Test Samples
  // ========================================
  console.log('🧪 Creating test samples...');

  let totalSamples = 0;
  const feedbackOptions = ['Loved it', 'Liked it', 'Neutral', 'Not interested'];
  const customerResponses = [
    'Wants to order a case',
    'Interested in trying more',
    'Not the right fit',
    'Will order next month',
  ];

  for (const customer of testCustomers) {
    for (let i = 0; i < testConfig.samplesPerCustomer; i++) {
      const randomSku = testSkus[Math.floor(Math.random() * testSkus.length)];
      const sampleDate = new Date();
      sampleDate.setDate(sampleDate.getDate() - (i * 15)); // Samples spaced 15 days apart

      await prisma.sample.create({
        data: {
          customerId: customer.id,
          skuId: randomSku.id,
          quantity: 1,
          dateSent: sampleDate,
          feedback: feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)],
          customerResponse: customerResponses[Math.floor(Math.random() * customerResponses.length)],
          createdAt: sampleDate,
        },
      });

      totalSamples++;
    }
  }

  console.log(`✅ Created ${totalSamples} test samples\n`);

  // ========================================
  // 5. Create Test Activities
  // ========================================
  console.log('📝 Creating test activities...');

  let totalActivities = 0;
  const activityTypes = ['CALL', 'EMAIL', 'VISIT', 'SAMPLE', 'OTHER'];
  const activityNotes = [
    'Discussed new product offerings',
    'Followed up on sample feedback',
    'Confirmed delivery schedule',
    'Reviewed account status',
    'Planned next quarter orders',
  ];

  for (const customer of testCustomers) {
    for (let i = 0; i < testConfig.activitiesPerCustomer; i++) {
      const activityDate = new Date();
      activityDate.setDate(activityDate.getDate() - (i * 7)); // Activities spaced 7 days apart

      await prisma.activity.create({
        data: {
          customerId: customer.id,
          activityType: activityTypes[Math.floor(Math.random() * activityTypes.length)] as any,
          notes: activityNotes[Math.floor(Math.random() * activityNotes.length)],
          activityDate,
          createdAt: activityDate,
        },
      });

      totalActivities++;
    }
  }

  console.log(`✅ Created ${totalActivities} test activities\n`);

  // ========================================
  // 6. Create Test Call Plans
  // ========================================
  console.log('📞 Creating test call plans...');

  for (let i = 1; i <= testConfig.callPlans; i++) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7)); // Each plan for a different week

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Select random customers for call plan
    const planCustomers = testCustomers
      .sort(() => Math.random() - 0.5)
      .slice(0, 5); // 5 customers per call plan

    await prisma.callPlan.create({
      data: {
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        xGoal: 3,
        yGoal: 2,
        status: i === 1 ? 'ACTIVE' : 'COMPLETED',
        customers: {
          connect: planCustomers.map(c => ({ id: c.id })),
        },
        createdAt: weekStart,
      },
    });
  }

  console.log(`✅ Created ${testConfig.callPlans} test call plans\n`);

  // ========================================
  // Summary
  // ========================================
  console.log('🎉 Test data generation complete!\n');
  console.log('Summary:');
  console.log(`  Customers: ${testCustomers.length}`);
  console.log(`  Orders: ${totalOrders}`);
  console.log(`  SKUs: ${testSkus.length}`);
  console.log(`  Samples: ${totalSamples}`);
  console.log(`  Activities: ${totalActivities}`);
  console.log(`  Call Plans: ${testConfig.callPlans}`);
  console.log('\n✅ Test data is ready for testing!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error generating test data:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
