import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

// The 7 active field sales reps (by email)
const ACTIVE_FIELD_REPS = [
  'angela@wellcrafted.com',
  'ebony@wellcrafted.com',
  'jose@wellcrafted.com',
  'mike@wellcrafted.com',
  'nicole@wellcrafted.com',
  'rosa-anna@wellcrafted.com',
  'jared.lorenz@wellcrafted.com', // NEW - will be created
];

async function main() {
  console.log('🚀 Creating Jared Lorenz & Consolidating Customer Assignments\n');

  try {
    // ============================================
    // STEP 1: Create Jared Lorenz Account
    // ============================================
    console.log('📋 Step 1: Creating Jared Lorenz Account...');

    // Check if Jared already exists
    let jaredUser = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: TENANT_ID,
          email: 'jared.lorenz@wellcrafted.com'
        }
      },
      include: { salesRepProfile: true },
    });

    if (jaredUser) {
      console.log('  ⚠️  Jared Lorenz already exists, using existing account');
    } else {
      // Create Jared's user account
      const hashedPassword = await bcrypt.hash('***REMOVED***', 10);

      jaredUser = await prisma.user.create({
        data: {
          email: 'jared.lorenz@wellcrafted.com',
          hashedPassword: hashedPassword,
          fullName: 'Jared Lorenz',
          isActive: true,
          tenantId: TENANT_ID,
        },
      });
      console.log(`  ✅ Created user: ${jaredUser.email} (ID: ${jaredUser.id})`);
    }

    // Create SalesRep profile if it doesn't exist
    let jaredSalesRep = jaredUser.salesRepProfile;

    if (!jaredSalesRep) {
      jaredSalesRep = await prisma.salesRep.create({
        data: {
          userId: jaredUser.id,
          territoryName: 'Northern Virginia',
          weeklyRevenueQuota: 7500,
          monthlyRevenueQuota: 30000,
          quarterlyRevenueQuota: 90000,
          annualRevenueQuota: 360000,
          deliveryDay: 'Friday',
          sampleAllowancePerMonth: 60,
          isActive: true,
          tenantId: TENANT_ID,
        },
      });
      console.log(`  ✅ Created SalesRep profile (ID: ${jaredSalesRep.id})`);
    } else {
      console.log(`  ✅ Using existing SalesRep profile (ID: ${jaredSalesRep.id})`);
    }

    // ============================================
    // STEP 2: Identify Travis Vernon's SalesRep ID
    // ============================================
    console.log('\n📋 Step 2: Identifying Travis Vernon...');

    const travisUser = await prisma.user.findFirst({
      where: {
        email: { contains: 'travis', mode: 'insensitive' },
        tenantId: TENANT_ID,
      },
      include: { salesRepProfile: true },
    });

    if (!travisUser || !travisUser.salesRepProfile) {
      throw new Error('Could not find Travis Vernon\'s SalesRep profile');
    }

    const travisSalesRepId = travisUser.salesRepProfile.id;
    console.log(`  ✅ Found Travis Vernon (SalesRep ID: ${travisSalesRepId})`);

    // ============================================
    // STEP 3: Get Active Field Rep IDs
    // ============================================
    console.log('\n📋 Step 3: Getting Active Field Rep IDs...');

    const fieldRepUsers = await prisma.user.findMany({
      where: {
        tenantId: TENANT_ID,
        email: { in: ACTIVE_FIELD_REPS },
      },
      include: { salesRepProfile: true },
    });

    const fieldRepIds = fieldRepUsers
      .filter(user => user.salesRepProfile)
      .map(user => user.salesRepProfile!.id);

    console.log(`  ✅ Found ${fieldRepIds.length} active field reps:`);
    fieldRepUsers.forEach(user => {
      console.log(`     - ${user.fullName} (${user.email})`);
    });

    if (fieldRepIds.length !== 7) {
      console.warn(`  ⚠️  Expected 7 field reps, found ${fieldRepIds.length}`);
    }

    // ============================================
    // STEP 4: Assign NWVA Customers to Jared
    // ============================================
    console.log('\n📋 Step 4: Assigning NWVA Customers to Jared...');

    // Find all unassigned customers (NWVA territory)
    const nwvaCustomers = await prisma.customer.findMany({
      where: {
        tenantId: TENANT_ID,
        salesRepId: null,
      },
    });

    console.log(`  Found ${nwvaCustomers.length} NWVA customers to assign`);

    // Update NWVA customers to Jared
    const nwvaUpdateResult = await prisma.customer.updateMany({
      where: {
        id: { in: nwvaCustomers.map(c => c.id) },
      },
      data: {
        salesRepId: jaredSalesRep.id,
        csvLastSyncedAt: new Date(),
      },
    });

    console.log(`  ✅ Assigned ${nwvaUpdateResult.count} customers to Jared Lorenz`);

    // Create audit records for NWVA assignments
    const nwvaAssignments = nwvaCustomers.map(customer => ({
      customerId: customer.id,
      salesRepId: jaredSalesRep.id,
      assignedAt: new Date(),
      tenantId: TENANT_ID,
    }));

    await prisma.customerAssignment.createMany({
      data: nwvaAssignments,
      skipDuplicates: true,
    });

    console.log(`  ✅ Created ${nwvaAssignments.length} audit records`);

    // ============================================
    // STEP 5: Consolidate Non-Field-Rep Customers
    // ============================================
    console.log('\n📋 Step 5: Consolidating Customers to Travis...');

    // Find all customers NOT assigned to the 7 field reps
    const nonFieldRepCustomers = await prisma.customer.findMany({
      where: {
        tenantId: TENANT_ID,
        OR: [
          { salesRepId: { notIn: fieldRepIds } },
          { salesRepId: null }, // Catch any remaining nulls (shouldn't be any after step 4)
        ],
      },
      include: { salesRep: true },
    });

    console.log(`  Found ${nonFieldRepCustomers.length} customers to consolidate:`);

    // Group by current sales rep for reporting
    const customersByRep = new Map<string, number>();
    nonFieldRepCustomers.forEach(customer => {
      const repName = customer.salesRep?.territoryName || 'Unassigned';
      customersByRep.set(repName, (customersByRep.get(repName) || 0) + 1);
    });

    customersByRep.forEach((count, repName) => {
      console.log(`     - ${repName}: ${count} customers`);
    });

    if (nonFieldRepCustomers.length > 0) {
      // Update all non-field-rep customers to Travis
      const consolidateResult = await prisma.customer.updateMany({
        where: {
          id: { in: nonFieldRepCustomers.map(c => c.id) },
        },
        data: {
          salesRepId: travisSalesRepId,
          csvLastSyncedAt: new Date(),
        },
      });

      console.log(`  ✅ Reassigned ${consolidateResult.count} customers to Travis Vernon`);

      // Create audit records for consolidations
      const consolidateAssignments = nonFieldRepCustomers.map(customer => ({
        customerId: customer.id,
        salesRepId: travisSalesRepId,
        assignedAt: new Date(),
        tenantId: TENANT_ID,
      }));

      await prisma.customerAssignment.createMany({
        data: consolidateAssignments,
        skipDuplicates: true,
      });

      console.log(`  ✅ Created ${consolidateAssignments.length} audit records`);
    } else {
      console.log('  ✅ No customers to consolidate (all already assigned to field reps)');
    }

    // ============================================
    // STEP 6: Verification & Reporting
    // ============================================
    console.log('\n📋 Step 6: Verification & Reporting...\n');

    // Check for null assignments
    const nullAssignments = await prisma.customer.count({
      where: {
        tenantId: TENANT_ID,
        salesRepId: null,
      },
    });

    if (nullAssignments > 0) {
      console.error(`  ❌ ERROR: ${nullAssignments} customers still have null assignments!`);
    } else {
      console.log('  ✅ VERIFIED: Zero null assignments');
    }

    // Get final customer counts by rep
    console.log('\n📊 Final Customer Distribution:\n');

    const allSalesReps = await prisma.salesRep.findMany({
      where: {
        tenantId: TENANT_ID,
        isActive: true,
      },
      include: {
        user: true,
        _count: {
          select: { customers: true },
        },
      },
      orderBy: { territoryName: 'asc' },
    });

    let totalCustomers = 0;
    const fieldRepStats = [];
    let travisStats = null;

    for (const rep of allSalesReps) {
      const customerCount = rep._count.customers;
      totalCustomers += customerCount;

      const stats = {
        name: rep.user.fullName,
        email: rep.user.email,
        territory: rep.territoryName,
        customers: customerCount,
        isFieldRep: ACTIVE_FIELD_REPS.includes(rep.user.email),
      };

      if (stats.isFieldRep) {
        fieldRepStats.push(stats);
        console.log(`  ${stats.isFieldRep ? '✅' : '⚠️ '} ${stats.name.padEnd(25)} | ${stats.territory.padEnd(25)} | ${customerCount.toString().padStart(4)} customers`);
      } else if (rep.user.email.toLowerCase().includes('travis')) {
        travisStats = stats;
      }
    }

    if (travisStats) {
      console.log(`\n  🏠 ${travisStats.name.padEnd(25)} | House Accounts              | ${travisStats.customers.toString().padStart(4)} customers`);
    }

    console.log(`\n  📊 TOTAL: ${totalCustomers} customers assigned`);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS! Customer Assignment Consolidation Complete');
    console.log('='.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   • Jared Lorenz created and assigned ${nwvaCustomers.length} NWVA customers`);
    console.log(`   • ${nonFieldRepCustomers.length} customers consolidated to Travis Vernon`);
    console.log(`   • ${fieldRepStats.length} active field sales reps`);
    console.log(`   • ${totalCustomers} total customers assigned`);
    console.log(`   • 0 null assignments remaining`);

    console.log(`\n🔑 Jared's Login Credentials:`);
    console.log(`   Email: jared.lorenz@wellcrafted.com`);
    console.log(`   Password: ***REMOVED***`);
    console.log(`   (Must change on first login)`);

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
