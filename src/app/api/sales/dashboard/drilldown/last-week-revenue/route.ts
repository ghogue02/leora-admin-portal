import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, subWeeks, eachDayOfInterval, format } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Get sales rep profile for the logged-in user
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
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      const lastWeekStart = subWeeks(currentWeekStart, 1);
      const lastWeekEnd = subWeeks(currentWeekEnd, 1);
      const twoWeeksAgoStart = subWeeks(lastWeekStart, 1);
      const twoWeeksAgoEnd = subWeeks(lastWeekEnd, 1);

      // Get all delivered orders for last week with details
      const lastWeekOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            gte: lastWeekStart,
            lte: lastWeekEnd,
          },
          status: {
            not: "CANCELLED",
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              city: true,
              state: true,
            },
          },
          lines: {
            include: {
              sku: {
                include: {
                  product: {
                    select: {
                      name: true,
                      brand: true,
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          deliveredAt: "desc",
        },
      });

      // Get current week orders for comparison
      const currentWeekOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            gte: currentWeekStart,
            lte: currentWeekEnd,
          },
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          total: true,
          deliveredAt: true,
        },
      });

      // Get two weeks ago orders for trend analysis
      const twoWeeksAgoOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            gte: twoWeeksAgoStart,
            lte: twoWeeksAgoEnd,
          },
          status: {
            not: "CANCELLED",
          },
        },
        select: {
          total: true,
        },
      });

      // Group last week revenue by day
      const dailyRevenue = eachDayOfInterval({
        start: lastWeekStart,
        end: lastWeekEnd,
      }).map((day) => {
        const dayStart = new Date(day.setHours(0, 0, 0, 0));
        const dayEnd = new Date(day.setHours(23, 59, 59, 999));

        const dayOrders = lastWeekOrders.filter(
          (order) =>
            order.deliveredAt &&
            order.deliveredAt >= dayStart &&
            order.deliveredAt <= dayEnd
        );

        const revenue = dayOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        return {
          date: format(day, "yyyy-MM-dd"),
          dayOfWeek: format(day, "EEEE"),
          revenue,
          orderCount: dayOrders.length,
          uniqueCustomers: new Set(dayOrders.map((o) => o.customerId)).size,
        };
      });

      // Calculate revenue by customer
      const customerRevenue = lastWeekOrders.reduce((acc, order) => {
        const customerId = order.customer.id;
        if (!acc[customerId]) {
          acc[customerId] = {
            customer: order.customer,
            revenue: 0,
            orderCount: 0,
            orders: [],
          };
        }
        acc[customerId].revenue += Number(order.total || 0);
        acc[customerId].orderCount += 1;
        acc[customerId].orders.push({
          id: order.id,
          total: Number(order.total || 0),
          deliveredAt: order.deliveredAt?.toISOString() || null,
          status: order.status,
        });
        return acc;
      }, {} as Record<string, any>);

      const topCustomers = Object.values(customerRevenue)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((item: any) => ({
          customerId: item.customer.id,
          customerName: item.customer.name,
          accountNumber: item.customer.accountNumber,
          location: {
            city: item.customer.city,
            state: item.customer.state,
          },
          revenue: item.revenue,
          orderCount: item.orderCount,
          averageOrderValue: item.orderCount > 0 ? item.revenue / item.orderCount : 0,
          orders: item.orders,
        }));

      // Calculate revenue by category/brand
      const categoryRevenue = lastWeekOrders.reduce((acc, order) => {
        order.lines.forEach((line) => {
          const category = line.sku.product.category || "Uncategorized";
          const brand = line.sku.product.brand || "Unknown Brand";
          const lineTotal = Number(line.unitPrice) * line.quantity;

          if (!acc.byCategory[category]) {
            acc.byCategory[category] = 0;
          }
          if (!acc.byBrand[brand]) {
            acc.byBrand[brand] = 0;
          }

          acc.byCategory[category] += lineTotal;
          acc.byBrand[brand] += lineTotal;
        });
        return acc;
      }, { byCategory: {} as Record<string, number>, byBrand: {} as Record<string, number> });

      // Get top products sold last week
      const productSales = lastWeekOrders.reduce((acc, order) => {
        order.lines.forEach((line) => {
          const productName = line.sku.product.name;
          const skuCode = line.sku.code;
          const key = `${productName}-${skuCode}`;

          if (!acc[key]) {
            acc[key] = {
              productName,
              brand: line.sku.product.brand,
              category: line.sku.product.category,
              skuCode,
              quantity: 0,
              revenue: 0,
              orderCount: 0,
            };
          }

          acc[key].quantity += line.quantity;
          acc[key].revenue += Number(line.unitPrice) * line.quantity;
          acc[key].orderCount += 1;
        });
        return acc;
      }, {} as Record<string, any>);

      const topProducts = Object.values(productSales)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate totals
      const lastWeekRevenue = lastWeekOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );
      const currentWeekRevenue = currentWeekOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );
      const twoWeeksAgoRevenue = twoWeeksAgoOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      // Calculate week-over-week changes
      const weekOverWeekChange = twoWeeksAgoRevenue > 0
        ? ((lastWeekRevenue - twoWeeksAgoRevenue) / twoWeeksAgoRevenue) * 100
        : 0;

      const comparisonToCurrentWeek = lastWeekRevenue > 0
        ? ((currentWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
        : 0;

      // Summary statistics
      const summary = {
        totalRevenue: lastWeekRevenue,
        currentWeekRevenue,
        twoWeeksAgoRevenue,
        weekOverWeekChange,
        weekOverWeekChangePercent: weekOverWeekChange.toFixed(1),
        comparisonToCurrentWeek,
        comparisonToCurrentWeekPercent: comparisonToCurrentWeek.toFixed(1),
        totalOrders: lastWeekOrders.length,
        uniqueCustomers: new Set(lastWeekOrders.map((o) => o.customerId)).size,
        averageOrderValue: lastWeekOrders.length > 0
          ? lastWeekRevenue / lastWeekOrders.length
          : 0,
        quota: Number(salesRep.weeklyRevenueQuota || 0),
        quotaProgress: salesRep.weeklyRevenueQuota
          ? (lastWeekRevenue / Number(salesRep.weeklyRevenueQuota)) * 100
          : 0,
      };

      return NextResponse.json({
        summary,
        data: {
          dailyRevenue,
          topCustomers,
          topProducts,
          revenueByCategory: Object.entries(categoryRevenue.byCategory)
            .map(([category, revenue]) => ({ category, revenue }))
            .sort((a, b) => b.revenue - a.revenue),
          revenueByBrand: Object.entries(categoryRevenue.byBrand)
            .map(([brand, revenue]) => ({ brand, revenue }))
            .sort((a, b) => b.revenue - a.revenue),
          trendComparison: {
            lastWeek: lastWeekRevenue,
            currentWeek: currentWeekRevenue,
            twoWeeksAgo: twoWeeksAgoRevenue,
            trend: comparisonToCurrentWeek > 0 ? "improving" : "declining",
          },
        },
        metadata: {
          weekStart: lastWeekStart.toISOString(),
          weekEnd: lastWeekEnd.toISOString(),
          timestamp: now.toISOString(),
        },
        insights: {
          peakRevenueDay: dailyRevenue.reduce((max, day) =>
            day.revenue > max.revenue ? day : max
          ),
          topCustomerContribution:
            topCustomers.length > 0 && lastWeekRevenue > 0
              ? ((topCustomers[0].revenue / lastWeekRevenue) * 100).toFixed(1) + "%"
              : "0%",
          categoryDiversity: Object.keys(categoryRevenue.byCategory).length,
          performanceVsQuota: salesRep.weeklyRevenueQuota
            ? lastWeekRevenue >= Number(salesRep.weeklyRevenueQuota)
              ? "Met quota"
              : "Below quota"
            : "No quota set",
        },
      });
    }
  );
}
