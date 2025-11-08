/**
 * API endpoint for tracking recommendation feedback
 * POST /api/recommendations/feedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type FeedbackAction = 'accepted' | 'rejected' | 'deferred';

interface FeedbackRequest {
  customerId: string;
  productId: string;
  recommendationReason: string;
  confidence: number;
  action: FeedbackAction;
  orderId?: string; // If accepted and added to an order
  notes?: string;
}

type RecommendationFeedbackRecord = {
  action: FeedbackAction;
  confidence_score: number | null;
};

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json();
    const { customerId, productId, recommendationReason, confidence, action, orderId, notes } =
      body;

    // Validate input
    if (!customerId || !productId || !action) {
      return NextResponse.json(
        { error: 'customerId, productId, and action are required' },
        { status: 400 }
      );
    }

    if (!['accepted', 'rejected', 'deferred'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action type' }, { status: 400 });
    }

    const supabase = await createClient();

    // Store feedback in database
    const { data, error } = await supabase
      .from('recommendation_feedback')
      .insert({
        customer_id: customerId,
        product_id: productId,
        recommendation_reason: recommendationReason,
        confidence_score: confidence,
        action,
        order_id: orderId || null,
        notes: notes || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing recommendation feedback:', error);
      return NextResponse.json({ error: 'Failed to store feedback' }, { status: 500 });
    }

    // Track metrics
    await trackRecommendationMetrics(action, confidence);

    return NextResponse.json({
      success: true,
      feedback: data,
    });
  } catch (error) {
    console.error('Error in feedback API:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process feedback',
      },
      { status: 500 }
    );
  }
}

/**
 * Get recommendation feedback analytics
 * GET /api/recommendations/feedback?customerId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = await createClient();

    let query = supabase
      .from('recommendation_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: feedback, error } = await query;

    if (error) {
      console.error('Error fetching feedback:', error);
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
    }

    // Calculate analytics
    const analytics = calculateFeedbackAnalytics((feedback ?? []) as RecommendationFeedbackRecord[]);

    return NextResponse.json({
      feedback: feedback || [],
      analytics,
    });
  } catch (error) {
    console.error('Error in feedback GET:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch feedback',
      },
      { status: 500 }
    );
  }
}

/**
 * Track recommendation metrics for monitoring
 */
async function trackRecommendationMetrics(action: FeedbackAction, confidence: number) {
  // This could integrate with analytics services or internal metrics
  // For now, we'll just log it
  console.log('Recommendation feedback:', {
    action,
    confidence,
    timestamp: new Date().toISOString(),
  });

  // TODO: Integrate with analytics service
  // - Track acceptance rate by confidence level
  // - Monitor which products get recommended most
  // - Identify patterns in rejections
  // - Calculate ROI of AI recommendations
}

/**
 * Calculate analytics from feedback data
 */
function calculateFeedbackAnalytics(feedback: RecommendationFeedbackRecord[]) {
  if (feedback.length === 0) {
    return {
      total: 0,
      accepted: 0,
      rejected: 0,
      deferred: 0,
      acceptanceRate: 0,
      averageConfidence: 0,
    };
  }

  const total = feedback.length;
  const accepted = feedback.filter(f => f.action === 'accepted').length;
  const rejected = feedback.filter(f => f.action === 'rejected').length;
  const deferred = feedback.filter(f => f.action === 'deferred').length;
  const acceptanceRate = (accepted / total) * 100;

  const totalConfidence = feedback.reduce((sum, f) => sum + (f.confidence_score || 0), 0);
  const averageConfidence = totalConfidence / total;

  return {
    total,
    accepted,
    rejected,
    deferred,
    acceptanceRate: Math.round(acceptanceRate * 100) / 100,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
  };
}
