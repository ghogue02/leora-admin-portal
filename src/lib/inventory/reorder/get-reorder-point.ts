/**
 * Reorder Point Retrieval
 *
 * Fetches calculated reorder points from database with fallback to safe defaults
 */

import { PrismaClient } from '@prisma/client';
import { calculateReorderPoint, DEFAULT_REORDER_PARAMS } from './reorder-point';

const prisma = new PrismaClient();

/**
 * Get reorder point for a SKU
 *
 * Retrieves data-driven reorder point from database.
 * Falls back to conservative default if no stats calculated yet.
 *
 * @param skuId - SKU ID
 * @param tenantId - Tenant ID
 * @returns Reorder point quantity
 *
 * @example
 * const rop = await getReorderPoint(skuId, tenantId);
 * if (available < rop) {
 *   // Trigger reorder alert
 * }
 */
export async function getReorderPoint(
  skuId: string,
  tenantId: string
): Promise<number> {
  try {
    // Try to get calculated ROP from database
    const stats = await prisma.skuDemandStats.findUnique({
      where: {
        tenantId_skuId: {
          tenantId,
          skuId,
        },
      },
    });

    if (stats) {
      return stats.reorderPoint;
    }

    // No stats yet - use conservative default
    // This will be replaced once daily job calculates actual stats
    return calculateReorderPoint(DEFAULT_REORDER_PARAMS);
  } catch (error) {
    // Database error - fall back to safe default
    console.error('Error fetching reorder point:', error);
    return 10; // Conservative fallback
  }
}

/**
 * Get reorder point with details
 *
 * Returns full demand stats if available
 *
 * @param skuId - SKU ID
 * @param tenantId - Tenant ID
 * @returns Reorder point and optional stats
 */
export async function getReorderPointWithStats(
  skuId: string,
  tenantId: string
): Promise<{
  reorderPoint: number;
  daysOfSupply?: number;
  demandPattern?: string;
  lastCalculated?: Date;
  usingDefault: boolean;
}> {
  try {
    const stats = await prisma.skuDemandStats.findUnique({
      where: {
        tenantId_skuId: {
          tenantId,
          skuId,
        },
      },
    });

    if (stats) {
      return {
        reorderPoint: stats.reorderPoint,
        daysOfSupply: stats.targetDaysOfSupply,
        demandPattern: stats.demandPattern || undefined,
        lastCalculated: stats.lastCalculated,
        usingDefault: false,
      };
    }

    // Using default
    return {
      reorderPoint: calculateReorderPoint(DEFAULT_REORDER_PARAMS),
      usingDefault: true,
    };
  } catch (error) {
    console.error('Error fetching reorder point stats:', error);
    return {
      reorderPoint: 10,
      usingDefault: true,
    };
  }
}

/**
 * Check if SKU is below reorder point
 *
 * Convenience function for low-stock checks
 *
 * @param skuId - SKU ID
 * @param tenantId - Tenant ID
 * @param available - Currently available quantity
 * @returns True if below reorder point
 */
export async function isBelowReorderPoint(
  skuId: string,
  tenantId: string,
  available: number
): Promise<boolean> {
  const rop = await getReorderPoint(skuId, tenantId);
  return available < rop;
}
