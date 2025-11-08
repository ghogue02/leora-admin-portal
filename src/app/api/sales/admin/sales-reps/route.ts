import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Get filter parameters
      const { searchParams } = new URL(request.url);
      const territory = searchParams.get("territory");
      const status = searchParams.get("status");
      const search = searchParams.get("search");

      // Build where clause
      const where: Prisma.SalesRepWhereInput = {
        tenantId,
      };

      if (territory && territory !== "all") {
        where.territoryName = territory;
      }

      if (status && status !== "all") {
        where.isActive = status === "active";
      }

      // Fetch all sales reps with their users
      const salesReps = await db.salesRep.findMany({
        where,
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
              lastOrderDate: true,
            },
          },
        },
        orderBy: {
          user: {
            fullName: "asc",
          },
        },
      });

      // Apply search filter in memory (more flexible)
      let filteredReps = salesReps;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredReps = salesReps.filter(
          rep =>
            rep.user.fullName.toLowerCase().includes(searchLower) ||
            rep.user.email.toLowerCase().includes(searchLower)
        );
      }

      // Get date ranges
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const fortyFiveDaysAgo = new Date(now);
      fortyFiveDaysAgo.setDate(now.getDate() - 45);

      // Fetch performance data for each rep
      const repsWithPerformance = await Promise.all(
        filteredReps.map(async rep => {
          // Get YTD revenue
          const ytdRevenue = await db.order.aggregate({
            where: {
              tenantId,
              customer: {
                salesRepId: rep.id,
              },
              deliveredAt: {
                gte: yearStart,
              },
              status: {
                not: "CANCELLED",
              },
            },
            _sum: {
              total: true,
            },
            _count: true,
          });

          // Get orders this week
          const weekOrders = await db.order.count({
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
          });

          // Count active customers (ordered in last 45 days)
          const activeCustomerCount = rep.customers.filter(customer => {
            if (!customer.lastOrderDate) return false;
            return new Date(customer.lastOrderDate) >= fortyFiveDaysAgo;
          }).length;

          const ytdRevenueValue = Number(ytdRevenue._sum.total ?? 0);
          const annualQuota = Number(rep.annualRevenueQuota ?? 0);
          const quotaAchievementPercent =
            Number(annualQuota) > 0 ? (ytdRevenueValue / annualQuota) * 100 : 0;

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
            annualRevenueQuota: rep.annualRevenueQuota
              ? Number(rep.annualRevenueQuota)
              : null,
            sampleAllowancePerMonth: rep.sampleAllowancePerMonth,
            isActive: rep.isActive,
            user: rep.user,
            performance: {
              ytdRevenue: ytdRevenueValue,
              ordersThisWeek: weekOrders,
              customerCount: rep.customers.length,
              activeCustomerCount,
              quotaAchievementPercent,
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
