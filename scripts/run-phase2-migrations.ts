#!/usr/bin/env ts-node
/**
 * Phase 2 Database Migration Script
 *
 * This script runs all Phase 2 migrations for the Leora CRM CARLA system:
 * 1. Customer classification (ACTIVE/TARGET/PROSPECT)
 * 2. Phase 2 table creation (CallPlanAccount, CallPlanActivity)
 * 3. Account priority assignment
 * 4. Verification of all changes
 *
 * The script is idempotent - safe to run multiple times.
 *
 * Usage:
 *   cd web
 *   npx ts-node scripts/run-phase2-migrations.ts
 *
 * Or with npm:
 *   npm run migrate:phase2
 */

import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, colors.bright + colors.cyan);
  console.log('='.repeat(80) + '\n');
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow);
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.blue);
}

interface MigrationResult {
  success: boolean;
  step: string;
  message: string;
  data?: any;
}

const results: MigrationResult[] = [];

/**
 * Step 1: Classify customers by account type
 */
async function classifyCustomers(): Promise<MigrationResult> {
  logSection('Step 1: Customer Classification');

  try {
    logInfo('Classifying customers based on lastOrderDate...');

    // Classify ACTIVE customers (ordered within last 6 months)
    const activeCount = await prisma.$executeRaw`
      UPDATE "Customer"
      SET "accountType" = 'ACTIVE'::"AccountType"
      WHERE "lastOrderDate" >= CURRENT_DATE - INTERVAL '180 days'
        AND ("accountType" IS NULL OR "accountType" != 'ACTIVE'::"AccountType");
    `;

    // Classify TARGET customers (ordered 6-12 months ago)
    const targetCount = await prisma.$executeRaw`
      UPDATE "Customer"
      SET "accountType" = 'TARGET'::"AccountType"
      WHERE "lastOrderDate" >= CURRENT_DATE - INTERVAL '365 days'
        AND "lastOrderDate" < CURRENT_DATE - INTERVAL '180 days'
        AND ("accountType" IS NULL OR "accountType" != 'TARGET'::"AccountType");
    `;

    // Classify PROSPECT customers (never ordered or >12 months since last order)
    const prospectCount = await prisma.$executeRaw`
      UPDATE "Customer"
      SET "accountType" = 'PROSPECT'::"AccountType"
      WHERE ("lastOrderDate" IS NULL OR "lastOrderDate" < CURRENT_DATE - INTERVAL '365 days')
        AND ("accountType" IS NULL OR "accountType" != 'PROSPECT'::"AccountType");
    `;

    logSuccess(`ACTIVE customers updated: ${activeCount}`);
    logSuccess(`TARGET customers updated: ${targetCount}`);
    logSuccess(`PROSPECT customers updated: ${prospectCount}`);

    return {
      success: true,
      step: 'Customer Classification',
      message: 'Successfully classified all customers',
      data: { activeCount, targetCount, prospectCount }
    };
  } catch (error) {
    logError(`Failed to classify customers: ${error}`);
    return {
      success: false,
      step: 'Customer Classification',
      message: `Error: ${error}`
    };
  }
}

/**
 * Step 2: Verify customer classification distribution
 */
async function verifyClassification(): Promise<MigrationResult> {
  logSection('Step 2: Verify Customer Classification');

  try {
    logInfo('Querying customer distribution...');

    const distribution = await prisma.$queryRaw<Array<{ accountType: string; count: bigint }>>`
      SELECT "accountType", COUNT(*) as count
      FROM "Customer"
      WHERE "accountType" IS NOT NULL
      GROUP BY "accountType"
      ORDER BY "accountType";
    `;

    const totalCustomers = await prisma.customer.count();
    const classifiedCustomers = distribution.reduce((sum, row) => sum + Number(row.count), 0);

    console.log('\nDistribution:');
    distribution.forEach(row => {
      const percentage = ((Number(row.count) / totalCustomers) * 100).toFixed(1);
      log(`  ${row.accountType}: ${row.count} (${percentage}%)`, colors.cyan);
    });

    console.log(`\nTotal customers: ${totalCustomers}`);
    console.log(`Classified: ${classifiedCustomers}`);
    console.log(`Unclassified: ${totalCustomers - classifiedCustomers}\n`);

    if (classifiedCustomers < totalCustomers) {
      logWarning(`${totalCustomers - classifiedCustomers} customers still unclassified`);
    } else {
      logSuccess('All customers are classified!');
    }

    return {
      success: true,
      step: 'Verify Classification',
      message: 'Classification verified',
      data: { distribution, totalCustomers, classifiedCustomers }
    };
  } catch (error) {
    logError(`Failed to verify classification: ${error}`);
    return {
      success: false,
      step: 'Verify Classification',
      message: `Error: ${error}`
    };
  }
}

