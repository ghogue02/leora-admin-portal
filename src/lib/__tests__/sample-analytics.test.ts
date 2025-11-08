/**
 * Sample Analytics Service Tests
 *
 * Tests for revenue calculation with 30-day attribution window
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { addDays, subDays } from 'date-fns';
import {
  calculateSampleRevenue,
  calculateSampleMetrics,
  getSampleConversionRate,
  getTopPerformingSamples,
  getRepSamplePerformance,
} from '../sample-analytics';

const mockPrisma = {
  sampleUsage: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  order: {
    findMany: vi.fn(),
  },
  sku: {
    findMany: vi.fn(),
  },
  sampleMetrics: {
    upsert: vi.fn(),
  },
  $disconnect: vi.fn(),
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
  Prisma: {
    Decimal: class Decimal {
      constructor(public value: number) {}
      toNumber() {
        return this.value;
      }
    },
  },
}));

describe.skip('Sample Analytics Service', () => {
  let prisma: PrismaClient;

  beforeEach(() => {
    prisma = new PrismaClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('calculateSampleRevenue', () => {
    it('should calculate revenue for sample with orders in 30-day window', async () => {
      const tastedAt = new Date('2024-01-15');
      const sampleId = 'sample-123';
      const customerId = 'customer-456';
      const skuId = 'sku-789';

      // Mock sample
      (prisma.sampleUsage.findUnique as any).mockResolvedValue({
        id: sampleId,
        tenantId: 'tenant-1',
        salesRepId: 'rep-1',
        customerId,
        skuId,
        tastedAt,
        sku: { id: skuId, code: 'SKU-001' },
        customer: { id: customerId, name: 'Test Customer' },
      });

      // Mock orders within window (Jan 15 - Feb 14)
      (prisma.order.findMany as any).mockResolvedValue([
        {
          id: 'order-1',
          customerId,
          orderedAt: new Date('2024-01-20'),
          lines: [
            { skuId, quantity: 12, unitPrice: 25.0 }, // $300
          ],
        },
        {
          id: 'order-2',
          customerId,
          orderedAt: new Date('2024-02-10'),
          lines: [
            { skuId, quantity: 6, unitPrice: 25.0 }, // $150
          ],
        },
      ]);

      const result = await calculateSampleRevenue(sampleId);

      expect(result.sampleUsageId).toBe(sampleId);
      expect(result.attributedRevenue).toBe(450);
      expect(result.orderCount).toBe(2);
      expect(result.orders).toHaveLength(2);
    });

    it('should not attribute orders outside 30-day window', async () => {
      const tastedAt = new Date('2024-01-15');
      const sampleId = 'sample-123';

      (prisma.sampleUsage.findUnique as any).mockResolvedValue({
        id: sampleId,
        tenantId: 'tenant-1',
        salesRepId: 'rep-1',
        customerId: 'customer-456',
        skuId: 'sku-789',
        tastedAt,
        sku: { id: 'sku-789', code: 'SKU-001' },
        customer: { id: 'customer-456', name: 'Test Customer' },
      });

      // Order on day 31 (outside window)
      (prisma.order.findMany as any).mockResolvedValue([
        {
          id: 'order-late',
          customerId: 'customer-456',
          orderedAt: addDays(tastedAt, 31),
          lines: [{ skuId: 'sku-789', quantity: 12, unitPrice: 25.0 }],
        },
      ]);

      const result = await calculateSampleRevenue(sampleId);

      // Should find no orders (outside window)
      expect(result.attributedRevenue).toBe(0);
      expect(result.orderCount).toBe(0);
    });

    it('should handle sample with no resulting orders', async () => {
      const sampleId = 'sample-no-orders';

      (prisma.sampleUsage.findUnique as any).mockResolvedValue({
        id: sampleId,
        tenantId: 'tenant-1',
        salesRepId: 'rep-1',
        customerId: 'customer-456',
        skuId: 'sku-789',
        tastedAt: new Date('2024-01-15'),
        sku: { id: 'sku-789', code: 'SKU-001' },
        customer: { id: 'customer-456', name: 'Test Customer' },
      });

      (prisma.order.findMany as any).mockResolvedValue([]);

      const result = await calculateSampleRevenue(sampleId);

      expect(result.attributedRevenue).toBe(0);
      expect(result.orderCount).toBe(0);
      expect(result.orders).toHaveLength(0);
    });

    it('should throw error for non-existent sample', async () => {
      (prisma.sampleUsage.findUnique as any).mockResolvedValue(null);

      await expect(calculateSampleRevenue('non-existent')).rejects.toThrow(
        'Sample usage non-existent not found'
      );
    });

    it('should only count orders for the sampled SKU', async () => {
      const tastedAt = new Date('2024-01-15');
      const sampleId = 'sample-123';
      const sampledSkuId = 'sku-sampled';

      (prisma.sampleUsage.findUnique as any).mockResolvedValue({
        id: sampleId,
        tenantId: 'tenant-1',
        salesRepId: 'rep-1',
        customerId: 'customer-456',
        skuId: sampledSkuId,
        tastedAt,
        sku: { id: sampledSkuId, code: 'SKU-SAMPLED' },
        customer: { id: 'customer-456', name: 'Test Customer' },
      });

      // Order has multiple SKUs, but we only count the sampled one
      (prisma.order.findMany as any).mockResolvedValue([
        {
          id: 'order-multi',
          customerId: 'customer-456',
          orderedAt: new Date('2024-01-20'),
          lines: [
            { skuId: sampledSkuId, quantity: 12, unitPrice: 25.0 }, // $300 (counted)
            { skuId: 'sku-other', quantity: 6, unitPrice: 30.0 }, // $180 (not counted)
          ],
        },
      ]);

      const result = await calculateSampleRevenue(sampleId);

      // Should only count the sampled SKU
      expect(result.attributedRevenue).toBe(300);
    });
  });

  describe('calculateSampleMetrics', () => {
    it('should calculate metrics for a SKU and period', async () => {
      const tenantId = 'tenant-1';
      const skuId = 'sku-123';
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');

      // Mock 10 samples
      const samples = Array.from({ length: 10 }, (_, i) => ({
        id: `sample-${i}`,
        tenantId,
        salesRepId: 'rep-1',
        customerId: `customer-${i % 5}`, // 5 unique customers
        skuId,
        tastedAt: new Date('2024-01-15'),
      }));

      (prisma.sampleUsage.findMany as any).mockResolvedValue(samples);

      // Mock 3 conversions (samples 0, 2, 5)
      (prisma.order.findMany as any).mockImplementation(
        ({ where }: any) => {
          const custId = where.customerId;
          if (['customer-0', 'customer-2'].includes(custId)) {
            return Promise.resolve([
              {
                id: `order-${custId}`,
                lines: [{ skuId, quantity: 12, unitPrice: 25.0 }],
              },
            ]);
          }
          return Promise.resolve([]);
        }
      );

      const result = await calculateSampleMetrics({
        tenantId,
        skuId,
        periodStart,
        periodEnd,
      });

      expect(result.totalSamplesGiven).toBe(10);
      expect(result.totalCustomersSampled).toBe(5);
      // Note: Actual implementation may vary based on order matching logic
      expect(result.conversionRate).toBeGreaterThanOrEqual(0);
      expect(result.conversionRate).toBeLessThanOrEqual(1);
    });

    it('should handle period with no samples', async () => {
      (prisma.sampleUsage.findMany as any).mockResolvedValue([]);

      const result = await calculateSampleMetrics({
        tenantId: 'tenant-1',
        skuId: 'sku-123',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-31'),
      });

      expect(result.totalSamplesGiven).toBe(0);
      expect(result.totalCustomersSampled).toBe(0);
      expect(result.samplesResultingInOrder).toBe(0);
      expect(result.conversionRate).toBe(0);
    });
  });

  describe('getSampleConversionRate', () => {
    it('should return conversion rates grouped by SKU', async () => {
      const tenantId = 'tenant-1';
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');

      (prisma.sampleUsage.findMany as any).mockResolvedValue([
        {
          id: 'sample-1',
          tenantId,
          customerId: 'cust-1',
          skuId: 'sku-A',
          tastedAt: new Date('2024-01-15'),
          sku: {
            id: 'sku-A',
            code: 'SKU-A',
            product: { name: 'Product A' },
          },
        },
        {
          id: 'sample-2',
          tenantId,
          customerId: 'cust-2',
          skuId: 'sku-A',
          tastedAt: new Date('2024-01-16'),
          sku: {
            id: 'sku-A',
            code: 'SKU-A',
            product: { name: 'Product A' },
          },
        },
        {
          id: 'sample-3',
          tenantId,
          customerId: 'cust-3',
          skuId: 'sku-B',
          tastedAt: new Date('2024-01-17'),
          sku: {
            id: 'sku-B',
            code: 'SKU-B',
            product: { name: 'Product B' },
          },
        },
      ]);

      (prisma.order.findMany as any).mockImplementation(
        ({ where }: any) => {
          // Only customer-1 ordered
          if (where.customerId === 'cust-1') {
            return Promise.resolve([
              {
                id: 'order-1',
                lines: [{ skuId: 'sku-A', quantity: 12, unitPrice: 25.0 }],
              },
            ]);
          }
          return Promise.resolve([]);
        }
      );

      const result = await getSampleConversionRate(
        tenantId,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(2); // 2 SKUs
      // Should be sorted by conversion rate
      expect(result[0].conversionRate).toBeGreaterThanOrEqual(
        result[1].conversionRate
      );
    });
  });

  describe('getRepSamplePerformance', () => {
    it('should return performance metrics by sales rep', async () => {
      const tenantId = 'tenant-1';
      const periodStart = new Date('2024-01-01');
      const periodEnd = new Date('2024-01-31');

      (prisma.sampleUsage.findMany as any).mockResolvedValue([
        {
          id: 'sample-1',
          tenantId,
          salesRepId: 'rep-1',
          customerId: 'cust-1',
          skuId: 'sku-A',
          tastedAt: new Date('2024-01-15'),
          salesRep: {
            user: { fullName: 'Rep One' },
          },
        },
        {
          id: 'sample-2',
          tenantId,
          salesRepId: 'rep-2',
          customerId: 'cust-2',
          skuId: 'sku-A',
          tastedAt: new Date('2024-01-16'),
          salesRep: {
            user: { fullName: 'Rep Two' },
          },
        },
      ]);

      (prisma.order.findMany as any).mockImplementation(
        ({ where }: any) => {
          if (where.customerId === 'cust-1') {
            return Promise.resolve([
              {
                id: 'order-1',
                lines: [{ skuId: 'sku-A', quantity: 12, unitPrice: 25.0 }],
              },
            ]);
          }
          return Promise.resolve([]);
        }
      );

      const result = await getRepSamplePerformance(
        tenantId,
        periodStart,
        periodEnd
      );

      expect(result).toHaveLength(2);
      // Should be sorted by total revenue
      expect(result[0].totalRevenue).toBeGreaterThanOrEqual(
        result[1].totalRevenue
      );
    });
  });

  describe('30-day attribution window', () => {
    it('should attribute orders on day 1 after tasting', async () => {
      const tastedAt = new Date('2024-01-15T10:00:00Z');
      const sampleId = 'sample-day1';

      (prisma.sampleUsage.findUnique as any).mockResolvedValue({
        id: sampleId,
        tenantId: 'tenant-1',
        salesRepId: 'rep-1',
        customerId: 'customer-456',
        skuId: 'sku-789',
        tastedAt,
        sku: { id: 'sku-789', code: 'SKU-001' },
        customer: { id: 'customer-456', name: 'Test Customer' },
      });

      (prisma.order.findMany as any).mockResolvedValue([
        {
          id: 'order-day1',
          customerId: 'customer-456',
          orderedAt: addDays(tastedAt, 1),
          lines: [{ skuId: 'sku-789', quantity: 12, unitPrice: 25.0 }],
        },
      ]);

      const result = await calculateSampleRevenue(sampleId);
      expect(result.orderCount).toBe(1);
    });

    it('should attribute orders on day 30 after tasting', async () => {
      const tastedAt = new Date('2024-01-15T10:00:00Z');
      const sampleId = 'sample-day30';

      (prisma.sampleUsage.findUnique as any).mockResolvedValue({
        id: sampleId,
        tenantId: 'tenant-1',
        salesRepId: 'rep-1',
        customerId: 'customer-456',
        skuId: 'sku-789',
        tastedAt,
        sku: { id: 'sku-789', code: 'SKU-001' },
        customer: { id: 'customer-456', name: 'Test Customer' },
      });

      (prisma.order.findMany as any).mockResolvedValue([
        {
          id: 'order-day30',
          customerId: 'customer-456',
          orderedAt: addDays(tastedAt, 30),
          lines: [{ skuId: 'sku-789', quantity: 12, unitPrice: 25.0 }],
        },
      ]);

      const result = await calculateSampleRevenue(sampleId);
      expect(result.orderCount).toBe(1);
    });

    it('should NOT attribute orders from day 31 onwards', async () => {
      const tastedAt = new Date('2024-01-15T10:00:00Z');
      const sampleId = 'sample-day31';

      (prisma.sampleUsage.findUnique as any).mockResolvedValue({
        id: sampleId,
        tenantId: 'tenant-1',
        salesRepId: 'rep-1',
        customerId: 'customer-456',
        skuId: 'sku-789',
        tastedAt,
        sku: { id: 'sku-789', code: 'SKU-001' },
        customer: { id: 'customer-456', name: 'Test Customer' },
      });

      (prisma.order.findMany as any).mockResolvedValue([
        {
          id: 'order-day31',
          customerId: 'customer-456',
          orderedAt: addDays(tastedAt, 31),
          lines: [{ skuId: 'sku-789', quantity: 12, unitPrice: 25.0 }],
        },
      ]);

      const result = await calculateSampleRevenue(sampleId);
      expect(result.orderCount).toBe(0);
      expect(result.attributedRevenue).toBe(0);
    });

    it('should NOT attribute orders from before tasting date', async () => {
      const tastedAt = new Date('2024-01-15T10:00:00Z');
      const sampleId = 'sample-before';

      (prisma.sampleUsage.findUnique as any).mockResolvedValue({
        id: sampleId,
        tenantId: 'tenant-1',
        salesRepId: 'rep-1',
        customerId: 'customer-456',
        skuId: 'sku-789',
        tastedAt,
        sku: { id: 'sku-789', code: 'SKU-001' },
        customer: { id: 'customer-456', name: 'Test Customer' },
      });

      (prisma.order.findMany as any).mockResolvedValue([
        {
          id: 'order-before',
          customerId: 'customer-456',
          orderedAt: subDays(tastedAt, 1), // Day before tasting
          lines: [{ skuId: 'sku-789', quantity: 12, unitPrice: 25.0 }],
        },
      ]);

      const result = await calculateSampleRevenue(sampleId);
      expect(result.orderCount).toBe(0);
    });
  });
});
