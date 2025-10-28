import { PrismaClient } from '@prisma/client';

// Use correct connection format - username is 'postgres' not 'postgres.project-ref'
const connectionUrl = process.env.DIRECT_URL ||
  "postgresql://postgres:9gpGHuAIr2vKf4hO@db.zqezunzlyjkseugujkrl.supabase.co:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  }
});

async function analyzeDatabase() {
  try {
    console.log('🔍 Analyzing database state...\n');

    // Test connection
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user;` as any[];
    console.log('✅ Connected to database:', dbInfo);

    // Check enums
    console.log('\n📋 Checking enums...');
    const enums = await prisma.$queryRaw`
      SELECT
        t.typname as enum_name,
        array_agg(e.enumlabel ORDER BY e.enumsortorder) as enum_values
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    ` as any[];
    console.log('Enums found:', enums);

    // Check tables
    console.log('\n📊 Checking tables...');
    const tables = await prisma.$queryRaw`
      SELECT
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    ` as any[];
    console.log('Tables found:', tables);

    // Check Customer table schema
    console.log('\n🔍 Checking Customer table schema...');
    const customerColumns = await prisma.$queryRaw`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Customer'
      ORDER BY ordinal_position;
    ` as any[];
    console.log('Customer columns:', customerColumns);

    // Check customer count and classification
    console.log('\n👥 Checking customer data...');
    const customerCount = await prisma.$queryRaw`
      SELECT COUNT(*) as total FROM "Customer";
    ` as any[];
    console.log('Total customers:', customerCount);

    // Check if classification columns exist and have data
    const hasAccountType = customerColumns.some((col: any) => col.column_name === 'accountType');
    const hasAccountPriority = customerColumns.some((col: any) => col.column_name === 'accountPriority');

    if (hasAccountType && hasAccountPriority) {
      const classification = await prisma.$queryRaw`
        SELECT
          "accountType",
          "accountPriority",
          COUNT(*) as count
        FROM "Customer"
        GROUP BY "accountType", "accountPriority"
        ORDER BY "accountType", "accountPriority";
      ` as any[];
      console.log('Customer classification:', classification);
    } else {
      console.log('⚠️  Classification columns not found');
    }

    // Check Phase 2 tables
    console.log('\n📦 Checking Phase 2 tables...');
    const phase2Tables = await prisma.$queryRaw`
      SELECT
        table_name,
        (SELECT COUNT(*) FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name IN ('CallPlanAccount', 'CallPlanActivity', 'CalendarSync')) as exists_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('CallPlanAccount', 'CallPlanActivity', 'CalendarSync')
      ORDER BY table_name;
    ` as any[];
    console.log('Phase 2 tables:', phase2Tables);

    // Check if CallPlanAccount exists and has data
    const callPlanAccountExists = tables.some((t: any) => t.table_name === 'CallPlanAccount');
    if (callPlanAccountExists) {
      const callPlanCount = await prisma.$queryRaw`
        SELECT COUNT(*) as total FROM "CallPlanAccount";
      ` as any[];
      console.log('CallPlanAccount rows:', callPlanCount);
    }

    // Check if CallPlanActivity exists and has data
    const callPlanActivityExists = tables.some((t: any) => t.table_name === 'CallPlanActivity');
    if (callPlanActivityExists) {
      const activityCount = await prisma.$queryRaw`
        SELECT COUNT(*) as total FROM "CallPlanActivity";
      ` as any[];
      console.log('CallPlanActivity rows:', activityCount);
    }

    // Check if CalendarSync exists and has data
    const calendarSyncExists = tables.some((t: any) => t.table_name === 'CalendarSync');
    if (calendarSyncExists) {
      const syncCount = await prisma.$queryRaw`
        SELECT COUNT(*) as total FROM "CalendarSync";
      ` as any[];
      console.log('CalendarSync rows:', syncCount);
    }

    console.log('\n✅ Analysis complete!');

    // Generate summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Enums: ${enums.length} found`);
    console.log(`Tables: ${tables.length} found`);
    console.log(`Customer columns: ${customerColumns.length}`);
    console.log(`Has accountType: ${hasAccountType ? '✅' : '❌'}`);
    console.log(`Has accountPriority: ${hasAccountPriority ? '✅' : '❌'}`);
    console.log(`CallPlanAccount: ${callPlanAccountExists ? '✅' : '❌'}`);
    console.log(`CallPlanActivity: ${callPlanActivityExists ? '✅' : '❌'}`);
    console.log(`CalendarSync: ${calendarSyncExists ? '✅' : '❌'}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabase();
