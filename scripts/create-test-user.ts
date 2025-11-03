/**
 * Create Test User for Order System Testing
 *
 * This script creates a test user with:
 * - Active sales rep profile
 * - Assigned customers for testing order creation
 * - Proper authentication setup
 *
 * Usage:
 *   npx tsx scripts/create-test-user.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TENANT_ID = '4a0b7f08-fef5-4ab3-9c61-f1e263f91b06'; // Leora tenant ID
const TEST_EMAIL = 'test-sales@leora.com';
const TEST_PASSWORD = 'Test123!@#'; // Change this for production

async function main() {
  console.log('🔧 Creating test user for order system...\n');

  try {
    // 1. Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: TENANT_ID,
          email: TEST_EMAIL,
        },
      },
      include: {
        salesRepProfile: true,
      },
    });

    if (existingUser) {
      console.log('✅ Test user already exists:');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Name: ${existingUser.fullName}`);
      console.log(`   Sales Rep: ${existingUser.salesRepProfile ? 'Yes' : 'No'}`);

      if (existingUser.salesRepProfile) {
        console.log(`   Territory: ${existingUser.salesRepProfile.territoryName}`);

        // Count assigned customers
        const customerCount = await prisma.customer.count({
          where: {
            tenantId: TENANT_ID,
            salesRepId: existingUser.salesRepProfile.id,
          },
        });
        console.log(`   Assigned Customers: ${customerCount}`);
      }

      console.log('\n✅ Test user is ready to use!');
      console.log(`\n📝 Login credentials:`);
      console.log(`   URL: https://web-omega-five-81.vercel.app/sales/login`);
      console.log(`   Email: ${TEST_EMAIL}`);
      console.log(`   Password: ${TEST_PASSWORD}`);
      return;
    }

    // 2. Create test user with hashed password
    console.log('Creating new test user...');
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

    const user = await prisma.user.create({
      data: {
        tenantId: TENANT_ID,
        email: TEST_EMAIL,
        hashedPassword,
        fullName: 'Test Sales Rep',
        isActive: true,
        role: 'SALES_REP',
      },
    });

    console.log(`✅ User created: ${user.email}`);

    // 3. Create sales rep profile
    console.log('Creating sales rep profile...');
    const salesRep = await prisma.salesRep.create({
      data: {
        tenantId: TENANT_ID,
        userId: user.id,
        territoryName: 'Test Territory',
        deliveryDaysArray: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        weeklyRevenueQuota: 10000,
        isActive: true,
      },
    });

    console.log(`✅ Sales rep profile created for territory: ${salesRep.territoryName}`);

    // 4. Assign some customers to this sales rep
    console.log('Assigning customers to sales rep...');

    // Get first 10 customers that have no sales rep assigned
    const unassignedCustomers = await prisma.customer.findMany({
      where: {
        tenantId: TENANT_ID,
        salesRepId: null,
      },
      take: 10,
    });

    if (unassignedCustomers.length > 0) {
      await prisma.customer.updateMany({
        where: {
          tenantId: TENANT_ID,
          id: { in: unassignedCustomers.map(c => c.id) },
        },
        data: {
          salesRepId: salesRep.id,
        },
      });

      console.log(`✅ Assigned ${unassignedCustomers.length} customers to test sales rep`);
    } else {
      console.log('⚠️  No unassigned customers found. Test user will have 0 customers.');
      console.log('   This will show "No customers available" in order creation.');
    }

    // 5. Show summary
    console.log('\n🎉 Test user setup complete!\n');
    console.log('📝 Login credentials:');
    console.log(`   URL: https://web-omega-five-81.vercel.app/sales/login`);
    console.log(`   Email: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log('');
    console.log('🧪 Test Checklist:');
    console.log('   1. Login with credentials above');
    console.log('   2. Navigate to /sales/orders');
    console.log('   3. Click "New Order" button');
    console.log('   4. Search for customers (should show assigned customers)');
    console.log('   5. Complete order creation flow');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
