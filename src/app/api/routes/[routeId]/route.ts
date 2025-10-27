/**
 * Route Details API
 * GET /api/routes/[routeId] - Get route details with stops
 * PATCH /api/routes/[routeId] - Update route information
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRouteProgress } from '@/lib/route-visibility';
import { getRouteWithStops } from '@/lib/route-import';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { routeId: string } }
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

    const { routeId } = params;

    if (!routeId) {
      return NextResponse.json(
        { error: 'Route ID is required' },
        { status: 400 }
      );
    }

    // Get route with stops
    const route = await getRouteWithStops(routeId);

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    // Get progress
    const progress = await getRouteProgress(routeId);

    return NextResponse.json({
      route,
      progress
    });
  } catch (error) {
    console.error('Route details error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch route details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { routeId: string } }
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

    const { routeId } = params;

    if (!routeId) {
      return NextResponse.json(
        { error: 'Route ID is required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status, assigned_driver, route_name, notes } = body;

    // Build update object
    const updateData: any = {
      updated_at: new Date()
    };

    if (status) {
      const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled'];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }

      updateData.status = status;
    }

    if (assigned_driver !== undefined) {
      updateData.assigned_driver = assigned_driver;
    }

    if (route_name) {
      updateData.route_name = route_name;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    // Update route
    const updatedRoute = await db.deliveryRoutes
      .where('id', '=', routeId)
      .where('tenant_id', '=', user.tenantId)
      .update(updateData)
      .returning('*')
      .executeTakeFirst();

    if (!updatedRoute) {
      return NextResponse.json(
        { error: 'Route not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      route: updatedRoute
    });
  } catch (error) {
    console.error('Route update error:', error);

    return NextResponse.json(
      {
        error: 'Failed to update route',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
