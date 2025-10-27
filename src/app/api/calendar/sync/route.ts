import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { CalendarSyncService } from '@/lib/calendar-sync';

/**
 * POST /api/calendar/sync
 * Trigger calendar synchronization
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider, direction = 'bidirectional' } = await request.json();

    if (!provider || !['google', 'outlook'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "outlook"' },
        { status: 400 }
      );
    }

    if (!['from', 'to', 'bidirectional'].includes(direction)) {
      return NextResponse.json(
        { error: 'Invalid direction. Must be "from", "to", or "bidirectional"' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const syncService = new CalendarSyncService();

    let result;

    if (direction === 'bidirectional') {
      result = await syncService.bidirectionalSync(user.tenantId, user.id, provider);
    } else if (direction === 'from') {
      result = await syncService.syncFromProvider(user.tenantId, user.id, provider);
    } else {
      result = await syncService.syncToProvider(user.tenantId, user.id, provider);
    }

    return NextResponse.json({
      success: true,
      provider,
      direction,
      result,
    });
  } catch (error) {
    console.error('Error syncing calendar:', error);
    return NextResponse.json(
      { error: 'Failed to sync calendar', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calendar/sync
 * Get sync status for connected calendars
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all integration tokens for this user
    const integrations = await prisma.integrationToken.findMany({
      where: {
        tenantId: user.tenantId,
        provider: {
          in: ['google', 'outlook'],
        },
      },
      select: {
        provider: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Get event counts
    const eventCount = await prisma.calendarEvent.count({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
      },
    });

    const upcomingEventCount = await prisma.calendarEvent.count({
      where: {
        tenantId: user.tenantId,
        userId: user.id,
        startTime: {
          gte: new Date(),
        },
      },
    });

    return NextResponse.json({
      connected: integrations.map(i => ({
        provider: i.provider,
        connected: true,
        expiresAt: i.expiresAt,
        lastSync: i.updatedAt,
      })),
      eventCount,
      upcomingEventCount,
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
