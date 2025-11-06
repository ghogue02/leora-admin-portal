import { run as runHealthAssessment } from '../src/jobs/customer-health-assessment';

/**
 * Script wrapper to run the customer health assessment job
 * Usage: npx tsx scripts/run-health-assessment.ts
 */
async function main() {
  console.log('🏥 Running Customer Health Assessment Job\n');

  try {
    await runHealthAssessment({
      tenantSlug: 'well-crafted',
      disconnectAfterRun: true,
    });

    console.log('\n✅ Health assessment completed successfully!');
    console.log('\nNext steps:');
    console.log('  • Check dashboard: http://localhost:3000/sales/dashboard');
    console.log('  • Review customer health segments');
    console.log('  • Verify PROSPECT vs DORMANT split\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Health assessment failed:', error);
    process.exit(1);
  }
}

main();
