import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { CalendarSyncService } from '@/lib/calendar-sync';
import prisma from '@/lib/prisma';

/**
 * GET /api/calendar/health
 *
 * Returns health status for all calendar syncs
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get calendar sync status
    const syncService = new CalendarSyncService();
    const statuses = await syncService.getSyncStatus(user.tenantId, user.id);

    // Get integration tokens to check connectivity
    const tokens = await prisma.integrationToken.findMany({
      where: {
        tenantId: user.tenantId,
        provider: { in: ['google', 'outlook'] },
      },
      select: {
        provider: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Calculate overall health
    const allSyncsActive = statuses.every((s) => s.isActive);
    const noRecentErrors = statuses.every((s) => s.consecutiveFailures === 0);
    const hasActiveTokens = tokens.length > 0;

    const overallHealth = allSyncsActive && noRecentErrors && hasActiveTokens ? 'healthy' : 'degraded';

    return NextResponse.json({
      status: overallHealth,
      timestamp: new Date().toISOString(),
      syncs: statuses.map((status) => {
        const token = tokens.find((t) => t.provider === status.provider);
        return {
          ...status,
          tokenExpiry: token?.expiresAt?.toISOString(),
          tokenAge: token
            ? Math.floor((Date.now() - token.createdAt.getTime()) / (24 * 60 * 60 * 1000))
            : null,
        };
      }),
      summary: {
        totalSyncs: statuses.length,
        activeSyncs: statuses.filter((s) => s.isActive).length,
        syncsWithErrors: statuses.filter((s) => s.consecutiveFailures > 0).length,
        connectedProviders: tokens.length,
      },
    });
  } catch (error) {
    console.error('Error fetching calendar health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar health', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/health/resync
 *
 * Trigger manual resync for a specific provider
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider } = body;

    if (!provider || !['google', 'outlook'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "outlook"' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, tenantId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Trigger resync
    const syncService = new CalendarSyncService();
    const result = await syncService.triggerFullResync(user.tenantId, user.id, provider);

    return NextResponse.json({
      success: result.success,
      provider,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error triggering resync:', error);
    return NextResponse.json(
      { error: 'Failed to trigger resync', details: String(error) },
      { status: 500 }
    );
  }
}
