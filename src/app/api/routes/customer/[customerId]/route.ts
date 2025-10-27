/**
 * Customer Route API
 * GET /api/routes/customer/[customerId] - Get customer's delivery ETA
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCustomerDeliveryETA } from '@/lib/route-visibility';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { customerId: string } }
) {
  try {
    // Authenticate user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { customerId } = params;

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get customer delivery info
    const deliveryInfo = await getCustomerDeliveryETA(customerId);

    return NextResponse.json(deliveryInfo);
  } catch (error) {
    console.error('Customer route error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch customer delivery info',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
