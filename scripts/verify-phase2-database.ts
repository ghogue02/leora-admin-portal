#!/usr/bin/env ts-node
/**
 * Phase 2 Database Verification Script
 *
 * Comprehensive verification of Phase 2 migration completion:
 * - Check all enums exist
 * - Verify table structure
 * - Validate indexes
 * - Check foreign key constraints
 * - Verify sample data
 *
 * Usage:
 *   cd web
 *   npx ts-node scripts/verify-phase2-database.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function verifyEnums() {
  console.log('\n📋 Verifying Enums...\n');

  try {
    const enums = await prisma.$queryRaw<Array<{ enum_name: string; enum_value: string }>>`
      SELECT
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname IN ('AccountPriority', 'CallPlanStatus', 'ContactOutcome', 'AccountType')
      ORDER BY t.typname, e.enumsortorder;
    `;

    const grouped = enums.reduce((acc, row) => {
      if (!acc[row.enum_name]) acc[row.enum_name] = [];
      acc[row.enum_name].push(row.enum_value);
      return acc;
    }, {} as Record<string, string[]>);

    Object.entries(grouped).forEach(([name, values]) => {
      log(`✓ ${name}: ${values.join(', ')}`, colors.green);
    });

    return true;
  } catch (error) {
    log(`✗ Failed to verify enums: ${error}`, colors.red);
    return false;
  }
}

async function verifyTables() {
  console.log('\n📋 Verifying Tables...\n');

  try {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('CallPlanAccount', 'CallPlanActivity')
      ORDER BY tablename;
    `;

    tables.forEach(table => {
      log(`✓ Table: ${table.tablename}`, colors.green);
    });

    return tables.length === 2;
  } catch (error) {
    log(`✗ Failed to verify tables: ${error}`, colors.red);
    return false;
  }
}

async function verifyCustomerColumns() {
  console.log('\n📋 Verifying Customer Columns...\n');

  try {
    const columns = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
    }>>`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Customer'
        AND column_name IN ('accountPriority', 'territory', 'accountType')
      ORDER BY column_name;
    `;

    columns.forEach(col => {
      log(`✓ ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`, colors.green);
    });

    return columns.length === 3;
  } catch (error) {
    log(`✗ Failed to verify Customer columns: ${error}`, colors.red);
    return false;
  }
}

async function verifyCallPlanColumns() {
  console.log('\n📋 Verifying CallPlan Columns...\n');

  try {
    const columns = await prisma.$queryRaw<Array<{
      column_name: string;
      data_type: string;
    }>>`
      SELECT
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'CallPlan'
        AND column_name IN ('weekNumber', 'year', 'status', 'targetCount')
      ORDER BY column_name;
    `;

    columns.forEach(col => {
      log(`✓ ${col.column_name}: ${col.data_type}`, colors.green);
    });

    return columns.length === 4;
  } catch (error) {
    log(`✗ Failed to verify CallPlan columns: ${error}`, colors.red);
    return false;
  }
}

async function verifyIndexes() {
  console.log('\n📋 Verifying Indexes...\n');

  try {
    const indexes = await prisma.$queryRaw<Array<{
      tablename: string;
      indexname: string;
    }>>`
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('Customer', 'CallPlan', 'CallPlanAccount', 'CallPlanActivity')
        AND (
          indexname LIKE '%territory%'
          OR indexname LIKE '%accountPriority%'
          OR indexname LIKE '%weekNumber%'
          OR indexname LIKE '%contactOutcome%'
        )
      ORDER BY tablename, indexname;
    `;

    indexes.forEach(idx => {
      log(`✓ ${idx.tablename}.${idx.indexname}`, colors.green);
    });

    return indexes.length > 0;
  } catch (error) {
    log(`✗ Failed to verify indexes: ${error}`, colors.red);
    return false;
  }
}

async function verifyForeignKeys() {
  console.log('\n📋 Verifying Foreign Keys...\n');

  try {
    const foreignKeys = await prisma.$queryRaw<Array<{
      constraint_name: string;
      table_name: string;
      column_name: string;
      foreign_table_name: string;
    }>>`
      SELECT
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('CallPlanAccount', 'CallPlanActivity')
      ORDER BY tc.table_name, tc.constraint_name;
    `;

    foreignKeys.forEach(fk => {
      log(`✓ ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}`, colors.green);
    });

    return foreignKeys.length > 0;
  } catch (error) {
    log(`✗ Failed to verify foreign keys: ${error}`, colors.red);
    return false;
  }
}

async function verifyDataCounts() {
  console.log('\n📋 Verifying Data Counts...\n');

  try {
    // Customer classification counts
    const customerCounts = await prisma.$queryRaw<Array<{
      accountType: string;
      count: bigint;
    }>>`
      SELECT "accountType", COUNT(*) as count
      FROM "Customer"
      WHERE "accountType" IS NOT NULL
      GROUP BY "accountType"
      ORDER BY "accountType";
    `;

    const totalCustomers = await prisma.customer.count();

    console.log('Customer Classification:');
    customerCounts.forEach(row => {
      const percentage = ((Number(row.count) / totalCustomers) * 100).toFixed(1);
      log(`  ${row.accountType}: ${row.count} (${percentage}%)`, colors.cyan);
    });
    console.log(`  Total: ${totalCustomers}\n`);

    // Priority distribution
    const priorityCounts = await prisma.$queryRaw<Array<{
      accountPriority: string;
      count: bigint;
    }>>`
      SELECT "accountPriority", COUNT(*) as count
      FROM "Customer"
      WHERE "accountPriority" IS NOT NULL
      GROUP BY "accountPriority"
      ORDER BY "accountPriority";
    `;

    console.log('Account Priority:');
    priorityCounts.forEach(row => {
      const percentage = ((Number(row.count) / totalCustomers) * 100).toFixed(1);
      log(`  ${row.accountPriority}: ${row.count} (${percentage}%)`, colors.cyan);
    });

    // Phase 2 tables
    const callPlanAccountCount = await prisma.callPlanAccount.count();
    const callPlanActivityCount = await prisma.callPlanActivity.count();

    console.log('\nPhase 2 Tables:');
    log(`  CallPlanAccount: ${callPlanAccountCount} rows`, colors.cyan);
    log(`  CallPlanActivity: ${callPlanActivityCount} rows`, colors.cyan);

    return true;
  } catch (error) {
    log(`✗ Failed to verify data counts: ${error}`, colors.red);
    return false;
  }
}

async function main() {
  console.clear();
  log('\n🔍 PHASE 2 DATABASE VERIFICATION\n', colors.cyan);

  const checks = [
    { name: 'Enums', fn: verifyEnums },
    { name: 'Tables', fn: verifyTables },
    { name: 'Customer Columns', fn: verifyCustomerColumns },
    { name: 'CallPlan Columns', fn: verifyCallPlanColumns },
    { name: 'Indexes', fn: verifyIndexes },
    { name: 'Foreign Keys', fn: verifyForeignKeys },
    { name: 'Data Counts', fn: verifyDataCounts },
  ];

  const results = [];

  for (const check of checks) {
    const success = await check.fn();
    results.push({ name: check.name, success });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  log('  VERIFICATION SUMMARY', colors.cyan);
  console.log('='.repeat(60) + '\n');

  results.forEach(result => {
    const icon = result.success ? '✓' : '✗';
    const color = result.success ? colors.green : colors.red;
    log(`${icon} ${result.name}`, color);
  });

  const allPassed = results.every(r => r.success);

  console.log('\n');
  if (allPassed) {
    log('🎉 All verification checks passed!', colors.green);
    log('\nPhase 2 database is ready for CARLA system development.', colors.cyan);
    process.exit(0);
  } else {
    log('❌ Some verification checks failed', colors.red);
    log('\nPlease run the migration script first:', colors.yellow);
    console.log('  npx ts-node scripts/run-phase2-migrations.ts\n');
    process.exit(1);
  }
}

main()
  .catch(error => {
    console.error('Verification error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
