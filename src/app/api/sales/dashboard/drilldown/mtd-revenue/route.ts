import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfMonth, eachDayOfInterval, format } from "date-fns";

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
      const monthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const lastMonthEnd = new Date(monthStart.getTime() - 1);

      // Get all delivered orders for the current month with details
      const currentMonthOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            gte: monthStart,
            lte: now,
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

      // Get last month orders for comparison
      const lastMonthOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
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

      // Calculate total days in month for completeness tracking
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

      // Group current month revenue by day
      const dailyRevenue = eachDayOfInterval({
        start: monthStart,
        end: now,
      }).map((day) => {
        const dayStart = new Date(day.setHours(0, 0, 0, 0));
        const dayEnd = new Date(day.setHours(23, 59, 59, 999));

        const dayOrders = currentMonthOrders.filter(
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
      const customerRevenue = currentMonthOrders.reduce((acc, order) => {
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
      const categoryRevenue = currentMonthOrders.reduce((acc, order) => {
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

      // Get top products sold this month
      const productSales = currentMonthOrders.reduce((acc, order) => {
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
      const currentMonthRevenue = currentMonthOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );
      const lastMonthRevenue = lastMonthOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      const revenueChangeDollar = currentMonthRevenue - lastMonthRevenue;
      const revenueChangePercent = lastMonthRevenue > 0
        ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : 0;

      // Calculate monthly quota consistently with dashboard (weeklyQuota * 4.33)
      const weeklyQuota = Number(salesRep.weeklyRevenueQuota || 0);
      const monthlyQuota = salesRep.monthlyRevenueQuota
        ? Number(salesRep.monthlyRevenueQuota)
        : weeklyQuota * 4.33; // Use same calculation as dashboard

      // Summary statistics
      const summary = {
        totalRevenue: currentMonthRevenue,
        lastMonthRevenue,
        revenueChange: revenueChangeDollar,
        revenueChangePercent: revenueChangePercent.toFixed(1),
        totalOrders: currentMonthOrders.length,
        uniqueCustomers: new Set(currentMonthOrders.map((o) => o.customerId)).size,
        averageOrderValue: currentMonthOrders.length > 0
          ? currentMonthRevenue / currentMonthOrders.length
          : 0,
        quota: monthlyQuota,
        quotaProgress: monthlyQuota > 0
          ? (currentMonthRevenue / monthlyQuota) * 100
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
        },
        metadata: {
          periodStart: monthStart.toISOString(),
          periodEnd: now.toISOString(),
          timestamp: now.toISOString(),
          dataCompleteness: {
            showing: dailyRevenue.length,
            total: daysInMonth,
            message: `Showing ${dailyRevenue.length} of ${daysInMonth} days`,
          },
        },
        insights: {
          peakRevenueDay: (() => {
            const peak = dailyRevenue.reduce((max, day) =>
              day.revenue > max.revenue ? day : max
            );
            return {
              date: peak.date,
              dayOfWeek: peak.dayOfWeek,
              revenue: peak.revenue,
              orderCount: peak.orderCount,
            };
          })(),
          topCustomerContribution:
            topCustomers.length > 0 && currentMonthRevenue > 0
              ? ((topCustomers[0].revenue / currentMonthRevenue) * 100).toFixed(1) + "%"
              : "0%",
          categoryDiversity: Object.keys(categoryRevenue.byCategory).length,
        },
      });
    }
  );
}
