/**
 * Customer Insights API
 *
 * GET /api/ai/insights/customer?customerId=xxx
 * Returns comprehensive AI-powered customer insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCustomerInsights } from '@/lib/ai/predictive-analytics';
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

    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Generate insights
    const insights = await generateCustomerInsights(customerId, session.tenantId);

    return NextResponse.json(insights);
  } catch (error) {
    console.error('Error generating customer insights:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
