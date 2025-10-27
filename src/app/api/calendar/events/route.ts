import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';
import { GoogleCalendarClient, OutlookCalendarClient } from '@/lib/calendar-sync';

/**
 * GET /api/calendar/events
 * List calendar events
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    const customerId = searchParams.get('customerId');

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const where: any = {
      tenantId: user.tenantId,
      userId: user.id,
    };

    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/calendar/events
 * Create a new calendar event
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { title, description, startTime, endTime, location, customerId, eventType, syncToProvider } = data;

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: title, startTime, endTime' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create event in database
    const event = await prisma.calendarEvent.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location,
        customerId,
        eventType,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Optionally sync to external calendar
    if (syncToProvider) {
      try {
        const token = await prisma.integrationToken.findUnique({
          where: {
            tenantId_provider: {
              tenantId: user.tenantId,
              provider: syncToProvider,
            },
          },
        });

        if (token) {
          const client = syncToProvider === 'google'
            ? new GoogleCalendarClient(token.accessToken, token.refreshToken!)
            : new OutlookCalendarClient(token.accessToken);

          await client.createEvent({
            title,
            description,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            location,
          });
        }
      } catch (syncError) {
        console.error('Error syncing to external calendar:', syncError);
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to create calendar event' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/calendar/events
 * Update a calendar event
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id, title, description, startTime, endTime, location, customerId, eventType, syncToProvider } = data;

    if (!id) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify event ownership
    const existingEvent = await prisma.calendarEvent.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        userId: user.id,
      },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Update event in database
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = new Date(endTime);
    if (location !== undefined) updateData.location = location;
    if (customerId !== undefined) updateData.customerId = customerId;
    if (eventType !== undefined) updateData.eventType = eventType;

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Optionally sync to external calendar
    if (syncToProvider) {
      try {
        const token = await prisma.integrationToken.findUnique({
          where: {
            tenantId_provider: {
              tenantId: user.tenantId,
              provider: syncToProvider,
            },
          },
        });

        if (token) {
          const client = syncToProvider === 'google'
            ? new GoogleCalendarClient(token.accessToken, token.refreshToken!)
            : new OutlookCalendarClient(token.accessToken);

          // Note: This would require storing the external event ID
          // For now, this is a placeholder
          console.log('Update to external calendar not fully implemented');
        }
      } catch (syncError) {
        console.error('Error syncing to external calendar:', syncError);
      }
    }

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/calendar/events
 * Delete a calendar event
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const syncToProvider = searchParams.get('syncToProvider');

    if (!id) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify event ownership
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
        userId: user.id,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Delete from database
    await prisma.calendarEvent.delete({
      where: { id },
    });

    // Optionally delete from external calendar
    if (syncToProvider && ['google', 'outlook'].includes(syncToProvider)) {
      try {
        const token = await prisma.integrationToken.findUnique({
          where: {
            tenantId_provider: {
              tenantId: user.tenantId,
              provider: syncToProvider as 'google' | 'outlook',
            },
          },
        });

        if (token) {
          // Note: This would require storing the external event ID
          console.log('Delete from external calendar not fully implemented');
        }
      } catch (syncError) {
        console.error('Error deleting from external calendar:', syncError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return NextResponse.json(
      { error: 'Failed to delete calendar event' },
      { status: 500 }
    );
  }
}
