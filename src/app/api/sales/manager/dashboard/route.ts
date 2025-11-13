import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, startOfYear, subMonths } from "date-fns";
import { hasSalesManagerPrivileges } from "@/lib/sales/role-helpers";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, roles }) => {
      if (!hasSalesManagerPrivileges(roles)) {
        return NextResponse.json({ error: "Manager role required." }, { status: 403 });
      }
      const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const yearStart = startOfYear(now); // January 1st of current year

    // Keep week calculations for activities only
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Get all sales reps (only active users and active sales rep profiles)
    const salesReps = await db.salesRep.findMany({
      where: {
        tenantId,
        isActive: true,
        user: {
          isActive: true,  // Filter out archived users
        },
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
        // This month's revenue (MTD)
        const thisMonthOrders = await db.order.aggregate({
          where: {
            tenantId,
            customer: {
              salesRepId: rep.id,
            },
            deliveredAt: {
              gte: monthStart,
              lte: now,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        });

        // Last month's revenue (full month)
        const lastMonthOrders = await db.order.aggregate({
          where: {
            tenantId,
            customer: {
              salesRepId: rep.id,
            },
            deliveredAt: {
              gte: lastMonthStart,
              lte: lastMonthEnd,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        });

        // MTD revenue
        const mtdOrders = await db.order.aggregate({
          where: {
            tenantId,
            customer: {
              salesRepId: rep.id,
            },
            deliveredAt: {
              gte: monthStart,
              lte: now,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        });

        // YTD revenue
        const ytdOrders = await db.order.aggregate({
          where: {
            tenantId,
            customer: {
              salesRepId: rep.id,
            },
            deliveredAt: {
              gte: yearStart,
              lte: now,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        });

        // All-time revenue
        const allTimeOrders = await db.order.aggregate({
          where: {
            tenantId,
            customer: {
              salesRepId: rep.id,
            },
            status: {
              not: "CANCELLED",
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

        const thisMonthRevenue = Number(thisMonthOrders._sum.total || 0);
        const lastMonthRevenue = Number(lastMonthOrders._sum.total || 0);
        const mtdRevenueAmount = Number(mtdOrders._sum.total || 0);
        const ytdRevenueAmount = Number(ytdOrders._sum.total || 0);
        const allTimeRevenue = Number(allTimeOrders._sum.total || 0);

        // Calculate quota attainment based on monthly quota (weekly quota * 4.33)
        const monthlyQuota = rep.weeklyRevenueQuota ? Number(rep.weeklyRevenueQuota) * 4.33 : 0;
        const quotaAttainment = monthlyQuota
          ? (thisMonthRevenue / monthlyQuota) * 100
          : 0;

        return {
          id: rep.id,
          name: rep.user.fullName,
          email: rep.user.email,
          territoryName: rep.territoryName,
          thisMonthRevenue,
          lastMonthRevenue,
          mtdRevenue: mtdRevenueAmount,
          ytdRevenue: ytdRevenueAmount,
          allTimeRevenue,
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

    // Team stats - Now using month-over-month
    const totalRevenue = repsData.reduce((sum, rep) => sum + rep.thisMonthRevenue, 0);
    const totalLastMonthRevenue = repsData.reduce((sum, rep) => sum + rep.lastMonthRevenue, 0);
    const totalMtdRevenue = repsData.reduce((sum, rep) => sum + rep.mtdRevenue, 0);
    const totalYtdRevenue = repsData.reduce((sum, rep) => sum + rep.ytdRevenue, 0);
    const totalAllTimeRevenue = repsData.reduce((sum, rep) => sum + rep.allTimeRevenue, 0);
    const revenueChange =
      totalLastMonthRevenue > 0
        ? ((totalRevenue - totalLastMonthRevenue) / totalLastMonthRevenue) * 100
        : 0;

    return NextResponse.json({
      reps: repsData,
      territories,
      sampleBudgets,
      teamStats: {
        totalRevenue,
        mtdRevenue: totalMtdRevenue,
        ytdRevenue: totalYtdRevenue,
        allTimeRevenue: totalAllTimeRevenue,
        revenueChange,
        totalCustomers: repsData.reduce((sum, rep) => sum + rep.customersAssigned, 0),
        activeCustomers: repsData.reduce((sum, rep) => sum + rep.customersActive, 0),
        atRiskCustomers: territories.reduce((sum, t) => sum + t.atRisk + t.dormant, 0),
        totalActivities: repsData.reduce((sum, rep) => sum + rep.activitiesThisWeek, 0),
      },
    });
  },
  { requireSalesRep: false });
}