/**
 * Step 3: Run Phase 2 SQL migration
 */
async function runPhase2Migration(): Promise<MigrationResult> {
  logSection('Step 3: Phase 2 Schema Migration');

  try {
    logInfo('Reading phase2-migration.sql...');

    const migrationPath = path.join(__dirname, '../../docs/phase2-migration.sql');

    if (!fs.existsSync(migrationPath)) {
      logWarning('phase2-migration.sql not found, skipping SQL migration');
      logInfo('The Prisma schema already includes Phase 2 models');
      return {
        success: true,
        step: 'Phase 2 Migration',
        message: 'Skipped - schema already up to date',
        data: { skipped: true }
      };
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    logInfo('Executing migration SQL...');

    const connectionString =
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL or DIRECT_URL must be set to run migrations');
    }

    const client = new Client({
      connectionString,
    });

    await client.connect();

    try {
      await client.query(sql);
    } finally {
      await client.end();
    }

    logSuccess('Phase 2 migration SQL executed successfully');

    return {
      success: true,
      step: 'Phase 2 Migration',
      message: 'Successfully executed Phase 2 migration',
      data: { executed: true }
    };
  } catch (error: any) {
    // Check if error is because objects already exist
    if (error.message?.includes('already exists')) {
      logWarning('Migration objects already exist - this is OK for idempotent execution');
      return {
        success: true,
        step: 'Phase 2 Migration',
        message: 'Objects already exist (idempotent)',
        data: { alreadyExists: true }
      };
    }

    logError(`Failed to run Phase 2 migration: ${error}`);
    return {
      success: false,
      step: 'Phase 2 Migration',
      message: `Error: ${error}`
    };
  }
}

/**
 * Step 4: Verify Phase 2 tables exist
 */
async function verifyPhase2Tables(): Promise<MigrationResult> {
  logSection('Step 4: Verify Phase 2 Tables');

  try {
    logInfo('Checking for CallPlanAccount table...');
    const callPlanAccountCount = await prisma.callPlanAccount.count();
    logSuccess(`CallPlanAccount table exists (${callPlanAccountCount} rows)`);

    logInfo('Checking for CallPlanActivity table...');
    const callPlanActivityCount = await prisma.callPlanActivity.count();
    logSuccess(`CallPlanActivity table exists (${callPlanActivityCount} rows)`);

    logInfo('Checking CallPlan columns...');
    const sampleCallPlan = await prisma.callPlan.findFirst({
      select: { weekNumber: true, year: true, status: true, targetCount: true }
    });
    logSuccess('CallPlan has Phase 2 columns (weekNumber, year, status, targetCount)');

    logInfo('Checking Customer columns...');
    const sampleCustomer = await prisma.customer.findFirst({
      select: { accountPriority: true, territory: true }
    });
    logSuccess('Customer has Phase 2 columns (accountPriority, territory)');

    return {
      success: true,
      step: 'Verify Phase 2 Tables',
      message: 'All Phase 2 tables and columns verified',
      data: { callPlanAccountCount, callPlanActivityCount }
    };
  } catch (error) {
    logError(`Failed to verify Phase 2 tables: ${error}`);
    return {
      success: false,
      step: 'Verify Phase 2 Tables',
      message: `Error: ${error}`
    };
  }
}

/**
 * Step 5: Update account priorities based on account types
 */
