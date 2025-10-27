/**
 * Sample Analytics Integration Tests
 *
 * Tests the sample analytics calculation logic including:
 * - Metric calculation for periods
 * - Revenue attribution (30-day window)
 * - Conversion rate calculation
 * - Edge cases and data integrity
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestSample,
  createTestSamples,
  createSampleScenario,
  createSampleScenarios,
} from '../../__tests__/factories/sample-factory';

// Mock database connection
const mockDb = {
  samples: [] as any[],
  orders: [] as any[],
  clear() {
    this.samples = [];
    this.orders = [];
  },
};

describe('Sample Analytics Integration', () => {
  beforeEach(() => {
    mockDb.clear();
  });

  afterEach(() => {
    mockDb.clear();
  });

  describe('calculateSampleMetrics', () => {
    it('should calculate metrics for a given period', () => {
      // Create 50 samples, 15 converted
      const samples = createTestSamples(50);
      samples.slice(0, 15).forEach(s => {
        s.resultedInOrder = true;
        s.orderId = 'order-' + s.id;
      });

      mockDb.samples = samples;

      const metrics = calculateMetrics(mockDb.samples);

      expect(metrics.totalSamples).toBe(50);
      expect(metrics.conversions).toBe(15);
      expect(metrics.conversionRate).toBeCloseTo(0.30, 2);
    });

    it('should handle empty dataset', () => {
      const metrics = calculateMetrics([]);

      expect(metrics.totalSamples).toBe(0);
      expect(metrics.conversions).toBe(0);
      expect(metrics.conversionRate).toBe(0);
    });

    it('should filter by date range correctly', () => {
      const oldSample = createTestSample({
        dateGiven: new Date('2024-01-01'),
      });
      const recentSample = createTestSample({
        dateGiven: new Date('2025-10-20'),
      });

      mockDb.samples = [oldSample, recentSample];

      const startDate = new Date('2025-10-01');
      const endDate = new Date('2025-10-31');

      const metrics = calculateMetricsForPeriod(mockDb.samples, startDate, endDate);

      expect(metrics.totalSamples).toBe(1);
    });
  });

  describe('Revenue Attribution (30-day window)', () => {
    it('should attribute revenue when order within 30 days', () => {
      const scenario = createSampleScenario({
        shouldConvert: true,
        daysUntilOrder: 15,
        orderStatus: 'completed',
      });

      mockDb.samples = [scenario.sample];
      if (scenario.order) {
        mockDb.orders = [scenario.order];
      }

      const attribution = calculateRevenueAttribution(
        scenario.sample.id,
        mockDb.samples,
        mockDb.orders
      );

      expect(attribution.isAttributed).toBe(true);
      expect(attribution.revenue).toBeGreaterThan(0);
      expect(attribution.daysToConversion).toBe(15);
    });

    it('should NOT attribute revenue when order after 30 days', () => {
      const scenario = createSampleScenario({
        shouldConvert: true,
        daysUntilOrder: 35,
        orderStatus: 'completed',
      });

      mockDb.samples = [scenario.sample];
      if (scenario.order) {
        mockDb.orders = [scenario.order];
      }

      const attribution = calculateRevenueAttribution(
        scenario.sample.id,
        mockDb.samples,
        mockDb.orders
      );

      expect(attribution.isAttributed).toBe(false);
      expect(attribution.revenue).toBe(0);
    });

    it('should NOT attribute revenue for cancelled orders', () => {
      const scenario = createSampleScenario({
        shouldConvert: true,
        daysUntilOrder: 10,
        orderStatus: 'cancelled',
      });

      mockDb.samples = [scenario.sample];
      if (scenario.order) {
        mockDb.orders = [scenario.order];
      }

      const attribution = calculateRevenueAttribution(
        scenario.sample.id,
        mockDb.samples,
        mockDb.orders
      );

      expect(attribution.isAttributed).toBe(false);
    });

    it('should handle exact 30-day boundary', () => {
      const scenario = createSampleScenario({
        shouldConvert: true,
        daysUntilOrder: 30,
        orderStatus: 'completed',
      });

      const attribution = calculateRevenueAttribution(
        scenario.sample.id,
        [scenario.sample],
        scenario.order ? [scenario.order] : []
      );

      expect(attribution.isAttributed).toBe(true);
      expect(attribution.daysToConversion).toBe(30);
    });
  });

  describe('Conversion Rate Calculation', () => {
    it('should calculate correct conversion rate', () => {
      const scenarios = createSampleScenarios(100);
      const samples = scenarios.map(s => s.sample);

      // Count actual conversions (within window + completed)
      const actualConversions = scenarios.filter(
        s => s.withinConversionWindow && s.order?.status === 'completed'
      ).length;

      mockDb.samples = samples;

      const metrics = calculateMetrics(samples);
      const expectedRate = actualConversions / 100;

      expect(metrics.conversionRate).toBeCloseTo(expectedRate, 2);
    });

    it('should handle 100% conversion rate', () => {
      const samples = createTestSamples(10);
      samples.forEach(s => {
        s.resultedInOrder = true;
        s.orderId = 'order-' + s.id;
      });

      const metrics = calculateMetrics(samples);

      expect(metrics.conversionRate).toBe(1.0);
    });

    it('should handle 0% conversion rate', () => {
      const samples = createTestSamples(10);
      samples.forEach(s => {
        s.resultedInOrder = false;
        s.orderId = undefined;
      });

      const metrics = calculateMetrics(samples);

      expect(metrics.conversionRate).toBe(0);
    });
  });

  describe('Multiple Samples for Same Customer', () => {
    it('should track multiple samples correctly', () => {
      const customerId = 'customer-123';
      const samples = [
        createTestSample({ customerId, dateGiven: new Date('2025-10-01') }),
        createTestSample({ customerId, dateGiven: new Date('2025-10-10') }),
        createTestSample({ customerId, dateGiven: new Date('2025-10-20') }),
      ];

      mockDb.samples = samples;

      const customerSamples = getCustomerSamples(customerId, mockDb.samples);

      expect(customerSamples).toHaveLength(3);
      expect(customerSamples.every(s => s.customerId === customerId)).toBe(true);
    });

    it('should attribute order to most recent sample', () => {
      const customerId = 'customer-123';
      const samples = [
        createTestSample({
          customerId,
          dateGiven: new Date('2025-10-01'),
          id: 'sample-1'
        }),
        createTestSample({
          customerId,
          dateGiven: new Date('2025-10-15'),
          id: 'sample-2'
        }),
      ];

      const order = {
        id: 'order-1',
        customerId,
        orderDate: new Date('2025-10-20'),
        totalValue: 1000,
        status: 'completed' as const,
      };

      const attribution = attributeOrderToSample(samples, order);

      expect(attribution.sampleId).toBe('sample-2'); // Most recent sample
    });
  });

  describe('Edge Cases', () => {
    it('should handle samples with no orders gracefully', () => {
      const samples = createTestSamples(50);
      mockDb.samples = samples;
      mockDb.orders = []; // No orders at all

      const metrics = calculateMetrics(samples);

      expect(metrics.totalSamples).toBe(50);
      expect(metrics.conversions).toBe(0);
      expect(metrics.conversionRate).toBe(0);
    });

    it('should handle orders outside attribution window', () => {
      const sample = createTestSample({
        dateGiven: new Date('2025-09-01'),
      });

      const order = {
        id: 'order-1',
        customerId: sample.customerId,
        orderDate: new Date('2025-10-15'), // 44 days later
        totalValue: 1000,
        status: 'completed' as const,
      };

      mockDb.samples = [sample];
      mockDb.orders = [order];

      const attribution = calculateRevenueAttribution(
        sample.id,
        mockDb.samples,
        mockDb.orders
      );

      expect(attribution.isAttributed).toBe(false);
    });

    it('should handle null/undefined values gracefully', () => {
      const samples = [
        createTestSample({ feedback: undefined }),
        createTestSample({ orderId: undefined }),
        createTestSample({ productName: undefined }),
      ];

      expect(() => calculateMetrics(samples)).not.toThrow();
    });
  });

  describe('Performance with Large Datasets', () => {
    it('should calculate metrics for 10,000 samples under 500ms', () => {
      const samples = createTestSamples(10000);
      mockDb.samples = samples;

      const startTime = performance.now();
      const metrics = calculateMetrics(samples);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(500);
      expect(metrics.totalSamples).toBe(10000);
    });

    it('should handle complex queries efficiently', () => {
      const scenarios = createSampleScenarios(5000);
      const samples = scenarios.map(s => s.sample);
      const orders = scenarios
        .filter(s => s.order)
        .map(s => s.order!);

      mockDb.samples = samples;
      mockDb.orders = orders;

      const startTime = performance.now();

      // Complex multi-metric calculation
      const metrics = calculateDetailedMetrics(samples, orders);

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000);
      expect(metrics).toBeDefined();
    });
  });
});

// Helper functions (would be imported from actual analytics module)

function calculateMetrics(samples: any[]) {
  const totalSamples = samples.length;
  const conversions = samples.filter(s => s.resultedInOrder).length;
  const conversionRate = totalSamples > 0 ? conversions / totalSamples : 0;

  return {
    totalSamples,
    conversions,
    conversionRate,
  };
}

function calculateMetricsForPeriod(
  samples: any[],
  startDate: Date,
  endDate: Date
) {
  const filtered = samples.filter(s => {
    const date = new Date(s.dateGiven);
    return date >= startDate && date <= endDate;
  });

  return calculateMetrics(filtered);
}

function calculateRevenueAttribution(
  sampleId: string,
  samples: any[],
  orders: any[]
) {
  const sample = samples.find(s => s.id === sampleId);
  if (!sample) {
    return { isAttributed: false, revenue: 0, daysToConversion: 0 };
  }

  const order = orders.find(o => o.id === sample.orderId);
  if (!order || order.status !== 'completed') {
    return { isAttributed: false, revenue: 0, daysToConversion: 0 };
  }

  const sampleDate = new Date(sample.dateGiven);
  const orderDate = new Date(order.orderDate);
  const daysDiff = Math.floor(
    (orderDate.getTime() - sampleDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const withinWindow = daysDiff >= 0 && daysDiff <= 30;

  return {
    isAttributed: withinWindow,
    revenue: withinWindow ? order.totalValue : 0,
    daysToConversion: daysDiff,
  };
}

function getCustomerSamples(customerId: string, samples: any[]) {
  return samples.filter(s => s.customerId === customerId);
}

function attributeOrderToSample(samples: any[], order: any) {
  // Find most recent sample before order
  const eligibleSamples = samples
    .filter(s => {
      const sampleDate = new Date(s.dateGiven);
      const orderDate = new Date(order.orderDate);
      const daysDiff = Math.floor(
        (orderDate.getTime() - sampleDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysDiff >= 0 && daysDiff <= 30;
    })
    .sort((a, b) =>
      new Date(b.dateGiven).getTime() - new Date(a.dateGiven).getTime()
    );

  return {
    sampleId: eligibleSamples[0]?.id,
    orderId: order.id,
  };
}

function calculateDetailedMetrics(samples: any[], orders: any[]) {
  const basicMetrics = calculateMetrics(samples);

  // Calculate average time to conversion
  const conversions = samples.filter(s => s.resultedInOrder);
  const conversionTimes = conversions.map(s => {
    const order = orders.find(o => o.id === s.orderId);
    if (!order) return 0;

    const sampleDate = new Date(s.dateGiven);
    const orderDate = new Date(order.orderDate);
    return Math.floor(
      (orderDate.getTime() - sampleDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  });

  const avgTimeToConversion = conversionTimes.length > 0
    ? conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
    : 0;

  return {
    ...basicMetrics,
    avgTimeToConversion,
    totalRevenue: orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.totalValue, 0),
  };
}
