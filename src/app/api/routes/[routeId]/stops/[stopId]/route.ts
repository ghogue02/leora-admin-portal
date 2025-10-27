/**
 * Route Stop Update API
 * PATCH /api/routes/[routeId]/stops/[stopId] - Update stop status
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateStopStatus } from '@/lib/route-visibility';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { routeId: string; stopId: string } }
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

    const { stopId } = params;

    if (!stopId) {
      return NextResponse.json(
        { error: 'Stop ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status, actualArrival, notes } = body;

    // Validate status
    const validStatuses = ['pending', 'in_transit', 'arrived', 'delivered', 'failed'];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse actual arrival if provided
    let arrivalDate: Date | undefined;

    if (actualArrival) {
      arrivalDate = new Date(actualArrival);

      if (isNaN(arrivalDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid actual arrival date format' },
          { status: 400 }
        );
      }
    }

    // Update stop
    const updatedStop = await updateStopStatus(
      stopId,
      status,
      arrivalDate,
      notes
    );

    return NextResponse.json({
      success: true,
      stop: updatedStop
    });
  } catch (error) {
    console.error('Stop update error:', error);

    return NextResponse.json(
      {
        error: 'Failed to update stop status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
