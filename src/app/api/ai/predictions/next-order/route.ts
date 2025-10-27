/**
 * Next Order Prediction API
 *
 * GET /api/ai/predictions/next-order?customerId=xxx
 * Returns predicted next order date with confidence and factors
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictNextOrderDate } from '@/lib/ai/predictive-analytics';
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

    // Generate prediction
    const prediction = await predictNextOrderDate(customerId, session.tenantId);

    return NextResponse.json(prediction);
  } catch (error) {
    console.error('Error predicting next order:', error);
    return NextResponse.json(
      {
        error: 'Failed to predict next order',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
