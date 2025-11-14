import { PrismaClient } from '@prisma/client';

// Use direct connection (port 5432) instead of pooler for migration
// This is required because pgbouncer transaction pooling doesn't support all Prisma features
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL || process.env.DATABASE_URL
    }
  }
});

async function applyMigration() {
  try {
    console.log('🔗 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Connected successfully');

    // Migration SQL split into individual statements
    const migrations = [
      // Add tenant-level minimum order configuration
      `ALTER TABLE "TenantSettings"
       ADD COLUMN IF NOT EXISTS "minimumOrderAmount" DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
       ADD COLUMN IF NOT EXISTS "minimumOrderEnforcementEnabled" BOOLEAN NOT NULL DEFAULT false;`,

      // Add customer-level overrides + auditing
      `ALTER TABLE "Customer"
       ADD COLUMN IF NOT EXISTS "minimumOrderOverride" DECIMAL(10, 2),
       ADD COLUMN IF NOT EXISTS "minimumOrderOverrideNotes" TEXT,
       ADD COLUMN IF NOT EXISTS "minimumOrderOverrideUpdatedAt" TIMESTAMP(3),
       ADD COLUMN IF NOT EXISTS "minimumOrderOverrideUpdatedBy" TEXT;`,

      // Persist applied threshold + approval metadata on orders
      `ALTER TABLE "Order"
       ADD COLUMN IF NOT EXISTS "minimumOrderThreshold" DECIMAL(10, 2),
       ADD COLUMN IF NOT EXISTS "minimumOrderViolation" BOOLEAN NOT NULL DEFAULT false,
       ADD COLUMN IF NOT EXISTS "approvalReasons" JSONB;`
    ];

    console.log('📝 Applying migration statements...');

    for (let i = 0; i < migrations.length; i++) {
      console.log(`   [${i + 1}/${migrations.length}] Executing...`);
      await prisma.$executeRawUnsafe(migrations[i]);
      console.log(`   ✅ Statement ${i + 1} applied successfully`);
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📊 Verifying columns added...');

    // Verify the migration worked
    const tenantSettings = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'TenantSettings'
      AND column_name IN ('minimumOrderAmount', 'minimumOrderEnforcementEnabled')
      ORDER BY column_name;
    `;

    const customer = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Customer'
      AND column_name LIKE 'minimumOrder%'
      ORDER BY column_name;
    `;

    const order = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'Order'
      AND column_name IN ('minimumOrderThreshold', 'minimumOrderViolation', 'approvalReasons')
      ORDER BY column_name;
    `;

    console.log('\nTenantSettings columns:', tenantSettings);
    console.log('Customer columns:', customer);
    console.log('Order columns:', order);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  }
}

applyMigration();
