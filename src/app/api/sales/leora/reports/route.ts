import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withSalesSession } from '@/lib/auth/sales';

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
    // If today's time has passed, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'WEEKLY' && dayOfWeek !== null) {
    // Schedule for next occurrence of dayOfWeek
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;
    if (daysUntil <= 0 || (daysUntil === 0 && nextRun <= now)) {
      daysUntil += 7;
    }
    nextRun.setDate(nextRun.getDate() + daysUntil);
  } else if (frequency === 'MONTHLY') {
    // Schedule for 1st of next month
    nextRun.setMonth(nextRun.getMonth() + 1);
    nextRun.setDate(1);
  }

  return nextRun;
}

// GET /api/sales/leora/reports - List all scheduled reports for current user
export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, session }) => {
      try {
        const userId = session.user.id;

        const reports = await prisma.scheduledReport.findMany({
          where: {
            tenantId,
            userId,
          },
          orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ reports });
      } catch (error) {
        console.error('Error fetching scheduled reports:', error);
        return NextResponse.json(
          { error: 'Failed to fetch scheduled reports' },
          { status: 500 }
        );
      }
    },
    { requireSalesRep: false },
  );
}

// POST /api/sales/leora/reports - Create a new scheduled report
export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, session }) => {
      try {
        const userId = session.user.id;

        const body = await request.json();
        const {
          name,
          description,
          reportType,
          frequency,
          dayOfWeek,
          timeOfDay,
          recipientEmail,
        } = body;

        if (!name || !reportType || !frequency || !recipientEmail) {
          return NextResponse.json(
            { error: 'Name, report type, frequency, and recipient email are required' },
            { status: 400 }
          );
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipientEmail)) {
          return NextResponse.json(
            { error: 'Invalid email address' },
            { status: 400 }
          );
        }

        // Calculate next scheduled time
        const nextScheduled = calculateNextScheduled(
          frequency,
          dayOfWeek ?? null,
          timeOfDay || '08:00'
        );

        const report = await prisma.scheduledReport.create({
          data: {
            tenantId,
            userId,
            name,
            description,
            reportType,
            frequency,
            dayOfWeek,
            timeOfDay: timeOfDay || '08:00',
            recipientEmail,
            nextScheduled,
          },
        });

        return NextResponse.json({ report }, { status: 201 });
      } catch (error) {
        console.error('Error creating scheduled report:', error);
        return NextResponse.json(
          { error: 'Failed to create scheduled report' },
          { status: 500 }
        );
      }
    },
    { requireSalesRep: false },
  );
}
