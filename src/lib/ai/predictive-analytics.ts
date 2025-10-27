/**
 * Predictive Analytics Engine
 *
 * Uses machine learning techniques to predict customer behavior:
 * - Next order date prediction with confidence intervals
 * - Order volume forecasting
 * - Customer lifetime value estimation
 * - Churn risk prediction
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OrderPrediction {
  customerId: string;
  nextExpectedOrderDate: Date | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceScore: number; // 0-100
  predictionMethod: string;
  factors: {
    historicalPattern: string;
    seasonalityFactor: number;
    trendDirection: 'increasing' | 'stable' | 'decreasing';
    recentActivityWeight: number;
  };
}

export interface CustomerInsights {
  customerId: string;
  lifetimeValue: number;
  averageOrderValue: number;
  orderFrequency: number; // orders per month
  churnRisk: 'low' | 'medium' | 'high';
  growthTrend: 'growing' | 'stable' | 'declining';
  recommendations: string[];
}

/**
 * Calculate moving average for time series data
 */
function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const subset = values.slice(start, i + 1);
    const avg = subset.reduce((sum, val) => sum + val, 0) / subset.length;
    result.push(avg);
  }
  return result;
}

/**
 * Calculate exponential moving average (gives more weight to recent data)
 */
function exponentialMovingAverage(values: number[], alpha: number = 0.3): number[] {
  const result: number[] = [];
  let ema = values[0];

  for (let i = 0; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
    result.push(ema);
  }

  return result;
}

/**
 * Detect seasonality in order patterns
 */
function detectSeasonality(orders: Array<{ orderedAt: Date }>) {
  const monthCounts = new Array(12).fill(0);
  const dayOfWeekCounts = new Array(7).fill(0);

  orders.forEach(order => {
    if (order.orderedAt) {
      monthCounts[order.orderedAt.getMonth()]++;
      dayOfWeekCounts[order.orderedAt.getDay()]++;
    }
  });

  // Find peak months and days
  const peakMonth = monthCounts.indexOf(Math.max(...monthCounts));
  const peakDayOfWeek = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));

  // Calculate seasonality strength (coefficient of variation)
  const avgMonthCount = monthCounts.reduce((a, b) => a + b, 0) / 12;
  const variance = monthCounts.reduce((sum, count) => sum + Math.pow(count - avgMonthCount, 2), 0) / 12;
  const stdDev = Math.sqrt(variance);
  const seasonalityStrength = avgMonthCount > 0 ? (stdDev / avgMonthCount) : 0;

  return {
    peakMonth,
    peakDayOfWeek,
    seasonalityStrength,
    hasStrongSeasonality: seasonalityStrength > 0.5,
  };
}

/**
 * Calculate trend direction and strength
 */
function calculateTrend(intervals: number[]): {
  direction: 'increasing' | 'stable' | 'decreasing';
  strength: number;
} {
  if (intervals.length < 3) {
    return { direction: 'stable', strength: 0 };
  }

  // Simple linear regression to find trend
  const n = intervals.length;
  const xValues = intervals.map((_, i) => i);
  const yValues = intervals;

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  // Normalize slope relative to average interval
  const avgInterval = sumY / n;
  const normalizedSlope = slope / avgInterval;

  let direction: 'increasing' | 'stable' | 'decreasing';
  if (normalizedSlope > 0.1) direction = 'increasing';
  else if (normalizedSlope < -0.1) direction = 'decreasing';
  else direction = 'stable';

  return {
    direction,
    strength: Math.abs(normalizedSlope),
  };
}

/**
 * Predict next order date using advanced analytics
 */
