import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
} from 'date-fns';

function calculatePeriodDates(
  periodType: string,
  scope: 'current' | 'previous' = 'current'
) {
  const now = new Date();
  let reference = now;

  if (scope === 'previous') {
    switch (periodType) {
      case 'week':
        reference = subWeeks(now, 1);
        break;
      case 'quarter':
        reference = subQuarters(now, 1);
        break;
      case 'year':
        reference = subYears(now, 1);
        break;
      case 'month':
      default:
        reference = subMonths(now, 1);
        break;
    }
  }

  switch (periodType) {
    case 'week': {
      const start = startOfWeek(reference, { weekStartsOn: 1 });
      const end = endOfWeek(reference, { weekStartsOn: 1 });
      return { periodStart: start, periodEnd: end };
    }
    case 'quarter': {
      return {
        periodStart: startOfQuarter(reference),
        periodEnd: endOfQuarter(reference),
      };
    }
    case 'year': {
      return {
        periodStart: startOfYear(reference),
        periodEnd: endOfYear(reference),
      };
    }
    case 'month':
    default: {
      return {
        periodStart: startOfMonth(reference),
        periodEnd: endOfMonth(reference),
      };
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: 'Sales rep profile not found' },
          { status: 404 }
        );
      }

      const body = await request.json();

      const {
        productCategory,
        skuId,
        targetRevenue,
        targetCases,
        targetPod,
        metricType = 'revenue',
        periodType,
        periodScope,
      } = body;

      const normalizedMetric =
        typeof metricType === 'string' ? metricType.toLowerCase() : 'revenue';
      const normalizedPeriod =
        typeof periodType === 'string' ? periodType.toLowerCase() : undefined;
      const normalizedScope =
        typeof periodScope === 'string' ? periodScope.toLowerCase() : undefined;

      const updateData: any = {
        productCategory: productCategory ?? null,
        skuId: skuId ?? null,
        metricType: normalizedMetric,
      };

      if (normalizedPeriod) {
        const { periodStart, periodEnd } = calculatePeriodDates(
          normalizedPeriod,
          (normalizedScope as 'current' | 'previous') ?? 'current'
        );
        updateData.periodType = normalizedPeriod;
        updateData.periodStart = periodStart;
        updateData.periodEnd = periodEnd;
      }

      updateData.targetRevenue = null;
      updateData.targetCases = null;
      updateData.targetPod = null;

      if (normalizedMetric === 'revenue') {
        updateData.targetRevenue = targetRevenue ? Number(targetRevenue) : null;
      } else if (normalizedMetric === 'cases') {
        updateData.targetCases = targetCases ? Number(targetCases) : null;
      } else if (normalizedMetric === 'pod') {
        updateData.targetPod = targetPod ? Number(targetPod) : null;
      }

      const goal = await db.repProductGoal.update({
        where: {
          id: params.id,
          tenantId: salesRep.tenantId,
          salesRepId: salesRep.id,
        },
        data: updateData,
      });

      return NextResponse.json(goal);
    } catch (error) {
      console.error('Update product goal error:', error);
      return NextResponse.json(
        { error: 'Failed to update product goal' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: 'Sales rep profile not found' },
          { status: 404 }
        );
      }

      await db.repProductGoal.delete({
        where: {
          id: params.id,
          tenantId: salesRep.tenantId,
          salesRepId: salesRep.id,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Delete product goal error:', error);
      return NextResponse.json(
        { error: 'Failed to delete product goal' },
        { status: 500 }
      );
    }
  });
}
