import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';

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

    const now = new Date();

    // Get active goals for this rep
    const goals = await db.repProductGoal.findMany({
      where: {
        tenantId: salesRep.tenantId,
        salesRepId: salesRep.id,
        periodStart: {
          lte: now,
        },
        periodEnd: {
          gte: now,
        },
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
    });

    // Calculate current progress for each goal
    const goalsWithProgress = await Promise.all(
      goals.map(async (goal) => {
        let currentRevenue = 0;
        let currentCases = 0;

        if (goal.skuId) {
          // Specific SKU goal
          const result = await db.orderLine.aggregate({
            where: {
              tenantId: salesRep.tenantId,
              skuId: goal.skuId,
              order: {
                status: 'FULFILLED',
                deliveredAt: {
                  gte: goal.periodStart,
                  lte: goal.periodEnd,
                },
                customer: {
                  salesRepId: salesRep.id,
                },
              },
            },
            _sum: {
              quantity: true,
            },
          });

          const revenueResult = await db.$queryRaw<Array<{ total: number }>>`
            SELECT COALESCE(SUM(ol.quantity * ol."unitPrice"), 0)::DECIMAL as total
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

          currentCases = result._sum.quantity || 0;
          currentRevenue = Number(revenueResult[0]?.total || 0);
        } else if (goal.productCategory) {
          // Category goal
          const revenueResult = await db.$queryRaw<Array<{ total: number; cases: number }>>`
            SELECT
              COALESCE(SUM(ol.quantity * ol."unitPrice"), 0)::DECIMAL as total,
              COALESCE(SUM(ol.quantity), 0)::INT as cases
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

          currentRevenue = Number(revenueResult[0]?.total || 0);
          currentCases = revenueResult[0]?.cases || 0;
        }

        // Calculate progress percentage
        let progressPercent = 0;
        if (goal.targetRevenue && goal.targetRevenue > 0) {
          progressPercent = (currentRevenue / Number(goal.targetRevenue)) * 100;
        } else if (goal.targetCases && goal.targetCases > 0) {
          progressPercent = (currentCases / goal.targetCases) * 100;
        }

        return {
          id: goal.id,
          skuId: goal.skuId,
          productCategory: goal.productCategory,
          targetRevenue: goal.targetRevenue ? Number(goal.targetRevenue) : null,
          targetCases: goal.targetCases,
          periodStart: goal.periodStart.toISOString(),
          periodEnd: goal.periodEnd.toISOString(),
          productName: goal.sku?.product.name,
          skuCode: goal.sku?.code,
          currentRevenue,
          currentCases,
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

    const { productCategory, targetRevenue, targetCases, periodType } = body;

    // Calculate period dates
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (periodType === 'week') {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - diff);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 7);
    } else {
      // month
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      periodEnd.setHours(23, 59, 59, 999);
    }

    const goal = await db.repProductGoal.create({
      data: {
        tenantId: salesRep.tenantId,
        salesRepId: salesRep.id,
        productCategory,
        targetRevenue: targetRevenue ? Number(targetRevenue) : null,
        targetCases: targetCases || null,
        periodStart,
        periodEnd,
      },
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
