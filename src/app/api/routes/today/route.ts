/**
 * Today's Routes API
 * GET /api/routes/today - Get all routes for today
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTodayRoutes } from '@/lib/route-visibility';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get today's routes
    const routes = await getTodayRoutes(user.tenantId);

    // Calculate stats
    const stats = {
      totalRoutes: routes.length,
      totalOrders: routes.reduce((sum, r) => sum + (r.total_stops || 0), 0),
      totalStops: routes.reduce((sum, r) => sum + (r.total_stops || 0), 0),
      completedStops: routes.reduce((sum, r) => sum + (r.completed_stops || 0), 0),
      inProgress: routes.filter(r => r.status === 'in_progress').length,
      completed: routes.filter(r => r.status === 'completed').length
    };

    return NextResponse.json({
      routes,
      stats
    });
  } catch (error) {
    console.error('Today routes error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch today\'s routes',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
