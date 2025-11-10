import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  batchCreateGoogleEvents,
  batchCreateOutlookEvents,
  batchDeleteEvents,
  type BatchEventInput,
} from '@/lib/integrations/calendar-batch';

/**
 * POST /api/calendar/batch
 * Batch create calendar events
 */
export async function POST(request: NextRequest) {
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

    const { provider, events } = await request.json();

    if (!provider || !['google', 'outlook'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Must be "google" or "outlook"' },
        { status: 400 }
      );
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Events array is required' },
        { status: 400 }
      );
    }

    // Validate and parse events
    const validatedEvents: BatchEventInput[] = events.map((event) => ({
      title: event.title,
      description: event.description,
      startTime: new Date(event.startTime),
      endTime: new Date(event.endTime),
      location: event.location,
      customerId: event.customerId,
      taskId: event.taskId,
    }));

    let result;

    if (provider === 'google') {
      result = await batchCreateGoogleEvents(
        user.tenantId,
        user.id,
        validatedEvents
      );
    } else {
      result = await batchCreateOutlookEvents(
        user.tenantId,
        user.id,
        validatedEvents
      );
    }

    return NextResponse.json({
      success: true,
      provider,
      result,
    });
  } catch (error) {
    console.error('Error batch creating events:', error);
    return NextResponse.json(
      { error: 'Failed to create events', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/batch
 * Batch delete calendar events
 */
export async function DELETE(request: NextRequest) {
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

    const { eventIds } = await request.json();

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { error: 'Event IDs array is required' },
        { status: 400 }
      );
    }

    const result = await batchDeleteEvents(user.tenantId, user.id, eventIds);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Error batch deleting events:', error);
    return NextResponse.json(
      { error: 'Failed to delete events', details: String(error) },
      { status: 500 }
    );
  }
}
