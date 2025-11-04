/**
 * Daily Job: Update SKU Demand Statistics
 *
 * Calculates demand patterns for all active SKUs based on last 90 days of orders.
 * Updates reorder points, days of supply targets, and demand classifications.
 *
 * Schedule: Daily at 2 AM
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 2.5
 */

import { PrismaClient } from '@prisma/client';
import {
  calculateDemandStats,
  classifyDemandPattern,
  getRecommendedServiceLevel,
} from '@/lib/inventory/reorder/demand-stats';
import { calculateReorderPoint } from '@/lib/inventory/reorder/reorder-point';

const prisma = new PrismaClient();

export type UpdateStatsResult = {
  tenantId: string;
  skusProcessed: number;
  skusUpdated: number;
  skusCreated: number;
  errors: Array<{ skuId: string; error: string }>;
  duration: number;
};

/**
 * Update demand statistics for all SKUs in a tenant
 *
 * @param tenantId - Tenant ID
 * @param lookbackDays - Days of history to analyze (default: 90)
 * @returns Update results
 */
export async function updateSKUDemandStats(
  tenantId: string,
  lookbackDays: number = 90
): Promise<UpdateStatsResult> {
  const startTime = Date.now();
  const result: UpdateStatsResult = {
    tenantId,
    skusProcessed: 0,
    skusUpdated: 0,
    skusCreated: 0,
    errors: [],
    duration: 0,
  };

  console.log(`[SKU Demand Stats] Starting update for tenant ${tenantId}...`);

  try {
    // Get all active SKUs
    const skus = await prisma.sku.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`[SKU Demand Stats] Found ${skus.length} active SKUs`);

    // Process each SKU
    for (const sku of skus) {
      result.skusProcessed++;

      try {
        // Calculate demand statistics from historical orders
        const demandStats = await calculateDemandStats(tenantId, sku.id, lookbackDays);

        // Skip if no demand history
        if (demandStats.totalDemand === 0) {
          console.log(`[SKU Demand Stats] Skipping ${sku.code} - no demand history`);
          continue;
        }

        // Classify demand pattern
        const pattern = classifyDemandPattern(demandStats);

        // Calculate reorder point
        const reorderPoint = calculateReorderPoint({
          meanDailyDemand: Number(demandStats.meanDailyDemand),
          sdDailyDemand: Number(demandStats.sdDailyDemand),
          meanLeadDays: 7, // Default lead time (could be supplier-specific)
          sdLeadDays: 2,
          serviceLevelZ: 1.64, // 95% service level default
        });

        // Upsert demand stats
        const existing = await prisma.skuDemandStats.findUnique({
          where: {
            tenantId_skuId: {
              tenantId,
              skuId: sku.id,
            },
          },
        });

        if (existing) {
          // Update existing stats
          await prisma.skuDemandStats.update({
            where: {
              id: existing.id,
            },
            data: {
              meanDailyDemand: demandStats.meanDailyDemand,
              sdDailyDemand: demandStats.sdDailyDemand,
              minDailyDemand: demandStats.minDailyDemand,
              maxDailyDemand: demandStats.maxDailyDemand,
              totalDemand: demandStats.totalDemand,
              daysWithDemand: demandStats.daysWithDemand,
              daysInPeriod: demandStats.daysInPeriod,
              reorderPoint,
              demandPattern: pattern.classification,
              intermittencyRate: pattern.intermittencyRate,
              coefficientOfVariation: pattern.coefficientOfVariation,
              lastCalculated: new Date(),
              lookbackDays,
            },
          });

          result.skusUpdated++;
        } else {
          // Create new stats
          await prisma.skuDemandStats.create({
            data: {
              tenantId,
              skuId: sku.id,
              meanDailyDemand: demandStats.meanDailyDemand,
              sdDailyDemand: demandStats.sdDailyDemand,
              minDailyDemand: demandStats.minDailyDemand,
              maxDailyDemand: demandStats.maxDailyDemand,
              totalDemand: demandStats.totalDemand,
              daysWithDemand: demandStats.daysWithDemand,
              daysInPeriod: demandStats.daysInPeriod,
              reorderPoint,
              demandPattern: pattern.classification,
              intermittencyRate: pattern.intermittencyRate,
              coefficientOfVariation: pattern.coefficientOfVariation,
              lookbackDays,
            },
          });

          result.skusCreated++;
        }

        // Log progress every 50 SKUs
        if (result.skusProcessed % 50 === 0) {
          console.log(`[SKU Demand Stats] Processed ${result.skusProcessed}/${skus.length} SKUs...`);
        }
      } catch (error) {
        console.error(`[SKU Demand Stats] Error processing SKU ${sku.code}:`, error);
        result.errors.push({
          skuId: sku.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.duration = Date.now() - startTime;

    console.log(`[SKU Demand Stats] Completed:`, {
      processed: result.skusProcessed,
      updated: result.skusUpdated,
      created: result.skusCreated,
      errors: result.errors.length,
      duration: `${(result.duration / 1000).toFixed(1)}s`,
    });

    return result;
  } catch (error) {
    result.duration = Date.now() - startTime;
    console.error(`[SKU Demand Stats] Job failed:`, error);
    throw error;
  }
}

/**
 * Update demand statistics for all tenants
 *
 * @param lookbackDays - Days of history to analyze
 * @returns Array of results per tenant
 */
export async function updateAllTenantsDemandStats(
  lookbackDays: number = 90
): Promise<UpdateStatsResult[]> {
  console.log('[SKU Demand Stats] Starting multi-tenant update...');

  // Get all active tenants
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`[SKU Demand Stats] Processing ${tenants.length} tenants`);

  const results: UpdateStatsResult[] = [];

  for (const tenant of tenants) {
    console.log(`\n[SKU Demand Stats] Processing tenant: ${tenant.name}`);

    try {
      const result = await updateSKUDemandStats(tenant.id, lookbackDays);
      results.push(result);
    } catch (error) {
      console.error(`[SKU Demand Stats] Failed for tenant ${tenant.name}:`, error);
      results.push({
        tenantId: tenant.id,
        skusProcessed: 0,
        skusUpdated: 0,
        skusCreated: 0,
        errors: [{
          skuId: 'TENANT_ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
        duration: 0,
      });
    }
  }

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const totalProcessed = results.reduce((sum, r) => sum + r.skusProcessed, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  console.log('\n[SKU Demand Stats] Multi-tenant update complete:', {
    tenants: tenants.length,
    totalSKUs: totalProcessed,
    totalErrors,
    totalDuration: `${(totalDuration / 1000).toFixed(1)}s`,
  });

  return results;
}

/**
 * CLI entry point for manual execution
 *
 * Usage: npx tsx src/jobs/update-sku-demand-stats.ts [tenantId] [lookbackDays]
 */
if (require.main === module) {
  const tenantId = process.argv[2];
  const lookbackDays = process.argv[3] ? parseInt(process.argv[3]) : 90;

  if (tenantId) {
    // Update specific tenant
    updateSKUDemandStats(tenantId, lookbackDays)
      .then((result) => {
        console.log('\n✅ Job completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Job failed:', error);
        process.exit(1);
      });
  } else {
    // Update all tenants
    updateAllTenantsDemandStats(lookbackDays)
      .then(() => {
        console.log('\n✅ All tenants updated successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Multi-tenant job failed:', error);
        process.exit(1);
      });
  }
}
