import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('sales_session');

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, skuCode, quantity, feedback, needsFollowUp } = body;

    // Validate required fields
    if (!customerId || !skuCode || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Replace with actual database insert
    // This would:
    // 1. Create a sample record in the database
    // 2. Link it to the customer and product
    // 3. Store feedback and follow-up flag
    // 4. Decrement sample budget if applicable

    console.log('Sample assignment:', {
      customerId,
      skuCode,
      quantity,
      feedback,
      needsFollowUp,
      timestamp: new Date().toISOString(),
    });

    // Placeholder response
    const sampleRecord = {
      id: `sample-${Date.now()}`,
      customerId,
      skuCode,
      quantity,
      feedback,
      needsFollowUp,
      tastedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      sample: sampleRecord,
      message: 'Sample assigned successfully',
    });
  } catch (error) {
    console.error('Sample assignment error:', error);
    return NextResponse.json(
      { error: 'Failed to assign sample' },
      { status: 500 }
    );
  }
}