export async function predictNextOrderDate(
  customerId: string,
  tenantId: string
): Promise<OrderPrediction> {
  // Get customer's order history
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      tenantId,
      status: { in: ['FULFILLED', 'SUBMITTED'] },
      orderedAt: { not: null },
    },
    orderBy: { orderedAt: 'asc' },
    select: {
      orderedAt: true,
      total: true,
    },
  });

  if (orders.length === 0) {
    return {
      customerId,
      nextExpectedOrderDate: null,
      confidenceLevel: 'low',
      confidenceScore: 0,
      predictionMethod: 'no_history',
      factors: {
        historicalPattern: 'no orders',
        seasonalityFactor: 0,
        trendDirection: 'stable',
        recentActivityWeight: 0,
      },
    };
  }

  if (orders.length === 1) {
    // Single order - use industry average (30 days)
    const nextDate = new Date(orders[0].orderedAt!);
    nextDate.setDate(nextDate.getDate() + 30);

    return {
      customerId,
      nextExpectedOrderDate: nextDate,
      confidenceLevel: 'low',
      confidenceScore: 30,
      predictionMethod: 'single_order_default',
      factors: {
        historicalPattern: 'insufficient data',
        seasonalityFactor: 0,
        trendDirection: 'stable',
        recentActivityWeight: 0,
      },
    };
  }

  // Calculate intervals between orders
  const intervals: number[] = [];
  for (let i = 1; i < orders.length; i++) {
    const prevDate = orders[i - 1].orderedAt!;
    const currDate = orders[i].orderedAt!;
    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    intervals.push(daysDiff);
  }

  // Detect seasonality
  const seasonality = detectSeasonality(orders);

  // Calculate trend
  const trend = calculateTrend(intervals);

  // Use exponential moving average for prediction (gives more weight to recent)
  const emaIntervals = exponentialMovingAverage(intervals, 0.4);
  const recentWeightedInterval = emaIntervals[emaIntervals.length - 1];

  // Simple moving average for comparison
  const simpleAvg = intervals.reduce((a, b) => a + b, 0) / intervals.length;

  // Calculate variance for confidence
  const variance = intervals.reduce((sum, val) => sum + Math.pow(val - simpleAvg, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = simpleAvg > 0 ? (stdDev / simpleAvg) : 1;

  // Adjust for seasonality
  let seasonalAdjustment = 1.0;
  if (seasonality.hasStrongSeasonality) {
    const currentMonth = new Date().getMonth();
    const monthsSincePeak = (currentMonth - seasonality.peakMonth + 12) % 12;

    // Orders more frequent near peak month
    if (monthsSincePeak <= 2 || monthsSincePeak >= 10) {
      seasonalAdjustment = 0.9; // Shorter interval
    } else if (monthsSincePeak >= 4 && monthsSincePeak <= 8) {
      seasonalAdjustment = 1.1; // Longer interval
    }
  }

  // Adjust for trend
  let trendAdjustment = 1.0;
  if (trend.direction === 'increasing') {
    trendAdjustment = 1 + (trend.strength * 0.2); // Intervals getting longer
  } else if (trend.direction === 'decreasing') {
    trendAdjustment = 1 - (trend.strength * 0.2); // Intervals getting shorter
  }

  // Final predicted interval
  const predictedInterval = Math.round(
    recentWeightedInterval * seasonalAdjustment * trendAdjustment
  );

  // Calculate next order date
  const lastOrderDate = orders[orders.length - 1].orderedAt!;
  const nextDate = new Date(lastOrderDate);
  nextDate.setDate(nextDate.getDate() + predictedInterval);

  // Determine confidence level
  let confidenceLevel: 'high' | 'medium' | 'low';
  let confidenceScore: number;

  if (orders.length >= 5 && coefficientOfVariation < 0.3) {
    confidenceLevel = 'high';
    confidenceScore = 85;
  } else if (orders.length >= 3 && coefficientOfVariation < 0.5) {
    confidenceLevel = 'medium';
    confidenceScore = 65;
  } else {
    confidenceLevel = 'low';
    confidenceScore = 40;
  }

  // Boost confidence if pattern is very regular
  if (coefficientOfVariation < 0.2) {
    confidenceScore = Math.min(95, confidenceScore + 10);
  }

  // Reduce confidence if trend is changing rapidly
  if (trend.strength > 0.5) {
    confidenceScore = Math.max(30, confidenceScore - 15);
    confidenceLevel = 'medium';
  }

  return {
    customerId,
    nextExpectedOrderDate: nextDate,
    confidenceLevel,
    confidenceScore,
    predictionMethod: 'exponential_moving_average_with_seasonality',
    factors: {
      historicalPattern: `${orders.length} orders, avg ${Math.round(simpleAvg)} days apart`,
      seasonalityFactor: seasonality.seasonalityStrength,
      trendDirection: trend.direction,
      recentActivityWeight: 0.4,
    },
  };
}

/**
 * Generate comprehensive customer insights
 */
export async function generateCustomerInsights(
  customerId: string,
  tenantId: string
): Promise<CustomerInsights> {
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      tenantId,
      status: { in: ['FULFILLED', 'SUBMITTED'] },
      total: { not: null },
    },
    orderBy: { orderedAt: 'asc' },
    select: {
      orderedAt: true,
      total: true,
    },
  });

  if (orders.length === 0) {
    return {
      customerId,
      lifetimeValue: 0,
      averageOrderValue: 0,
      orderFrequency: 0,
      churnRisk: 'high',
      growthTrend: 'stable',
      recommendations: ['No order history - reach out to activate account'],
    };
  }

  // Calculate lifetime value
  const lifetimeValue = orders.reduce((sum, order) => {
    return sum + (Number(order.total) || 0);
  }, 0);

  // Calculate average order value
  const averageOrderValue = lifetimeValue / orders.length;

  // Calculate order frequency (orders per month)
  const firstOrderDate = orders[0].orderedAt!;
  const lastOrderDate = orders[orders.length - 1].orderedAt!;
  const monthsActive = Math.max(
    1,
    (lastOrderDate.getTime() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );
  const orderFrequency = orders.length / monthsActive;

  // Assess churn risk
  const daysSinceLastOrder = Math.floor(
    (Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const prediction = await predictNextOrderDate(customerId, tenantId);
  const expectedInterval = prediction.nextExpectedOrderDate
    ? Math.floor(
        (prediction.nextExpectedOrderDate.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 30;

  let churnRisk: 'low' | 'medium' | 'high';
  if (daysSinceLastOrder < expectedInterval * 0.8) {
    churnRisk = 'low';
  } else if (daysSinceLastOrder < expectedInterval * 1.5) {
    churnRisk = 'medium';
  } else {
    churnRisk = 'high';
  }

  // Assess growth trend
  let growthTrend: 'growing' | 'stable' | 'declining' = 'stable';

  if (orders.length >= 4) {
    const recentOrders = orders.slice(-4);
    const olderOrders = orders.slice(0, Math.max(1, orders.length - 4));

    const recentAvg = recentOrders.reduce((sum, o) => sum + Number(o.total || 0), 0) / recentOrders.length;
    const olderAvg = olderOrders.reduce((sum, o) => sum + Number(o.total || 0), 0) / olderOrders.length;

    if (recentAvg > olderAvg * 1.15) {
      growthTrend = 'growing';
    } else if (recentAvg < olderAvg * 0.85) {
      growthTrend = 'declining';
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (churnRisk === 'high') {
    recommendations.push('High churn risk - immediate follow-up recommended');
  } else if (churnRisk === 'medium') {
    recommendations.push('Contact soon to maintain relationship');
  }

  if (growthTrend === 'growing') {
    recommendations.push('Growing account - consider upselling opportunities');
  } else if (growthTrend === 'declining') {
    recommendations.push('Declining trend - investigate satisfaction and needs');
  }

  if (orderFrequency > 2) {
    recommendations.push('High-frequency customer - excellent for samples and new products');
  }

  if (averageOrderValue > 1000) {
    recommendations.push('High-value customer - prioritize for personal attention');
  }

  if (prediction.confidenceLevel === 'high') {
    recommendations.push(`Very predictable ordering pattern - next order expected around ${prediction.nextExpectedOrderDate?.toLocaleDateString()}`);
  }

  return {
    customerId,
    lifetimeValue,
    averageOrderValue,
    orderFrequency,
    churnRisk,
    growthTrend,
    recommendations,
  };
}

/**
 * Batch update predictions for all customers
 */
export async function batchUpdatePredictions(
  tenantId: string,
  options?: {
    limitCustomers?: number;
    onlyActive?: boolean;
  }
): Promise<{ updated: number; failed: number }> {
  const { limitCustomers = 1000, onlyActive = true } = options || {};

  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      ...(onlyActive && {
        riskStatus: { not: 'CLOSED' },
      }),
    },
    select: { id: true },
    take: limitCustomers,
  });

  let updated = 0;
  let failed = 0;

  for (const customer of customers) {
    try {
      const prediction = await predictNextOrderDate(customer.id, tenantId);

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          nextExpectedOrderDate: prediction.nextExpectedOrderDate,
        },
      });

      updated++;
    } catch (error) {
      console.error(`Failed to update prediction for customer ${customer.id}:`, error);
      failed++;
    }
  }

  return { updated, failed };
}
