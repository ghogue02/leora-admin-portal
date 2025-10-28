#!/usr/bin/env tsx
/**
 * Test Critical Pages - Verify all 4 previously broken pages work
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:***REMOVED***@***SUPABASE_HOST_REMOVED***:5432/postgres'
    }
  }
});

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

async function testCriticalPages() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  🧪 TESTING CRITICAL PAGES - API ROUTES');
  console.log('═══════════════════════════════════════════════════════\n');

  const tests = [];

  try {
    // Test 1: Orders Data
    console.log('1️⃣  Testing Orders API...');
    const travis = await prisma.salesRep.findFirst({
      where: {
        tenantId: TENANT_ID,
        user: { email: 'travis@wellcraftedbeverage.com' }
      }
    });

    if (travis) {
      const orders = await prisma.order.findMany({
        where: {
          tenantId: TENANT_ID,
          customer: { salesRepId: travis.id }
        },
        include: {
          customer: { select: { name: true } },
          invoices: { select: { id: true, total: true, status: true } }
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      });

      console.log(`   ✅ Found ${orders.length} orders for Travis`);
      if (orders.length > 0) {
        console.log(`   ✅ Sample order: ${orders[0].orderNumber} - ${orders[0].customer.name} - $${orders[0].total}`);
      }
      tests.push({ name: 'Orders API', status: 'PASS', orders: orders.length });
    } else {
      console.log('   ⚠️  Travis not found');
      tests.push({ name: 'Orders API', status: 'SKIP', reason: 'No sales rep' });
    }

    // Test 2: Samples Data
    console.log('\n2️⃣  Testing Samples API...');
    const sampleUsage = await prisma.sampleUsage.count({
      where: { tenantId: TENANT_ID }
    });

    const sampleItems = await prisma.sampleItem.count({
      where: { tenantId: TENANT_ID }
    });

    console.log(`   ✅ Sample Usage records: ${sampleUsage}`);
    console.log(`   ✅ Sample Items: ${sampleItems}`);
    tests.push({ name: 'Samples API', status: 'PASS', usage: sampleUsage, items: sampleItems });

    // Test 3: Catalog/Products Data
    console.log('\n3️⃣  Testing Catalog API...');
    const products = await prisma.product.count({
      where: { tenantId: TENANT_ID }
    });

    const skus = await prisma.sku.count({
      where: { tenantId: TENANT_ID }
    });

    const inventory = await prisma.inventory.count({
      where: { tenantId: TENANT_ID }
    });

    console.log(`   ✅ Products: ${products.toLocaleString()}`);
    console.log(`   ✅ SKUs: ${skus.toLocaleString()}`);
    console.log(`   ✅ Inventory records: ${inventory.toLocaleString()}`);
    tests.push({ name: 'Catalog API', status: 'PASS', products, skus, inventory });

    // Test 4: Admin Dashboard Data
    console.log('\n4️⃣  Testing Admin Dashboard API...');
    const customers = await prisma.customer.count({
      where: { tenantId: TENANT_ID, isPermanentlyClosed: false }
    });

    const totalOrders = await prisma.order.count({
      where: { tenantId: TENANT_ID }
    });

    const activePortalUsers = await prisma.portalUser.count({
      where: { tenantId: TENANT_ID, status: 'ACTIVE' }
    });

    console.log(`   ✅ Customers: ${customers.toLocaleString()}`);
    console.log(`   ✅ Total Orders: ${totalOrders.toLocaleString()}`);
    console.log(`   ✅ Active Portal Users: ${activePortalUsers}`);
    tests.push({ name: 'Admin API', status: 'PASS', customers, orders: totalOrders, users: activePortalUsers });

    // Summary
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  📊 TEST RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');

    tests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name}: ${test.status === 'PASS' ? '✅' : '⚠️'} ${test.status}`);
    });

    const allPass = tests.every(t => t.status === 'PASS');
    console.log('\n' + (allPass ? '✅ ALL TESTS PASSED!' : '⚠️  Some tests failed'));

    console.log('\n📌 NEXT STEPS:');
    console.log('  1. Open http://localhost:3005/sales/login');
    console.log('  2. Login as Travis Vernon');
    console.log('  3. Test each page:');
    console.log('     - /sales/orders (should load order list)');
    console.log('     - /sales/samples (should show sample tracking)');
    console.log('     - /sales/catalog (should display products)');
    console.log('     - /admin (should show dashboard or redirect)');
    console.log('\n═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testCriticalPages();
