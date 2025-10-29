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

export async function GET(request: NextRequest) {
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
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

    // Get active goals for this rep
    const goals = await db.repProductGoal.findMany({
      where: {
        tenantId: salesRep.tenantId,
        salesRepId: salesRep.id,
      },
      include: {
        sku: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 25,
    });

    const deriveMetricType = (goal: typeof goals[number]): 'revenue' | 'cases' | 'pod' => {
      const rawType = goal.metricType?.toLowerCase();
      if (rawType === 'revenue' || rawType === 'cases' || rawType === 'pod') {
        return rawType;
      }
      if (goal.targetRevenue) return 'revenue';
      if (goal.targetCases) return 'cases';
      if (goal.targetPod) return 'pod';
      return 'revenue';
    };

    const derivePeriodType = (goal: typeof goals[number]): 'week' | 'month' | 'quarter' | 'year' => {
      const raw = goal.periodType?.toLowerCase();
      if (raw === 'week' || raw === 'month' || raw === 'quarter' || raw === 'year') {
        return raw;
      }
      const durationMs = goal.periodEnd.getTime() - goal.periodStart.getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      const days = Math.round(durationMs / oneDay);
      if (days <= 7) return 'week';
      if (days <= 31) return 'month';
      if (days <= 92) return 'quarter';
      return 'year';
    };

    // Calculate current progress for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        let currentRevenue = 0;
        let currentCases = 0;
        let currentPod = 0;

        if (goal.skuId) {
          const stats = await db.$queryRaw<Array<{ total: number; cases: number; distribution: number }>>`
            SELECT
              COALESCE(SUM(ol.quantity * ol."unitPrice"), 0)::DECIMAL AS total,
              COALESCE(SUM(ol.quantity), 0)::INT AS cases,
              COALESCE(COUNT(DISTINCT o."customerId"), 0)::INT AS distribution
            FROM "OrderLine" ol
            INNER JOIN "Order" o ON ol."orderId" = o.id
            INNER JOIN "Customer" c ON o."customerId" = c.id
            WHERE ol."tenantId" = ${salesRep.tenantId}::uuid
              AND ol."skuId" = ${goal.skuId}::uuid
              AND o.status = 'FULFILLED'
              AND o."deliveredAt" >= ${goal.periodStart}
              AND o."deliveredAt" <= ${goal.periodEnd}
              AND c."salesRepId" = ${salesRep.id}::uuid
          `;

          currentRevenue = Number(stats[0]?.total || 0);
          currentCases = Number(stats[0]?.cases || 0);
          currentPod = Number(stats[0]?.distribution || 0);
        } else if (goal.productCategory) {
          const stats = await db.$queryRaw<Array<{ total: number; cases: number; distribution: number }>>`
            SELECT
              COALESCE(SUM(ol.quantity * ol."unitPrice"), 0)::DECIMAL AS total,
              COALESCE(SUM(ol.quantity), 0)::INT AS cases,
              COALESCE(COUNT(DISTINCT o."customerId"), 0)::INT AS distribution
            FROM "OrderLine" ol
            INNER JOIN "Order" o ON ol."orderId" = o.id
            INNER JOIN "Customer" c ON o."customerId" = c.id
            INNER JOIN "Sku" s ON ol."skuId" = s.id
            INNER JOIN "Product" p ON s."productId" = p.id
            WHERE ol."tenantId" = ${salesRep.tenantId}::uuid
              AND p.category = ${goal.productCategory}
              AND o.status = 'FULFILLED'
              AND o."deliveredAt" >= ${goal.periodStart}
              AND o."deliveredAt" <= ${goal.periodEnd}
              AND c."salesRepId" = ${salesRep.id}::uuid
          `;

          currentRevenue = Number(stats[0]?.total || 0);
          currentCases = Number(stats[0]?.cases || 0);
          currentPod = Number(stats[0]?.distribution || 0);
        }

        const metricType = deriveMetricType(goal);
        const periodType = derivePeriodType(goal);

        let progressPercent = 0;
        if (metricType === 'revenue' && goal.targetRevenue && Number(goal.targetRevenue) > 0) {
          progressPercent = (currentRevenue / Number(goal.targetRevenue)) * 100;
        } else if (metricType === 'cases' && goal.targetCases && goal.targetCases > 0) {
          progressPercent = (currentCases / goal.targetCases) * 100;
        } else if (metricType === 'pod' && goal.targetPod && goal.targetPod > 0) {
          progressPercent = (currentPod / goal.targetPod) * 100;
        }

        return {
          id: goal.id,
          skuId: goal.skuId,
          productCategory: goal.productCategory,
          targetRevenue: goal.targetRevenue ? Number(goal.targetRevenue) : null,
          targetCases: goal.targetCases,
          targetPod: goal.targetPod,
          metricType,
          periodType,
          periodStart: goal.periodStart.toISOString(),
          periodEnd: goal.periodEnd.toISOString(),
          productName: goal.sku?.product.name,
          skuCode: goal.sku?.code,
          currentRevenue,
          currentCases,
          currentPod,
          progressPercent: Math.round(progressPercent),
        };
      })
    );

    return NextResponse.json({
      goals: goalsWithProgress,
    });
    } catch (error) {
      console.error('Product goals error:', error);
      return NextResponse.json(
        { error: 'Failed to load product goals' },
        { status: 500 }
      );
    }
  });
}

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

export async function POST(request: NextRequest) {
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
          { error: "Sales rep profile not found" },
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
      periodType = 'month',
      periodScope = 'current',
    } = body;

    const normalizedMetric =
      typeof metricType === 'string' ? metricType.toLowerCase() : 'revenue';
    const normalizedPeriod =
      typeof periodType === 'string' ? periodType.toLowerCase() : 'month';
    const normalizedScope =
      typeof periodScope === 'string' ? periodScope.toLowerCase() : 'current';

    const { periodStart, periodEnd } = calculatePeriodDates(normalizedPeriod, normalizedScope);

    const createData: any = {
      tenantId: salesRep.tenantId,
      salesRepId: salesRep.id,
      productCategory: productCategory ?? null,
      skuId: skuId ?? null,
      periodStart,
      periodEnd,
      metricType: normalizedMetric,
      periodType: normalizedPeriod,
      targetRevenue: null,
      targetCases: null,
      targetPod: null,
    };

    if (normalizedMetric === 'revenue') {
      if (!targetRevenue) {
        return NextResponse.json(
          { error: 'Target revenue is required for revenue goals' },
          { status: 400 }
        );
      }
      createData.targetRevenue = Number(targetRevenue);
    } else if (normalizedMetric === 'cases') {
      if (!targetCases) {
        return NextResponse.json(
          { error: 'Target cases are required for case-based goals' },
          { status: 400 }
        );
      }
      createData.targetCases = Number(targetCases);
    } else if (normalizedMetric === 'pod') {
      if (!targetPod) {
        return NextResponse.json(
          { error: 'Target Points of Distribution are required for POD goals' },
          { status: 400 }
        );
      }
      createData.targetPod = Number(targetPod);
    }

    const goal = await db.repProductGoal.create({
      data: createData,
    });

    return NextResponse.json(goal);
    } catch (error) {
      console.error('Create product goal error:', error);
      return NextResponse.json(
        { error: 'Failed to create product goal' },
        { status: 500 }
      );
    }
  });
}