async function updateAccountPriorities(): Promise<MigrationResult> {
  logSection('Step 5: Update Account Priorities');

  try {
    logInfo('Setting priorities based on account types...');

    // Set HIGH priority for ACTIVE accounts
    const highCount = await prisma.$executeRaw`
      UPDATE "Customer"
      SET "accountPriority" = 'HIGH'::"AccountPriority"
      WHERE "accountType" = 'ACTIVE'::"AccountType"
        AND ("accountPriority" IS NULL OR "accountPriority" != 'HIGH'::"AccountPriority");
    `;

    // Set MEDIUM priority for TARGET accounts
    const mediumCount = await prisma.$executeRaw`
      UPDATE "Customer"
      SET "accountPriority" = 'MEDIUM'::"AccountPriority"
      WHERE "accountType" = 'TARGET'::"AccountType"
        AND ("accountPriority" IS NULL OR "accountPriority" != 'MEDIUM'::"AccountPriority");
    `;

    // Set LOW priority for PROSPECT accounts
    const lowCount = await prisma.$executeRaw`
      UPDATE "Customer"
      SET "accountPriority" = 'LOW'::"AccountPriority"
      WHERE "accountType" = 'PROSPECT'::"AccountType"
        AND ("accountPriority" IS NULL OR "accountPriority" != 'LOW'::"AccountPriority");
    `;

    logSuccess(`HIGH priority (ACTIVE): ${highCount} customers`);
    logSuccess(`MEDIUM priority (TARGET): ${mediumCount} customers`);
    logSuccess(`LOW priority (PROSPECT): ${lowCount} customers`);

    return {
      success: true,
      step: 'Update Account Priorities',
      message: 'Successfully updated account priorities',
      data: { highCount, mediumCount, lowCount }
    };
  } catch (error) {
    logError(`Failed to update account priorities: ${error}`);
    return {
      success: false,
      step: 'Update Account Priorities',
      message: `Error: ${error}`
    };
  }
}

/**
 * Step 6: Create migration record
 */
async function createMigrationRecord(): Promise<MigrationResult> {
  logSection('Step 6: Record Migration');

  try {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const migrationDir = path.join(__dirname, '../prisma/migrations', `${timestamp}_phase2_complete`);

    if (!fs.existsSync(migrationDir)) {
      fs.mkdirSync(migrationDir, { recursive: true });

      const migrationSql = `-- Phase 2 Migration Completed
-- Date: ${new Date().toISOString()}
-- This migration was applied via run-phase2-migrations.ts script

-- Customer classification and account priorities have been set
-- Phase 2 tables (CallPlanAccount, CallPlanActivity) are ready
-- All indexes and constraints are in place

SELECT 1; -- Placeholder to satisfy Prisma migration format
`;

      fs.writeFileSync(path.join(migrationDir, 'migration.sql'), migrationSql);
      logSuccess(`Created migration record: ${timestamp}_phase2_complete`);
    } else {
      logInfo('Migration record already exists');
    }

    return {
      success: true,
      step: 'Record Migration',
      message: 'Migration record created',
      data: { timestamp }
    };
  } catch (error) {
    logWarning(`Could not create migration record: ${error}`);
    return {
      success: true, // Non-critical
      step: 'Record Migration',
      message: 'Skipped migration record',
      data: { skipped: true }
    };
  }
}

/**
 * Main migration orchestration
 */
async function main() {
  console.clear();

  logSection('🚀 LEORA CRM - PHASE 2 DATABASE MIGRATION');
  logInfo('This script will:');
  console.log('  1. Classify all customers (ACTIVE/TARGET/PROSPECT)');
  console.log('  2. Verify classification distribution');
  console.log('  3. Apply Phase 2 schema changes');
  console.log('  4. Verify new tables and columns');
  console.log('  5. Update account priorities');
  console.log('  6. Create migration record\n');

  logWarning('This script is IDEMPOTENT - safe to run multiple times');
  logInfo('Starting in 3 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Execute all migration steps
  const steps = [
    classifyCustomers,
    verifyClassification,
    runPhase2Migration,
    verifyPhase2Tables,
    updateAccountPriorities,
    createMigrationRecord,
  ];

  for (const step of steps) {
    const result = await step();
    results.push(result);

    if (!result.success) {
      logError(`Migration step failed: ${result.step}`);
      logError('Aborting migration');
      break;
    }
  }

  // Print summary
  logSection('📊 MIGRATION SUMMARY');

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  results.forEach((result, index) => {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? colors.green : colors.red;
    log(`${icon} Step ${index + 1}: ${result.step}`, color);
    if (result.message) {
      console.log(`    ${result.message}`);
    }
  });

  console.log('\n');

  if (successCount === totalCount) {
    logSuccess(`All ${totalCount} migration steps completed successfully! 🎉`);
    logInfo('\nNext steps:');
    console.log('  1. Run: npx prisma generate');
    console.log('  2. Verify Prisma client has new types');
    console.log('  3. Test creating a CallPlan with accounts');
    console.log('  4. Ready to build CARLA UI!\n');

    process.exit(0);
  } else {
    logError(`${totalCount - successCount} migration steps failed`);
    logInfo('Check the errors above and retry');
    process.exit(1);
  }
}

// Execute migration
main()
  .catch((error) => {
    logError('Unexpected error during migration:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
