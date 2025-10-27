import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesUserContext } from '@/lib/sales-auth';

// Helper to calculate next scheduled time
function calculateNextScheduled(
  frequency: string,
  dayOfWeek: number | null,
  timeOfDay: string
): Date {
  const now = new Date();
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  if (frequency === 'DAILY') {
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'WEEKLY' && dayOfWeek !== null) {
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0 || (daysUntil === 0 && nextRun <= now)) {
      daysUntil += 7;
    }
    nextRun.setDate(nextRun.getDate() + daysUntil);
  } else if (frequency === 'MONTHLY') {
    nextRun.setMonth(nextRun.getMonth() + 1);
    nextRun.setDate(1);
  }

  return nextRun;
}

// GET /api/sales/leora/reports/[reportId] - Get a specific scheduled report
export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const report = await prisma.scheduledReport.findFirst({
      where: {
        id: params.reportId,
        tenantId: context.tenantId,
        userId: context.userId,
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error fetching scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled report' },
      { status: 500 }
    );
  }
}

// PUT /api/sales/leora/reports/[reportId] - Update a scheduled report
export async function PUT(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      reportType,
      frequency,
      dayOfWeek,
      timeOfDay,
      recipientEmail,
      isActive,
    } = body;

    // Check ownership
    const existing = await prisma.scheduledReport.findFirst({
      where: {
        id: params.reportId,
        tenantId: context.tenantId,
        userId: context.userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Report not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate new next scheduled time if frequency/time changed
    const nextScheduled =
      frequency || timeOfDay || dayOfWeek !== undefined
        ? calculateNextScheduled(
            frequency || existing.frequency,
            dayOfWeek !== undefined ? dayOfWeek : existing.dayOfWeek,
            timeOfDay || existing.timeOfDay
          )
        : existing.nextScheduled;

    const report = await prisma.scheduledReport.update({
      where: { id: params.reportId },
      data: {
        name,
        description,
        reportType,
        frequency,
        dayOfWeek,
        timeOfDay,
        recipientEmail,
        isActive,
        nextScheduled,
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Error updating scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled report' },
      { status: 500 }
    );
  }
}

// DELETE /api/sales/leora/reports/[reportId] - Delete a scheduled report
export async function DELETE(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const existing = await prisma.scheduledReport.findFirst({
      where: {
        id: params.reportId,
        tenantId: context.tenantId,
        userId: context.userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Report not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.scheduledReport.delete({
      where: { id: params.reportId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled report' },
      { status: 500 }
    );
  }
}
