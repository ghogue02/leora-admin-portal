import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMigrationBaseline() {
  try {
    console.log('🔗 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected successfully');

    const baselineMigration = '20240801000000_initial_schema';

    // Check if baseline already recorded
    const existing = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      WHERE migration_name = ${baselineMigration};
    `;

    console.log('\n📊 Checking for baseline migration:', existing);

    if (Array.isArray(existing) && existing.length > 0) {
      console.log('✅ Baseline migration already recorded');
    } else {
      console.log('\n📝 Recording baseline migration as already applied...');

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
          'baseline_from_existing_schema',
          '2024-08-01 00:00:00',
          ${baselineMigration},
          'Baseline migration generated from existing schema - tables already exist in production',
          NULL,
          '2024-08-01 00:00:00',
          1
        );
      `;

      console.log('✅ Baseline migration marked as applied');
    }

    // Verify all migrations are now in order
    const allMigrations: any = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY migration_name;
    `;

    console.log('\n📋 All recorded migrations:');
    allMigrations.forEach((m: any) => {
      console.log(`   - ${m.migration_name}`);
    });

    console.log('\n✨ Migration baseline fix completed!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npx prisma migrate dev --name product-field-registry');
    console.log('   2. This should now work because the baseline is in place');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

fixMigrationBaseline();
