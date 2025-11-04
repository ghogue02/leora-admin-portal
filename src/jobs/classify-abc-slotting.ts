/**
 * Monthly Job: ABC Warehouse Slotting Classification
 *
 * Analyzes SKU pick frequency and generates warehouse slotting recommendations.
 * Runs monthly to keep ABC classifications current as demand patterns change.
 *
 * Schedule: Monthly on 1st at 3 AM
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 3
 */

import { PrismaClient } from '@prisma/client';
import {
  calculateSKUActivityMetrics,
  classifySKUsABC,
  getABCSummary,
  generateSlottingRecommendations,
} from '@/lib/warehouse/slotting/abc-classification';

const prisma = new PrismaClient();

export type ABCClassificationResult = {
  tenantId: string;
  tenantName: string;
  skusAnalyzed: number;
  aCount: number;
  bCount: number;
  cCount: number;
  aPercentActivity: number;
  recommendations: number;
  duration: number;
};

/**
 * Run ABC classification for a tenant
 *
 * @param tenantId - Tenant ID
 * @param lookbackDays - Days of history to analyze (default: 90)
 * @returns Classification results
 */
export async function runABCClassification(
  tenantId: string,
  lookbackDays: number = 90
): Promise<ABCClassificationResult> {
  const startTime = Date.now();

  console.log(`[ABC Classification] Starting for tenant ${tenantId}...`);

  // Get tenant name
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  // Calculate activity metrics
  console.log('[ABC Classification] Calculating SKU activity metrics...');
  const activityMetrics = await calculateSKUActivityMetrics(tenantId, lookbackDays);

  console.log(`[ABC Classification] Analyzed ${activityMetrics.size} SKUs`);

  // Classify into ABC groups
  console.log('[ABC Classification] Classifying into ABC groups...');
  const classified = classifySKUsABC(activityMetrics);

  // Get summary statistics
  const summary = getABCSummary(classified);

  console.log('[ABC Classification] Summary:', {
    totalSKUs: summary.totalSKUs,
    A: `${summary.aCount} SKUs (${summary.aPercentActivity}% of activity)`,
    B: `${summary.bCount} SKUs (${summary.bPercentActivity}% of activity)`,
    C: `${summary.cCount} SKUs (${summary.cPercentActivity}% of activity)`,
  });

  // Generate slotting recommendations
  console.log('[ABC Classification] Generating slotting recommendations...');
  const recommendations = await generateSlottingRecommendations(tenantId, classified);

  console.log(`[ABC Classification] Generated ${recommendations.length} recommendations`);

  // TODO: Store classification results in database
  // For now, we'll just log and return

  const result: ABCClassificationResult = {
    tenantId,
    tenantName: tenant.name,
    skusAnalyzed: activityMetrics.size,
    aCount: summary.aCount,
    bCount: summary.bCount,
    cCount: summary.cCount,
    aPercentActivity: summary.aPercentActivity,
    recommendations: recommendations.length,
    duration: Date.now() - startTime,
  };

  console.log('[ABC Classification] Complete:', {
    tenant: tenant.name,
    duration: `${(result.duration / 1000).toFixed(1)}s`,
  });

  return result;
}

/**
 * Run ABC classification for all tenants
 *
 * @param lookbackDays - Days of history to analyze
 * @returns Array of results per tenant
 */
export async function runABCClassificationAllTenants(
  lookbackDays: number = 90
): Promise<ABCClassificationResult[]> {
  console.log('[ABC Classification] Starting multi-tenant classification...');

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  console.log(`[ABC Classification] Processing ${tenants.length} tenants`);

  const results: ABCClassificationResult[] = [];

  for (const tenant of tenants) {
    console.log(`\n[ABC Classification] Processing: ${tenant.name}`);

    try {
      const result = await runABCClassification(tenant.id, lookbackDays);
      results.push(result);
    } catch (error) {
      console.error(`[ABC Classification] Failed for ${tenant.name}:`, error);
      results.push({
        tenantId: tenant.id,
        tenantName: tenant.name,
        skusAnalyzed: 0,
        aCount: 0,
        bCount: 0,
        cCount: 0,
        aPercentActivity: 0,
        recommendations: 0,
        duration: 0,
      });
    }
  }

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalSKUs = results.reduce((sum, r) => sum + r.skusAnalyzed, 0);
  const totalRecommendations = results.reduce((sum, r) => sum + r.recommendations, 0);

  console.log('\n[ABC Classification] Multi-tenant complete:', {
    tenants: tenants.length,
    totalSKUs,
    totalRecommendations,
    totalDuration: `${(totalDuration / 1000).toFixed(1)}s`,
  });

  return results;
}

/**
 * CLI entry point for manual execution
 *
 * Usage: npx tsx src/jobs/classify-abc-slotting.ts [tenantId] [lookbackDays]
 */
if (require.main === module) {
  const tenantId = process.argv[2];
  const lookbackDays = process.argv[3] ? parseInt(process.argv[3]) : 90;

  if (tenantId) {
    // Classify specific tenant
    runABCClassification(tenantId, lookbackDays)
      .then((result) => {
        console.log('\n✅ ABC Classification completed successfully');
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ ABC Classification failed:', error);
        process.exit(1);
      });
  } else {
    // Classify all tenants
    runABCClassificationAllTenants(lookbackDays)
      .then((results) => {
        console.log('\n✅ All tenants classified successfully');
        console.log(`Total recommendations: ${results.reduce((s, r) => s + r.recommendations, 0)}`);
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Multi-tenant classification failed:', error);
        process.exit(1);
      });
  }
}
