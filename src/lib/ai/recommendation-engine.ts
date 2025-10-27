/**
 * Product Recommendation Engine
 *
 * Implements collaborative filtering and product affinity analysis
 * to generate personalized product recommendations for customers.
 *
 * Features:
 * - Customer purchase history analysis
 * - Collaborative filtering (user-based and item-based)
 * - Product affinity (frequently bought together)
 * - Seasonal trend analysis
 * - Confidence scoring
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProductRecommendation {
  skuId: string;
  skuCode: string;
  productName: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  reason: string;
  reasonDetails?: {
    similarCustomers?: number;
    coOccurrenceRate?: number;
    seasonalTrend?: string;
  };
}

export interface RecommendationOptions {
  customerId: string;
  tenantId: string;
  limit?: number;
  includeReasons?: boolean;
  excludeSkuIds?: string[];
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Get customer purchase vector for collaborative filtering
 */
async function getCustomerPurchaseVector(customerId: string, tenantId: string, allSkuIds: string[]) {
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      tenantId,
      status: { in: ['FULFILLED', 'SUBMITTED'] },
    },
    include: {
      lines: {
        include: {
          sku: true,
        },
      },
    },
  });

  const skuQuantities = new Map<string, number>();

  orders.forEach(order => {
    order.lines.forEach(line => {
      const current = skuQuantities.get(line.skuId) || 0;
      skuQuantities.set(line.skuId, current + line.quantity);
    });
  });

  return allSkuIds.map(skuId => skuQuantities.get(skuId) || 0);
}

/**
 * Find similar customers using collaborative filtering
 */
async function findSimilarCustomers(
  customerId: string,
  tenantId: string,
  limit: number = 10
): Promise<Array<{ customerId: string; similarity: number }>> {
  // Get all active customers with orders
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      id: { not: customerId },
      riskStatus: { not: 'CLOSED' },
      orders: {
        some: {
          status: { in: ['FULFILLED', 'SUBMITTED'] },
        },
      },
    },
    select: { id: true },
    take: 100, // Limit for performance
  });

  // Get all SKUs for vector creation
  const allSkus = await prisma.sku.findMany({
    where: { tenantId },
    select: { id: true },
  });
  const allSkuIds = allSkus.map(s => s.id);

  // Get target customer's purchase vector
  const targetVector = await getCustomerPurchaseVector(customerId, tenantId, allSkuIds);

  // Calculate similarity with other customers
  const similarities = await Promise.all(
    customers.map(async (customer) => {
      const vector = await getCustomerPurchaseVector(customer.id, tenantId, allSkuIds);
      const similarity = cosineSimilarity(targetVector, vector);
      return { customerId: customer.id, similarity };
    })
  );

  // Sort by similarity and return top matches
  return similarities
    .filter(s => s.similarity > 0.1) // Minimum similarity threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Get products frequently bought together (product affinity)
 */
async function getProductAffinity(
  skuIds: string[],
  tenantId: string,
  limit: number = 5
): Promise<Array<{ skuId: string; coOccurrenceRate: number; count: number }>> {
  if (skuIds.length === 0) return [];

  // Find orders containing any of the input SKUs
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ['FULFILLED', 'SUBMITTED'] },
      lines: {
        some: {
          skuId: { in: skuIds },
        },
      },
    },
    include: {
      lines: {
        select: { skuId: true },
      },
    },
  });

  // Count co-occurrences
  const coOccurrences = new Map<string, number>();

  orders.forEach(order => {
    const orderSkuIds = order.lines.map(l => l.skuId);
    const hasTargetSku = orderSkuIds.some(id => skuIds.includes(id));

    if (hasTargetSku) {
      orderSkuIds.forEach(skuId => {
        if (!skuIds.includes(skuId)) {
          const current = coOccurrences.get(skuId) || 0;
          coOccurrences.set(skuId, current + 1);
        }
      });
    }
  });

  const totalOrders = orders.length || 1;

  return Array.from(coOccurrences.entries())
    .map(([skuId, count]) => ({
      skuId,
      coOccurrenceRate: count / totalOrders,
      count,
    }))
    .sort((a, b) => b.coOccurrenceRate - a.coOccurrenceRate)
    .slice(0, limit);
}

/**
 * Get seasonal trending products
 */
