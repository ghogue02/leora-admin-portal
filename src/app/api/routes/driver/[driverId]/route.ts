/**
 * Driver Routes API
 * GET /api/routes/driver/[driverId] - Get routes assigned to a driver
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDriverRoutes } from '@/lib/route-visibility';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { driverId: string } }
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

    const { driverId } = params;

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    let date: Date | undefined;

    if (dateParam) {
      date = new Date(dateParam);

      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        );
      }
    }

    // Get driver routes
    const routes = await getDriverRoutes(user.tenantId, driverId, date);

    return NextResponse.json({
      driver_id: driverId,
      date: date?.toISOString() || new Date().toISOString(),
      routes,
      count: routes.length
    });
  } catch (error) {
    console.error('Driver routes error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch driver routes',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
