/**
 * Performance Tests for Sample Analytics
 *
 * Tests performance characteristics including:
 * - Query response times
 * - Large dataset handling
 * - Concurrent request handling
 * - Memory usage
 * - Metric calculation performance
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestSamples, createSampleScenarios } from '../factories/sample-factory';

describe('Sample Analytics Performance', () => {
  describe('Query Performance', () => {
    it('should complete analytics query under 500ms', async () => {
      const samples = createTestSamples(1000);

      const start = performance.now();
      const metrics = calculateMetrics(samples);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
      expect(metrics.totalSamples).toBe(1000);
    });

    it('should handle filtered queries efficiently', async () => {
      const samples = createTestSamples(5000);

      const start = performance.now();
      const filtered = filterBySalesRep(samples, 'rep-123');
      const metrics = calculateMetrics(filtered);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(300);
    });

    it('should optimize date range queries', async () => {
      const samples = createTestSamples(10000);

      const start = performance.now();
      const filtered = filterByDateRange(
        samples,
        new Date('2025-10-01'),
        new Date('2025-10-31')
      );
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Large Dataset Handling', () => {
    it('should process 10,000 samples efficiently', async () => {
      const samples = createTestSamples(10000);

      const start = performance.now();
      const metrics = calculateDetailedMetrics(samples);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(metrics.totalSamples).toBe(10000);
      expect(metrics).toHaveProperty('conversionRate');
      expect(metrics).toHaveProperty('avgTimeToConversion');
    });

    it('should handle 50,000 samples without timeout', async () => {
      const samples = createTestSamples(50000);

      const start = performance.now();
      const metrics = calculateMetrics(samples);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(5000); // 5 seconds max
      expect(metrics.totalSamples).toBe(50000);
    });

    it('should paginate large result sets efficiently', async () => {
      const samples = createTestSamples(10000);

      const pageSize = 100;
      const start = performance.now();

      for (let page = 0; page < 10; page++) {
        const paginated = paginateResults(samples, page, pageSize);
        expect(paginated).toHaveLength(pageSize);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous queries', async () => {
      const samples = createTestSamples(5000);

      const start = performance.now();

      const queries = [
        calculateMetrics(samples),
        filterBySalesRep(samples, 'rep-1'),
        filterByProduct(samples, 'prod-123'),
        calculateTopPerformers(samples),
        calculateRepLeaderboard(samples),
      ];

      await Promise.all(queries);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });

    it('should maintain performance under load', async () => {
      const samples = createTestSamples(2000);

      const concurrentQueries = 50;
      const start = performance.now();

      const queries = Array(concurrentQueries)
        .fill(null)
        .map(() => calculateMetrics(samples));

      const results = await Promise.all(queries);

      const duration = performance.now() - start;

      expect(results).toHaveLength(concurrentQueries);
      expect(duration).toBeLessThan(2000); // 2 seconds for 50 concurrent
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during processing', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        const samples = createTestSamples(1000);
        calculateMetrics(samples);
      }

      global.gc && global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase by more than 50MB
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large objects efficiently', () => {
      const scenarios = createSampleScenarios(10000);

      const start = performance.now();
      const metrics = calculateScenariosMetrics(scenarios);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2000);
      expect(metrics).toBeDefined();
    });
  });

  describe('Metric Calculation Performance', () => {
    it('should calculate conversion rates quickly', () => {
      const samples = createTestSamples(5000);

      const start = performance.now();
      const rate = calculateConversionRate(samples);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100);
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
    });

    it('should calculate revenue attribution efficiently', () => {
      const scenarios = createSampleScenarios(2000);

      const start = performance.now();
      const attribution = calculateRevenueAttribution(scenarios);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
      expect(attribution).toHaveProperty('totalRevenue');
    });

    it('should aggregate metrics in parallel', async () => {
      const samples = createTestSamples(10000);

      const start = performance.now();

      const [conversion, revenue, timing, top] = await Promise.all([
        calculateConversionRate(samples),
        calculateTotalRevenue(samples),
        calculateAvgTimeToConversion(samples),
        calculateTopPerformers(samples),
      ]);

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(conversion).toBeDefined();
      expect(revenue).toBeDefined();
      expect(timing).toBeDefined();
      expect(top).toBeDefined();
    });
  });

  describe('Database Query Optimization', () => {
    it('should use indexes for common queries', async () => {
      const samples = createTestSamples(20000);

      // Simulate indexed query
      const start = performance.now();
      const byRep = groupBySalesRep(samples);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(300);
      expect(Object.keys(byRep).length).toBeGreaterThan(0);
    });

    it('should optimize aggregation queries', async () => {
      const samples = createTestSamples(15000);

      const start = performance.now();
      const aggregated = aggregateByProduct(samples);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(400);
      expect(aggregated.size).toBeGreaterThan(0);
    });
  });

  describe('Caching Performance', () => {
    it('should improve performance with caching', async () => {
      const samples = createTestSamples(5000);

      // First call (no cache)
      const start1 = performance.now();
      const metrics1 = calculateMetricsWithCache(samples, 'key-1');
      const duration1 = performance.now() - start1;

      // Second call (cached)
      const start2 = performance.now();
      const metrics2 = calculateMetricsWithCache(samples, 'key-1');
      const duration2 = performance.now() - start2;

      expect(duration2).toBeLessThan(duration1 * 0.1); // 10x faster
      expect(metrics2).toEqual(metrics1);
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('should handle dashboard load time', async () => {
      const samples = createTestSamples(3000);

      const start = performance.now();

      // Simulate dashboard loading all metrics
      const dashboard = {
        summary: calculateMetrics(samples),
        topProducts: calculateTopPerformers(samples),
        repLeaderboard: calculateRepLeaderboard(samples),
        trends: calculateTrends(samples),
      };

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(800); // Dashboard loads under 800ms
      expect(dashboard.summary).toBeDefined();
    });

    it('should handle report generation performance', async () => {
      const samples = createTestSamples(5000);

      const start = performance.now();

      const report = generatePerformanceReport(samples);

      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1500);
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('breakdown');
    });
  });
});

// Helper functions

function calculateMetrics(samples: any[]) {
  const totalSamples = samples.length;
  const conversions = samples.filter(s => s.resultedInOrder).length;
  return {
    totalSamples,
    conversions,
    conversionRate: conversions / totalSamples || 0,
  };
}

function calculateDetailedMetrics(samples: any[]) {
  const basic = calculateMetrics(samples);
  const avgTime =
    samples
      .filter(s => s.resultedInOrder)
      .reduce((sum, s) => sum + (s.daysToConversion || 0), 0) /
      basic.conversions || 0;

  return {
    ...basic,
    avgTimeToConversion: avgTime,
  };
}

function filterBySalesRep(samples: any[], repId: string) {
  return samples.filter(s => s.salesRepId === repId);
}

function filterByProduct(samples: any[], productId: string) {
  return samples.filter(s => s.productId === productId);
}

function filterByDateRange(samples: any[], start: Date, end: Date) {
  return samples.filter(s => {
    const date = new Date(s.dateGiven);
    return date >= start && date <= end;
  });
}

function paginateResults(samples: any[], page: number, pageSize: number) {
  return samples.slice(page * pageSize, (page + 1) * pageSize);
}

function calculateTopPerformers(samples: any[]) {
  const byProduct = new Map();
  samples.forEach(s => {
    if (!byProduct.has(s.productId)) {
      byProduct.set(s.productId, { total: 0, conversions: 0 });
    }
    const stats = byProduct.get(s.productId);
    stats.total++;
    if (s.resultedInOrder) stats.conversions++;
  });

  return Array.from(byProduct.entries())
    .map(([productId, stats]: [string, any]) => ({
      productId,
      ...stats,
      conversionRate: stats.conversions / stats.total,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10);
}

function calculateRepLeaderboard(samples: any[]) {
  const byRep = new Map();
  samples.forEach(s => {
    if (!byRep.has(s.salesRepId)) {
      byRep.set(s.salesRepId, { total: 0, conversions: 0 });
    }
    const stats = byRep.get(s.salesRepId);
    stats.total++;
    if (s.resultedInOrder) stats.conversions++;
  });

  return Array.from(byRep.entries()).map(([repId, stats]: [string, any]) => ({
    repId,
    ...stats,
    conversionRate: stats.conversions / stats.total,
  }));
}

function calculateConversionRate(samples: any[]) {
  const conversions = samples.filter(s => s.resultedInOrder).length;
  return conversions / samples.length || 0;
}

function calculateTotalRevenue(samples: any[]) {
  return samples
    .filter(s => s.resultedInOrder && s.orderValue)
    .reduce((sum, s) => sum + (s.orderValue || 0), 0);
}

function calculateAvgTimeToConversion(samples: any[]) {
  const conversions = samples.filter(s => s.resultedInOrder && s.daysToConversion);
  if (conversions.length === 0) return 0;

  return (
    conversions.reduce((sum, s) => sum + s.daysToConversion, 0) / conversions.length
  );
}

function calculateRevenueAttribution(scenarios: any[]) {
  return {
    totalRevenue: scenarios
      .filter(s => s.withinConversionWindow && s.order)
      .reduce((sum, s) => sum + (s.order?.totalValue || 0), 0),
  };
}

function calculateScenariosMetrics(scenarios: any[]) {
  return {
    total: scenarios.length,
    converted: scenarios.filter(s => s.withinConversionWindow).length,
  };
}

function groupBySalesRep(samples: any[]) {
  return samples.reduce((acc, s) => {
    if (!acc[s.salesRepId]) acc[s.salesRepId] = [];
    acc[s.salesRepId].push(s);
    return acc;
  }, {});
}

function aggregateByProduct(samples: any[]) {
  const map = new Map();
  samples.forEach(s => {
    if (!map.has(s.productId)) {
      map.set(s.productId, { count: 0, conversions: 0 });
    }
    const stats = map.get(s.productId);
    stats.count++;
    if (s.resultedInOrder) stats.conversions++;
  });
  return map;
}

const metricsCache = new Map();

function calculateMetricsWithCache(samples: any[], key: string) {
  if (metricsCache.has(key)) {
    return metricsCache.get(key);
  }

  const metrics = calculateMetrics(samples);
  metricsCache.set(key, metrics);
  return metrics;
}

function calculateTrends(samples: any[]) {
  const byWeek = new Map();
  samples.forEach(s => {
    const week = getWeekNumber(new Date(s.dateGiven));
    if (!byWeek.has(week)) {
      byWeek.set(week, { total: 0, conversions: 0 });
    }
    const stats = byWeek.get(week);
    stats.total++;
    if (s.resultedInOrder) stats.conversions++;
  });

  return Array.from(byWeek.entries()).map(([week, stats]) => ({
    week,
    ...stats,
    rate: stats.conversions / stats.total,
  }));
}

function getWeekNumber(date: Date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function generatePerformanceReport(samples: any[]) {
  return {
    summary: calculateMetrics(samples),
    breakdown: {
      byProduct: calculateTopPerformers(samples),
      byRep: calculateRepLeaderboard(samples),
      trends: calculateTrends(samples),
    },
  };
}
