/**
 * API endpoint for AI-powered product recommendations
 * POST /api/recommendations/products
 */

import { NextRequest, NextResponse } from 'next/server';
import { getProductRecommendations } from '@/lib/ai-recommendations';
import {
  buildCustomerContext,
  getAvailableProducts,
  getRecentlyOrderedProductIds,
} from '@/lib/recommendation-context';

// Cache recommendations for 15 minutes
const CACHE_TTL = 15 * 60 * 1000;
const cache = new Map<
  string,
  { recommendations: any[]; timestamp: number }
>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, occasion, limit = 5, minConfidence = 0.6, excludeRecent = true } = body;

    // Validate input
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    // Check cache
    const cacheKey = `${customerId}-${occasion || 'default'}-${limit}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        recommendations: cached.recommendations,
        cached: true,
      });
    }

    // Build customer context
    const context = await buildCustomerContext(customerId, {
      includeOrders: true,
      includeSamples: true,
      orderLimit: 10,
      sampleLimit: 20,
    });

    // Add occasion if provided
    if (occasion) {
      context.occasion = occasion;
    }

    // Get available products
    let excludeProductIds: string[] = [];
    if (excludeRecent) {
      excludeProductIds = await getRecentlyOrderedProductIds(customerId, 30);
    }

    const availableProducts = await getAvailableProducts({
      limit: 100,
      excludeProductIds,
      // Optionally filter by customer's preferred categories
      categories: context.productPreferences?.categories,
    });

    if (availableProducts.length === 0) {
      return NextResponse.json({
        recommendations: [],
        message: 'No available products found for recommendations',
      });
    }

    // Get AI recommendations
    const recommendations = await getProductRecommendations(
      customerId,
      context,
      availableProducts,
      {
        maxRecommendations: limit,
        minConfidence,
      }
    );

    // Enrich recommendations with full product data
    const enrichedRecommendations = await enrichRecommendations(recommendations);

    // Cache the results
    cache.set(cacheKey, {
      recommendations: enrichedRecommendations,
      timestamp: Date.now(),
    });

    return NextResponse.json({
      recommendations: enrichedRecommendations,
      cached: false,
    });
  } catch (error) {
    console.error('Error in recommendations API:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Failed to get recommendations';

    return NextResponse.json(
      {
        error: errorMessage,
        recommendations: [],
      },
      { status: 500 }
    );
  }
}

/**
 * Enrich recommendations with full product data from database
 */
async function enrichRecommendations(
  recommendations: { productId: string; reason: string; confidence: number }[]
) {
  if (recommendations.length === 0) return [];

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const productIds = recommendations.map(r => r.productId);

  const { data: products } = await supabase
    .from('products')
    .select('id, name, category, varietal, vintage, price, description, stock_quantity')
    .in('id', productIds);

  if (!products) return recommendations;

  // Map products to recommendations
  return recommendations.map(rec => {
    const product = products.find(p => p.id === rec.productId);
    return {
      ...rec,
      product: product || null,
    };
  });
}

/**
 * Clear cache (useful for testing or forced refresh)
 */
export async function DELETE() {
  cache.clear();
  return NextResponse.json({ message: 'Cache cleared' });
}