async function getSeasonalTrends(
  tenantId: string,
  limit: number = 5
): Promise<Array<{ skuId: string; trend: string; score: number }>> {
  const now = new Date();
  const currentMonth = now.getMonth();
  const lastMonthStart = new Date(now.getFullYear(), currentMonth - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), currentMonth, 0);
  const twoMonthsAgoStart = new Date(now.getFullYear(), currentMonth - 2, 1);
  const twoMonthsAgoEnd = new Date(now.getFullYear(), currentMonth - 1, 0);

  // Get orders from last two months
  const [lastMonthOrders, twoMonthsAgoOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        status: { in: ['FULFILLED', 'SUBMITTED'] },
        orderedAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
      include: { lines: { select: { skuId: true, quantity: true } } },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        status: { in: ['FULFILLED', 'SUBMITTED'] },
        orderedAt: {
          gte: twoMonthsAgoStart,
          lte: twoMonthsAgoEnd,
        },
      },
      include: { lines: { select: { skuId: true, quantity: true } } },
    }),
  ]);

  // Calculate quantities per SKU
  const lastMonthQty = new Map<string, number>();
  const twoMonthsAgoQty = new Map<string, number>();

  lastMonthOrders.forEach(order => {
    order.lines.forEach(line => {
      const current = lastMonthQty.get(line.skuId) || 0;
      lastMonthQty.set(line.skuId, current + line.quantity);
    });
  });

  twoMonthsAgoOrders.forEach(order => {
    order.lines.forEach(line => {
      const current = twoMonthsAgoQty.get(line.skuId) || 0;
      twoMonthsAgoQty.set(line.skuId, current + line.quantity);
    });
  });

  // Calculate growth rate
  const trends: Array<{ skuId: string; trend: string; score: number }> = [];

  lastMonthQty.forEach((lastQty, skuId) => {
    const prevQty = twoMonthsAgoQty.get(skuId) || 0;

    if (prevQty > 0) {
      const growthRate = (lastQty - prevQty) / prevQty;

      if (growthRate > 0.2) {
        trends.push({
          skuId,
          trend: 'increasing',
          score: growthRate,
        });
      }
    } else if (lastQty > 0) {
      trends.push({
        skuId,
        trend: 'new_trending',
        score: 1.0,
      });
    }
  });

  return trends
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Main recommendation function - combines multiple algorithms
 */
