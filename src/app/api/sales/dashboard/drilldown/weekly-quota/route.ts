import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, addDays } from "date-fns";

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
      const currentMonthStart = startOfMonth(now);
      const currentMonthEnd = endOfMonth(now);

      const weeklyQuota = Number(salesRep.weeklyRevenueQuota || 0);
      const monthlyQuota = weeklyQuota * 4.33; // Average weeks per month

      // Get all delivered orders for the current month
      const monthOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            gte: currentMonthStart,
            lte: now, // MTD (month-to-date)
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
            },
          },
          lines: {
            include: {
              sku: {
                include: {
                  product: {
                    select: {
                      id: true,
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
          deliveredAt: "asc",
        },
      });

      // Calculate daily breakdown
      const monthDays = eachDayOfInterval({
        start: currentMonthStart,
        end: currentMonthEnd,
      });

      const dailyBreakdown = monthDays.map((day) => {
        const dayOrders = monthOrders.filter((order) => {
          const deliveryDate = order.deliveredAt;
          return (
            deliveryDate &&
            format(deliveryDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
          );
        });

        const dayRevenue = dayOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        return {
          date: format(day, "yyyy-MM-dd"),
          dayName: format(day, "EEEE"),
          revenue: dayRevenue,
          orderCount: dayOrders.length,
          isToday: format(day, "yyyy-MM-dd") === format(now, "yyyy-MM-dd"),
          isPast: day < now,
        };
      });

      // Get top contributing customers
      const customerContributions = monthOrders.reduce((acc, order) => {
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
        });
        return acc;
      }, {} as Record<string, any>);

      const topCustomers = Object.values(customerContributions)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((contrib: any) => ({
          customerId: contrib.customer.id,
          customerName: contrib.customer.name,
          accountNumber: contrib.customer.accountNumber,
          revenue: contrib.revenue,
          orderCount: contrib.orderCount,
          percentOfQuota: monthlyQuota > 0 ? ((contrib.revenue / monthlyQuota) * 100).toFixed(1) : "0",
          orders: contrib.orders,
        }));

      // Get top contributing products
      const productContributions = monthOrders.reduce((acc, order) => {
        order.lines.forEach((line) => {
          const productId = line.sku.product.id;
          const revenue = Number(line.unitPrice) * line.quantity;

          if (!acc[productId]) {
            acc[productId] = {
              product: line.sku.product,
              revenue: 0,
              quantity: 0,
              orderCount: 0,
            };
          }
          acc[productId].revenue += revenue;
          acc[productId].quantity += line.quantity;
          acc[productId].orderCount += 1;
        });
        return acc;
      }, {} as Record<string, any>);

      const topProducts = Object.values(productContributions)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 10)
        .map((contrib: any) => ({
          productId: contrib.product.id,
          productName: contrib.product.name,
          brand: contrib.product.brand,
          category: contrib.product.category,
          revenue: contrib.revenue,
          quantity: contrib.quantity,
          orderCount: contrib.orderCount,
          percentOfQuota: monthlyQuota > 0 ? ((contrib.revenue / monthlyQuota) * 100).toFixed(1) : "0",
        }));

      // Calculate current progress
      const currentRevenue = monthOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );
      const quotaProgress = monthlyQuota > 0 ? (currentRevenue / monthlyQuota) * 100 : 0;

      // Calculate path to goal projections
      const daysElapsed = Math.floor(
        (now.getTime() - currentMonthStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysRemaining = daysInMonth - daysElapsed;
      const dailyAverage = daysElapsed > 0 ? currentRevenue / daysElapsed : 0;
      const projectedRevenue = currentRevenue + (dailyAverage * daysRemaining);
      const gapToQuota = monthlyQuota - currentRevenue;
      const requiredDailyRate = daysRemaining > 0 ? gapToQuota / daysRemaining : 0;

      const pathToGoal = {
        currentRevenue,
        monthlyQuota,
        quotaProgress: quotaProgress.toFixed(1),
        gapToQuota,
        daysElapsed,
        daysRemaining,
        daysInMonth,
        dailyAverage: dailyAverage.toFixed(2),
        projectedRevenue: projectedRevenue.toFixed(2),
        projectedProgress: monthlyQuota > 0 ? ((projectedRevenue / monthlyQuota) * 100).toFixed(1) : "0",
        requiredDailyRate: requiredDailyRate.toFixed(2),
        onTrack: projectedRevenue >= monthlyQuota,
        projectionMessage: projectedRevenue >= monthlyQuota
          ? `On track to exceed quota by $${(projectedRevenue - monthlyQuota).toFixed(2)}`
          : `Need $${requiredDailyRate.toFixed(2)}/day to reach quota`,
      };

      return NextResponse.json({
        summary: {
          monthlyQuota,
          currentRevenue,
          quotaProgress: quotaProgress.toFixed(1),
          totalOrders: monthOrders.length,
          uniqueCustomers: Object.keys(customerContributions).length,
          avgOrderValue: monthOrders.length > 0 ? (currentRevenue / monthOrders.length).toFixed(2) : "0",
        },
        dailyBreakdown,
        topCustomers,
        topProducts,
        pathToGoal,
        metadata: {
          monthStart: currentMonthStart.toISOString(),
          monthEnd: currentMonthEnd.toISOString(),
          timestamp: now.toISOString(),
        },
        insights: {
          momentum: dailyAverage > 0 && dailyAverage > (monthlyQuota / daysInMonth)
            ? "Ahead of pace - maintain momentum"
            : dailyAverage > 0
            ? "Below target pace - increase activity"
            : "No sales yet this month - urgent action needed",
          topOpportunity: topCustomers.length > 0
            ? `${topCustomers[0].customerName} is top contributor at $${topCustomers[0].revenue.toFixed(2)}`
            : null,
          productFocus: topProducts.length > 0
            ? `${topProducts[0].productName} leading with $${topProducts[0].revenue.toFixed(2)} in revenue`
            : null,
        },
      });
    }
  );
}
