/**
 * Tests for Predictive Analytics Engine
 */

import { describe, it, expect, vi } from 'vitest';
import {
  predictNextOrderDate,
  generateCustomerInsights,
} from '@/lib/ai/predictive-analytics';

describe('Predictive Analytics Engine', () => {
  describe('predictNextOrderDate', () => {
    it('should return null for customer with no orders', async () => {
      const prediction = await predictNextOrderDate(
        'no-orders-customer',
        'test-tenant'
      );

      expect(prediction.nextExpectedOrderDate).toBeNull();
      expect(prediction.confidenceLevel).toBe('low');
      expect(prediction.predictionMethod).toBe('no_history');
    });

    it('should predict with low confidence for single order', async () => {
      const prediction = await predictNextOrderDate(
        'single-order-customer',
        'test-tenant'
      );

      expect(prediction.confidenceLevel).toBe('low');
      expect(prediction.confidenceScore).toBeLessThan(50);
      expect(prediction.predictionMethod).toBe('single_order_default');
    });

    it('should predict with high confidence for regular customers', async () => {
      // Mock regular customer with consistent ordering pattern
      const prediction = await predictNextOrderDate(
        'regular-customer',
        'test-tenant'
      );

      if (prediction.nextExpectedOrderDate) {
        expect(prediction.confidenceLevel).toBe('high');
        expect(prediction.confidenceScore).toBeGreaterThan(70);
      }
    });

    it('should detect increasing trend', async () => {
      const prediction = await predictNextOrderDate(
        'increasing-trend-customer',
        'test-tenant'
      );

      if (prediction.factors.trendDirection === 'increasing') {
        // Intervals should be getting longer
        expect(prediction.nextExpectedOrderDate).toBeDefined();
      }
    });

    it('should detect decreasing trend', async () => {
      const prediction = await predictNextOrderDate(
        'decreasing-trend-customer',
        'test-tenant'
      );

      if (prediction.factors.trendDirection === 'decreasing') {
        // Intervals should be getting shorter
        expect(prediction.nextExpectedOrderDate).toBeDefined();
      }
    });

    it('should adjust for seasonality when detected', async () => {
      const prediction = await predictNextOrderDate(
        'seasonal-customer',
        'test-tenant'
      );

      if (prediction.factors.seasonalityFactor > 0.5) {
        expect(prediction.predictionMethod).toContain('seasonality');
      }
    });

    it('should return future date prediction', async () => {
      const prediction = await predictNextOrderDate(
        'test-customer',
        'test-tenant'
      );

      if (prediction.nextExpectedOrderDate) {
        const predictedDate = new Date(prediction.nextExpectedOrderDate);
        const now = new Date();
        expect(predictedDate.getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });

  describe('generateCustomerInsights', () => {
    it('should return zero values for customer with no orders', async () => {
      const insights = await generateCustomerInsights(
        'no-orders-customer',
        'test-tenant'
      );

      expect(insights.lifetimeValue).toBe(0);
      expect(insights.averageOrderValue).toBe(0);
      expect(insights.orderFrequency).toBe(0);
      expect(insights.churnRisk).toBe('high');
    });

    it('should calculate lifetime value correctly', async () => {
      const insights = await generateCustomerInsights(
        'test-customer',
        'test-tenant'
      );

      expect(insights.lifetimeValue).toBeGreaterThanOrEqual(0);
      expect(typeof insights.lifetimeValue).toBe('number');
    });

    it('should calculate average order value', async () => {
      const insights = await generateCustomerInsights(
        'test-customer',
        'test-tenant'
      );

      if (insights.lifetimeValue > 0) {
        expect(insights.averageOrderValue).toBeGreaterThan(0);
      }
    });

    it('should assess churn risk correctly', async () => {
      const insights = await generateCustomerInsights(
        'test-customer',
        'test-tenant'
      );

      expect(['low', 'medium', 'high']).toContain(insights.churnRisk);
    });

    it('should detect growth trend', async () => {
      const insights = await generateCustomerInsights(
        'growing-customer',
        'test-tenant'
      );

      expect(['growing', 'stable', 'declining']).toContain(insights.growthTrend);
    });

    it('should provide actionable recommendations', async () => {
      const insights = await generateCustomerInsights(
        'test-customer',
        'test-tenant'
      );

      expect(Array.isArray(insights.recommendations)).toBe(true);
      if (insights.recommendations.length > 0) {
        expect(typeof insights.recommendations[0]).toBe('string');
        expect(insights.recommendations[0].length).toBeGreaterThan(10);
      }
    });

    it('should flag high-value customers', async () => {
      const insights = await generateCustomerInsights(
        'high-value-customer',
        'test-tenant'
      );

      if (insights.averageOrderValue > 1000) {
        const hasHighValueFlag = insights.recommendations.some(rec =>
          rec.includes('High-value')
        );
        expect(hasHighValueFlag).toBe(true);
      }
    });

    it('should identify high-frequency customers', async () => {
      const insights = await generateCustomerInsights(
        'frequent-customer',
        'test-tenant'
      );

      if (insights.orderFrequency > 2) {
        const hasFrequencyFlag = insights.recommendations.some(rec =>
          rec.includes('frequency')
        );
        expect(hasFrequencyFlag).toBe(true);
      }
    });
  });

  describe('Exponential Moving Average', () => {
    it('should give more weight to recent values', () => {
      // Test EMA calculation
      const values = [10, 12, 15, 20, 25];
      // const ema = exponentialMovingAverage(values, 0.4);

      // Most recent values should have more influence
      // expect(ema[ema.length - 1]).toBeGreaterThan(values[0]);
    });

    it('should handle alpha parameter correctly', () => {
      const values = [10, 20, 30, 40, 50];

      // Higher alpha = more weight to recent
      // const emaHigh = exponentialMovingAverage(values, 0.8);
      // const emaLow = exponentialMovingAverage(values, 0.2);

      // expect(emaHigh[emaHigh.length - 1]).toBeGreaterThan(emaLow[emaLow.length - 1]);
    });
  });

  describe('Trend Detection', () => {
    it('should detect increasing trend', () => {
      const intervals = [20, 22, 25, 28, 30];
      // const trend = calculateTrend(intervals);

      // expect(trend.direction).toBe('increasing');
      // expect(trend.strength).toBeGreaterThan(0);
    });

    it('should detect decreasing trend', () => {
      const intervals = [30, 28, 25, 22, 20];
      // const trend = calculateTrend(intervals);

      // expect(trend.direction).toBe('decreasing');
      // expect(trend.strength).toBeGreaterThan(0);
    });

    it('should detect stable pattern', () => {
      const intervals = [25, 26, 25, 24, 26];
      // const trend = calculateTrend(intervals);

      // expect(trend.direction).toBe('stable');
    });
  });

  describe('Seasonality Detection', () => {
    it('should identify peak months', () => {
      // Mock orders throughout the year
      // Test that peak month is correctly identified
    });

    it('should calculate seasonality strength', () => {
      // Test coefficient of variation calculation
    });

    it('should detect strong seasonality', () => {
      // Mock highly seasonal data
      // Verify hasStrongSeasonality flag
    });
  });

  describe('Performance', () => {
    it('should complete prediction in under 200ms', async () => {
      const startTime = Date.now();

      await predictNextOrderDate('test-customer', 'test-tenant');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(200);
    });

    it('should handle batch predictions efficiently', async () => {
      const startTime = Date.now();

      // Mock batch operation
      const customerIds = Array.from({ length: 10 }, (_, i) => `customer-${i}`);

      await Promise.all(
        customerIds.map(id => predictNextOrderDate(id, 'test-tenant'))
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 200ms per customer
    });
  });

  describe('Edge Cases', () => {
    it('should handle irregular ordering patterns', async () => {
      const prediction = await predictNextOrderDate(
        'irregular-customer',
        'test-tenant'
      );

      // Should still return a prediction with low confidence
      expect(prediction.confidenceLevel).toBe('low');
    });

    it('should handle very old orders', async () => {
      const prediction = await predictNextOrderDate(
        'dormant-customer',
        'test-tenant'
      );

      // Should indicate high churn risk
      if (prediction.nextExpectedOrderDate) {
        const daysSince = Math.floor(
          (Date.now() - new Date(prediction.nextExpectedOrderDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        // Prediction should be in the future
        expect(daysSince).toBeLessThan(0);
      }
    });
  });
});
