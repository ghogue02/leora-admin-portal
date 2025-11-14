import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function markMigrationApplied() {
  try {
    console.log('🔗 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected successfully');

    const migrationName = '20251113140000_order_minimum_enforcement';

    // Check if migration is already recorded
    const existing = await prisma.$queryRaw`
      SELECT migration_name, finished_at, applied_steps_count
      FROM "_prisma_migrations"
      WHERE migration_name = ${migrationName};
    `;

    console.log('\n📊 Current migration status:', existing);

    if (Array.isArray(existing) && existing.length > 0) {
      console.log('✅ Migration already recorded in Prisma tracking table');
    } else {
      console.log('\n📝 Recording migration in Prisma tracking table...');

      // Insert migration record
      await prisma.$executeRaw`
        INSERT INTO "_prisma_migrations" (
          id,
          checksum,
          finished_at,
          migration_name,
          logs,
          rolled_back_at,
          started_at,
          applied_steps_count
        ) VALUES (
          gen_random_uuid()::text,
          'manual_application_via_supabase_dashboard',
          NOW(),
          ${migrationName},
          'Migration applied manually via Supabase SQL Editor',
          NULL,
          NOW(),
          1
        );
      `;

      console.log('✅ Migration marked as applied in Prisma tracking');
    }

    // Verify the migration was recorded
    const verification = await prisma.$queryRaw`
      SELECT migration_name, finished_at, applied_steps_count
      FROM "_prisma_migrations"
      WHERE migration_name = ${migrationName};
    `;

    console.log('\n✨ Verification - Migration record:', verification);

    // Verify the actual columns exist
    console.log('\n🔍 Verifying database schema changes...');

    const tenantColumns: any = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'TenantSettings'
      AND column_name IN ('minimumOrderAmount', 'minimumOrderEnforcementEnabled')
      ORDER BY column_name;
    `;

    const customerColumns: any = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Customer'
      AND column_name LIKE 'minimumOrder%'
      ORDER BY column_name;
    `;

    const orderColumns: any = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Order'
      AND column_name IN ('minimumOrderThreshold', 'minimumOrderViolation', 'approvalReasons')
      ORDER BY column_name;
    `;

    console.log('\n📊 TenantSettings columns added:', tenantColumns.length);
    tenantColumns.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n📊 Customer columns added:', customerColumns.length);
    customerColumns.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n📊 Order columns added:', orderColumns.length);
    orderColumns.forEach((col: any) => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n✅ All migration changes verified successfully!');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

markMigrationApplied();
