import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Fetch all sales reps with their users
      const salesReps = await db.salesRep.findMany({
        where: {
          tenantId,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          customers: {
            where: {
              isPermanentlyClosed: false,
            },
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          user: {
            fullName: "asc",
          },
        },
      });

      // Get current week and month date ranges
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Fetch performance data for each rep
      const repsWithPerformance = await Promise.all(
        salesReps.map(async (rep) => {
          // Get week revenue
          const weekRevenue = await db.order.aggregate({
            where: {
              tenantId,
              customer: {
                salesRepId: rep.id,
              },
              deliveredAt: {
                gte: weekStart,
              },
              status: {
                not: "CANCELLED",
              },
            },
            _sum: {
              total: true,
            },
          });

          // Get month revenue
          const monthRevenue = await db.order.aggregate({
            where: {
              tenantId,
              customer: {
                salesRepId: rep.id,
              },
              deliveredAt: {
                gte: monthStart,
              },
              status: {
                not: "CANCELLED",
              },
            },
            _sum: {
              total: true,
            },
          });

          // Get samples used this month
          const samplesUsed = await db.sampleUsage.aggregate({
            where: {
              tenantId,
              salesRepId: rep.id,
              tastedAt: {
                gte: monthStart,
              },
            },
            _sum: {
              quantity: true,
            },
          });

          const currentWeekRevenue = Number(weekRevenue._sum.total ?? 0);
          const currentMonthRevenue = Number(monthRevenue._sum.total ?? 0);
          const samplesUsedThisMonth = samplesUsed._sum.quantity ?? 0;

          const weeklyQuotaProgress = rep.weeklyRevenueQuota
            ? (currentWeekRevenue / Number(rep.weeklyRevenueQuota)) * 100
            : 0;

          const monthlyQuotaProgress = rep.monthlyRevenueQuota
            ? (currentMonthRevenue / Number(rep.monthlyRevenueQuota)) * 100
            : 0;

          return {
            id: rep.id,
            userId: rep.userId,
            territoryName: rep.territoryName,
            deliveryDay: rep.deliveryDay,
            weeklyRevenueQuota: rep.weeklyRevenueQuota
              ? Number(rep.weeklyRevenueQuota)
              : null,
            monthlyRevenueQuota: rep.monthlyRevenueQuota
              ? Number(rep.monthlyRevenueQuota)
              : null,
            sampleAllowancePerMonth: rep.sampleAllowancePerMonth,
            isActive: rep.isActive,
            user: rep.user,
            performance: {
              currentWeekRevenue,
              currentMonthRevenue,
              customerCount: rep.customers.length,
              samplesUsedThisMonth,
              weeklyQuotaProgress,
              monthlyQuotaProgress,
            },
          };
        })
      );

      return NextResponse.json({
        reps: repsWithPerformance,
      });
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}
