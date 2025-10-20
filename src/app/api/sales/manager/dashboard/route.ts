import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Get all sales reps
    const salesReps = await db.salesRep.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Build rep performance data
    const repsData = await Promise.all(
      salesReps.map(async (rep) => {
        // This week's revenue
        const thisWeekOrders = await db.order.aggregate({
          where: {
            tenantId,
            customer: {
              salesRepId: rep.id,
            },
            deliveredAt: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          _sum: {
            total: true,
          },
        });

        // Last week's revenue
        const lastWeekOrders = await db.order.aggregate({
          where: {
            tenantId,
            customer: {
              salesRepId: rep.id,
            },
            deliveredAt: {
              gte: lastWeekStart,
              lte: lastWeekEnd,
            },
          },
          _sum: {
            total: true,
          },
        });

        // Customer counts
        const customersAssigned = await db.customer.count({
          where: {
            salesRepId: rep.id,
            isPermanentlyClosed: false,
          },
        });

        const customersActive = await db.customer.count({
          where: {
            salesRepId: rep.id,
            isPermanentlyClosed: false,
            orders: {
              some: {
                deliveredAt: {
                  gte: weekStart,
                  lte: weekEnd,
                },
              },
            },
          },
        });

        // Activities count
        const activitiesThisWeek = await db.activity.count({
          where: {
            userId: rep.userId,
            occurredAt: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        });

        const thisWeekRevenue = Number(thisWeekOrders._sum.total || 0);
        const quotaAttainment = rep.weeklyRevenueQuota
          ? (thisWeekRevenue / Number(rep.weeklyRevenueQuota)) * 100
          : 0;

        return {
          id: rep.id,
          name: rep.user.fullName,
          email: rep.user.email,
          territoryName: rep.territoryName,
          thisWeekRevenue,
          lastWeekRevenue: Number(lastWeekOrders._sum.total || 0),
          customersAssigned,
          customersActive,
          activitiesThisWeek,
          quotaAttainment,
        };
      })
    );

    // Territory health
    const territories = await Promise.all(
      salesReps.map(async (rep) => {
        const customers = await db.customer.groupBy({
          by: ["riskStatus"],
          where: {
            salesRepId: rep.id,
            isPermanentlyClosed: false,
          },
          _count: true,
        });

        const healthMap = customers.reduce((acc, curr) => {
          acc[curr.riskStatus] = curr._count;
          return acc;
        }, {} as Record<string, number>);

        return {
          name: rep.territoryName,
          repName: rep.user.fullName,
          totalCustomers:
            (healthMap.HEALTHY || 0) +
            (healthMap.AT_RISK_CADENCE || 0) +
            (healthMap.AT_RISK_REVENUE || 0) +
            (healthMap.DORMANT || 0),
          healthy: healthMap.HEALTHY || 0,
          atRisk: (healthMap.AT_RISK_CADENCE || 0) + (healthMap.AT_RISK_REVENUE || 0),
          dormant: healthMap.DORMANT || 0,
        };
      })
    );

    // Sample budgets
    const sampleBudgets = await Promise.all(
      salesReps.map(async (rep) => {
        const samplesUsed = await db.sampleUsage.count({
          where: {
            salesRepId: rep.id,
            tastedAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        });

        return {
          repName: rep.user.fullName,
          allowance: rep.sampleAllowancePerMonth,
          used: samplesUsed,
        };
      })
    );

    // Team stats
    const totalRevenue = repsData.reduce((sum, rep) => sum + rep.thisWeekRevenue, 0);
    const totalLastWeekRevenue = repsData.reduce((sum, rep) => sum + rep.lastWeekRevenue, 0);
    const revenueChange =
      totalLastWeekRevenue > 0
        ? ((totalRevenue - totalLastWeekRevenue) / totalLastWeekRevenue) * 100
        : 0;

    return NextResponse.json({
      reps: repsData,
      territories,
      sampleBudgets,
      teamStats: {
        totalRevenue,
        revenueChange,
        totalCustomers: repsData.reduce((sum, rep) => sum + rep.customersAssigned, 0),
        activeCustomers: repsData.reduce((sum, rep) => sum + rep.customersActive, 0),
        atRiskCustomers: territories.reduce((sum, t) => sum + t.atRisk + t.dormant, 0),
        totalActivities: repsData.reduce((sum, rep) => sum + rep.activitiesThisWeek, 0),
      },
    });
  });
}
