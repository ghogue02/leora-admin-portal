/**
 * Frequently Bought Together API
 *
 * GET /api/ai/recommendations/frequently-bought-together?skuId=xxx&limit=5
 * Returns products frequently purchased with the specified SKU
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFrequentlyBoughtTogether } from '@/lib/ai/recommendation-engine';
import { getSalesSession } from '@/lib/auth-sales';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const session = await getSalesSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const skuId = searchParams.get('skuId');
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!skuId) {
      return NextResponse.json(
        { error: 'skuId is required' },
        { status: 400 }
      );
    }

    // Get frequently bought together products
    const recommendations = await getFrequentlyBoughtTogether(
      skuId,
      session.tenantId,
      limit
    );

    return NextResponse.json({
      skuId,
      recommendations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting frequently bought together:', error);
    return NextResponse.json(
      {
        error: 'Failed to get product recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
