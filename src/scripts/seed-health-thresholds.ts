import { PrismaClient } from '@prisma/client';
import { seedDefaultThresholds } from '@/lib/customer-health/thresholds';

const prisma = new PrismaClient();

/**
 * Seed default health thresholds for all tenants
 * Creates tier-based threshold configurations for customer health monitoring
 */
async function seedHealthThresholds() {
  console.log('🚀 Seeding health thresholds...\n');

  try {
    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    console.log(`📊 Found ${tenants.length} tenant(s)\n`);

    for (const tenant of tenants) {
      console.log(`\n📍 Tenant: ${tenant.name} (${tenant.slug})`);
      console.log('   Creating threshold configurations...');

      await seedDefaultThresholds(tenant.id);

      // Verify thresholds were created
      const thresholds = await prisma.healthThreshold.findMany({
        where: { tenantId: tenant.id },
        select: {
          accountType: true,
          accountPriority: true,
          dormantDays: true,
          gracePeriodPercent: true,
          revenueDeclinePercent: true,
        },
      });

      console.log(`   ✅ Created ${thresholds.length} threshold configurations:`);
      thresholds.forEach((t) => {
        const type = t.accountType || 'ALL';
        const priority = t.accountPriority || 'ALL';
        console.log(
          `      • ${type} ${priority}: ${t.dormantDays} days, ${(Number(t.gracePeriodPercent) * 100).toFixed(0)}% grace, ${(Number(t.revenueDeclinePercent) * 100).toFixed(0)}% revenue decline`
        );
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ HEALTH THRESHOLD SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log('\nNext steps:');
    console.log('  1. Run: npx tsx scripts/populate-established-revenue.ts');
    console.log('  2. Run: npx tsx src/jobs/customer-health-assessment.ts');
    console.log('  3. Check dashboard: http://localhost:3000/sales/dashboard\n');

  } catch (error) {
    console.error('\n❌ Fatal error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
seedHealthThresholds()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
