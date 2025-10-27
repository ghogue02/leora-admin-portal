/**
 * Calculate Sample Metrics Background Job
 *
 * Runs daily at 2am to calculate sample conversion metrics
 * for all SKUs with a 30-day rolling window.
 */

import { PrismaClient } from '@prisma/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { calculateSampleMetrics } from '../lib/sample-analytics';

const prisma = new PrismaClient();

interface JobResult {
  success: boolean;
  processed: number;
  errors: string[];
  duration: number;
}

/**
 * Main job execution function
 */
export async function calculateSampleMetricsJob(): Promise<JobResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let processed = 0;

  try {
    console.log('[SampleMetrics] Starting daily calculation job...');

    // Get all active tenants
    const tenants = await prisma.tenant.findMany({
      where: {
        // Only process active tenants
        users: {
          some: {
            isActive: true,
          },
        },
      },
    });

    console.log(`[SampleMetrics] Processing ${tenants.length} tenants`);

    for (const tenant of tenants) {
      try {
        // Get all SKUs for this tenant
        const skus = await prisma.sku.findMany({
          where: {
            tenantId: tenant.id,
            isActive: true,
          },
        });

        console.log(
          `[SampleMetrics] Tenant ${tenant.slug}: ${skus.length} SKUs`
        );

        // Calculate metrics for each SKU
        for (const sku of skus) {
          try {
            // 30-day rolling window ending yesterday
            const periodEnd = endOfDay(subDays(new Date(), 1));
            const periodStart = startOfDay(subDays(periodEnd, 30));

            // Calculate metrics
            const metrics = await calculateSampleMetrics({
              tenantId: tenant.id,
              skuId: sku.id,
              periodStart,
              periodEnd,
            });

            // Upsert metrics record
            await prisma.sampleMetrics.upsert({
              where: {
                tenantId_skuId_periodStart: {
                  tenantId: tenant.id,
                  skuId: sku.id,
                  periodStart,
                },
              },
              create: metrics,
              update: {
                periodEnd: metrics.periodEnd,
                totalSamplesGiven: metrics.totalSamplesGiven,
                totalCustomersSampled: metrics.totalCustomersSampled,
                samplesResultingInOrder: metrics.samplesResultingInOrder,
                conversionRate: metrics.conversionRate,
                totalRevenue: metrics.totalRevenue,
                avgRevenuePerSample: metrics.avgRevenuePerSample,
                calculatedAt: new Date(),
              },
            });

            processed++;
          } catch (error) {
            const errorMsg = `Failed to calculate metrics for SKU ${sku.code}: ${error instanceof Error ? error.message : String(error)}`;
            console.error(`[SampleMetrics] ${errorMsg}`);
            errors.push(errorMsg);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process tenant ${tenant.slug}: ${error instanceof Error ? error.message : String(error)}`;
        console.error(`[SampleMetrics] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[SampleMetrics] Job completed in ${duration}ms. Processed: ${processed}, Errors: ${errors.length}`
    );

    return {
      success: errors.length === 0,
      processed,
      errors,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = `Fatal error in sample metrics job: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`[SampleMetrics] ${errorMsg}`);
    errors.push(errorMsg);

    return {
      success: false,
      processed,
      errors,
      duration,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Schedule configuration for job queue
 */
export const sampleMetricsJobConfig = {
  name: 'calculate-sample-metrics',
  cron: '0 2 * * *', // Daily at 2am
  handler: calculateSampleMetricsJob,
  description: 'Calculate sample conversion metrics for all SKUs',
};

// If run directly (for testing)
if (require.main === module) {
  calculateSampleMetricsJob()
    .then((result) => {
      console.log('Job result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Job failed:', error);
      process.exit(1);
    });
}
