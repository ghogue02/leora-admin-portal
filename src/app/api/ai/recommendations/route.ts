/**
 * Product Recommendations API
 *
 * GET /api/ai/recommendations?customerId=xxx&limit=10
 * Returns personalized product recommendations for a customer
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateRecommendations } from '@/lib/ai/recommendation-engine';
import { getSalesSession } from '@/lib/auth-sales';

export async function GET(request: NextRequest) {
  try {
    // Authenticate
    const session = await getSalesSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const excludeSkuIds = searchParams.get('excludeSkuIds')?.split(',') || [];

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Generate recommendations
    const recommendations = await generateRecommendations({
      customerId,
      tenantId: session.tenantId,
      limit,
      includeReasons: true,
      excludeSkuIds,
    });

    return NextResponse.json({
      customerId,
      recommendations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate recommendations',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