export async function generateRecommendations(
  options: RecommendationOptions
): Promise<ProductRecommendation[]> {
  const { customerId, tenantId, limit = 10, includeReasons = true, excludeSkuIds = [] } = options;

  // Get customer's purchase history
  const customerOrders = await prisma.order.findMany({
    where: {
      customerId,
      tenantId,
      status: { in: ['FULFILLED', 'SUBMITTED'] },
    },
    include: {
      lines: {
        include: {
          sku: {
            include: {
              product: true,
            },
          },
        },
      },
    },
    orderBy: { orderedAt: 'desc' },
  });

  const purchasedSkuIds = new Set<string>();
  customerOrders.forEach(order => {
    order.lines.forEach(line => {
      purchasedSkuIds.add(line.skuId);
    });
  });

  // 1. Find similar customers
  const similarCustomers = await findSimilarCustomers(customerId, tenantId, 10);

  // 2. Get what similar customers bought (that this customer hasn't)
  const collaborativeRecommendations = new Map<string, { count: number; totalSimilarity: number }>();

  if (similarCustomers.length > 0) {
    const similarCustomerIds = similarCustomers.map(c => c.customerId);

    const similarOrders = await prisma.order.findMany({
      where: {
        customerId: { in: similarCustomerIds },
        tenantId,
        status: { in: ['FULFILLED', 'SUBMITTED'] },
      },
      include: {
        lines: {
          select: { skuId: true },
        },
      },
    });

    similarOrders.forEach(order => {
      const customer = similarCustomers.find(c => c.customerId === order.customerId);
      if (!customer) return;

      order.lines.forEach(line => {
        if (!purchasedSkuIds.has(line.skuId) && !excludeSkuIds.includes(line.skuId)) {
          const current = collaborativeRecommendations.get(line.skuId) || {
            count: 0,
            totalSimilarity: 0,
          };
          collaborativeRecommendations.set(line.skuId, {
            count: current.count + 1,
            totalSimilarity: current.totalSimilarity + customer.similarity,
          });
        }
      });
    });
  }

  // 3. Get product affinity (frequently bought together)
  const affinityRecommendations = await getProductAffinity(
    Array.from(purchasedSkuIds),
    tenantId,
    limit
  );

  // 4. Get seasonal trends
  const seasonalRecommendations = await getSeasonalTrends(tenantId, limit);

  // Combine and score all recommendations
  const scoredRecommendations = new Map<string, {
    score: number;
    reasons: string[];
    details: any;
  }>();

  // Score collaborative filtering results
  collaborativeRecommendations.forEach((data, skuId) => {
    const score = (data.totalSimilarity / similarCustomers.length) * 100;
    scoredRecommendations.set(skuId, {
      score: score * 0.4, // 40% weight
      reasons: [`${data.count} similar customers purchased this`],
      details: { similarCustomers: data.count },
    });
  });

  // Score affinity results
  affinityRecommendations.forEach(({ skuId, coOccurrenceRate, count }) => {
    const current = scoredRecommendations.get(skuId) || { score: 0, reasons: [], details: {} };
    scoredRecommendations.set(skuId, {
      score: current.score + (coOccurrenceRate * 100 * 0.35), // 35% weight
      reasons: [...current.reasons, `Frequently bought with your previous purchases`],
      details: { ...current.details, coOccurrenceRate, affinityCount: count },
    });
  });

  // Score seasonal trends
  seasonalRecommendations.forEach(({ skuId, trend, score: trendScore }) => {
    if (purchasedSkuIds.has(skuId) || excludeSkuIds.includes(skuId)) return;

    const current = scoredRecommendations.get(skuId) || { score: 0, reasons: [], details: {} };
    scoredRecommendations.set(skuId, {
      score: current.score + (trendScore * 25), // 25% weight
      reasons: [...current.reasons, `Trending ${trend === 'new_trending' ? 'new product' : 'up'}`],
      details: { ...current.details, seasonalTrend: trend },
    });
  });

  // Get SKU details and format recommendations
  const topSkuIds = Array.from(scoredRecommendations.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([skuId]) => skuId);

  const skus = await prisma.sku.findMany({
    where: {
      id: { in: topSkuIds },
      tenantId,
      isActive: true,
    },
    include: {
      product: true,
    },
  });

  const recommendations: ProductRecommendation[] = [];

  topSkuIds.forEach(skuId => {
    const sku = skus.find(s => s.id === skuId);
    if (!sku) return;

    const data = scoredRecommendations.get(skuId)!;
    const score = Math.min(100, data.score);

    let confidence: 'high' | 'medium' | 'low';
    if (score >= 70) confidence = 'high';
    else if (score >= 40) confidence = 'medium';
    else confidence = 'low';

    recommendations.push({
      skuId: sku.id,
      skuCode: sku.code,
      productName: sku.product.name,
      confidence,
      score: Math.round(score),
      reason: data.reasons[0] || 'Recommended based on your purchase history',
      ...(includeReasons && { reasonDetails: data.details }),
    });
  });

  return recommendations;
}

/**
 * Get "Frequently Bought Together" recommendations for a specific product
 */
export async function getFrequentlyBoughtTogether(
  skuId: string,
  tenantId: string,
  limit: number = 5
): Promise<ProductRecommendation[]> {
  const affinityProducts = await getProductAffinity([skuId], tenantId, limit);

  const skus = await prisma.sku.findMany({
    where: {
      id: { in: affinityProducts.map(p => p.skuId) },
      tenantId,
      isActive: true,
    },
    include: {
      product: true,
    },
  });

  return affinityProducts.map(affinity => {
    const sku = skus.find(s => s.id === affinity.skuId);
    if (!sku) return null;

    const score = affinity.coOccurrenceRate * 100;
    let confidence: 'high' | 'medium' | 'low';
    if (score >= 50) confidence = 'high';
    else if (score >= 25) confidence = 'medium';
    else confidence = 'low';

    return {
      skuId: sku.id,
      skuCode: sku.code,
      productName: sku.product.name,
      confidence,
      score: Math.round(score),
      reason: `${Math.round(affinity.coOccurrenceRate * 100)}% of customers bought this together`,
      reasonDetails: {
        coOccurrenceRate: affinity.coOccurrenceRate,
      },
    };
  }).filter(Boolean) as ProductRecommendation[];
}
