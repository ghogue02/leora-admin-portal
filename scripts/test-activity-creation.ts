#!/usr/bin/env tsx
/**
 * Diagnostic Script: Test Activity Creation via Prisma
 *
 * Purpose: Bypass API and frontend layers to test direct database activity creation.
 * This helps isolate whether issues are in:
 * - Database/Prisma layer (schema, constraints, triggers)
 * - API endpoint layer (validation, authorization, business logic)
 * - Frontend layer (form validation, data transformation)
 *
 * Usage: npx tsx web/scripts/test-activity-creation.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

interface TestResult {
  success: boolean;
  activityId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

async function main() {
  console.log('🔍 Activity Creation Diagnostic Script');
  console.log('=====================================\n');

  try {
    // Step 1: Find first valid tenant
    console.log('📋 Step 1: Finding valid tenant...');
    const tenant = await prisma.tenant.findFirst({
      select: {
        id: true,
        name: true,
      },
    });

    if (!tenant) {
      throw new Error('❌ No tenants found in database');
    }
    console.log(`✅ Found tenant: ${tenant.name} (${tenant.id})\n`);

    // Step 2: Find first valid user
    console.log('📋 Step 2: Finding valid user...');
    const user = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new Error(`❌ No users found for tenant ${tenant.id}`);
    }
    console.log(`✅ Found user: ${user.name || user.email} (${user.id})\n`);

    // Step 3: Find first valid customer
    console.log('📋 Step 3: Finding valid customer...');
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
      },
      select: {
        id: true,
        name: true,
        accountNumber: true,
      },
    });

    if (!customer) {
      throw new Error(`❌ No customers found for tenant ${tenant.id}`);
    }
    console.log(`✅ Found customer: ${customer.name} (${customer.accountNumber})\n`);

    // Step 4: Find 'visit' ActivityType
    console.log('📋 Step 4: Finding "visit" ActivityType...');
    const activityType = await prisma.activityType.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'visit',
      },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
      },
    });

    if (!activityType) {
      // Show available activity types for debugging
      const availableTypes = await prisma.activityType.findMany({
        where: { tenantId: tenant.id },
        select: { name: true },
      });
      throw new Error(
        `❌ "visit" ActivityType not found. Available types: ${availableTypes.map(t => t.name).join(', ')}`
      );
    }
    console.log(`✅ Found activity type: ${activityType.name} (${activityType.id})\n`);

    // Step 5: Attempt to create test activity
    console.log('📋 Step 5: Creating test activity...');
    console.log('Activity data:');
    const activityData = {
      tenantId: tenant.id,
      customerId: customer.id,
      userId: user.id,
      activityTypeId: activityType.id,
      scheduledAt: new Date(),
      notes: 'Test activity created by diagnostic script',
    };
    console.log(JSON.stringify(activityData, null, 2));
    console.log();

    const result: TestResult = await createActivity(activityData);

    if (result.success) {
      console.log('✅ SUCCESS: Activity created successfully!');
      console.log(`   Activity ID: ${result.activityId}`);
      console.log(`   Details:`, result.details);

      // Step 6: Verify activity was created
      console.log('\n📋 Step 6: Verifying created activity...');
      const createdActivity = await prisma.activity.findUnique({
        where: { id: result.activityId },
        include: {
          activityType: true,
          customer: true,
          user: true,
        },
      });

      if (createdActivity) {
        console.log('✅ Activity verified in database:');
        console.log(`   ID: ${createdActivity.id}`);
        console.log(`   Type: ${createdActivity.activityType.name}`);
        console.log(`   Customer: ${createdActivity.customer.name}`);
        console.log(`   User: ${createdActivity.user.name || createdActivity.user.email}`);
        console.log(`   Scheduled: ${createdActivity.scheduledAt.toISOString()}`);
        console.log(`   Status: ${createdActivity.status}`);
        console.log(`   Notes: ${createdActivity.notes}`);
      }

      // Step 7: Cleanup
      console.log('\n📋 Step 7: Cleaning up test activity...');
      await prisma.activity.delete({
        where: { id: result.activityId },
      });
      console.log('✅ Test activity deleted\n');

      console.log('🎉 DIAGNOSTIC COMPLETE: All tests passed!');
      console.log('   The database layer is working correctly.');
      console.log('   Issue is likely in API endpoint or frontend validation.\n');
    } else {
      console.log('❌ FAILURE: Activity creation failed');
      console.log(`   Error: ${result.error}`);
      if (result.details) {
        console.log(`   Details:`, result.details);
      }
      console.log('\n🔍 DIAGNOSTIC COMPLETE: Issue found in database/Prisma layer\n');
    }

  } catch (error) {
    console.error('\n❌ Diagnostic script failed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error('\n   Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function createActivity(data: {
  tenantId: string;
  customerId: string;
  userId: string;
  activityTypeId: string;
  scheduledAt: Date;
  notes: string;
}): Promise<TestResult> {
  try {
    const activity = await prisma.activity.create({
      data: {
        tenantId: data.tenantId,
        customerId: data.customerId,
        userId: data.userId,
        activityTypeId: data.activityTypeId,
        scheduledAt: data.scheduledAt,
        status: 'scheduled',
        notes: data.notes,
      },
      include: {
        activityType: true,
        customer: true,
        user: true,
      },
    });

    return {
      success: true,
      activityId: activity.id,
      details: {
        type: activity.activityType.name,
        customer: activity.customer.name,
        user: activity.user.email,
        scheduledAt: activity.scheduledAt.toISOString(),
        status: activity.status,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          stack: error.stack,
        },
      };
    }
    return {
      success: false,
      error: 'Unknown error occurred',
      details: { error },
    };
  }
}

// Run the diagnostic
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
