import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfYear, eachMonthOfInterval, format, endOfMonth } from "date-fns";

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
      const yearStart = startOfYear(now);
      const lastYearStart = startOfYear(new Date(now.getFullYear() - 1, 0, 1));
      const lastYearEnd = new Date(yearStart.getTime() - 1);

      // Get all delivered orders for the current year with details
      const currentYearOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            gte: yearStart,
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

      // Get last year orders for comparison
      const lastYearOrders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          deliveredAt: {
            gte: lastYearStart,
            lte: lastYearEnd,
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

      // Calculate total months in year for completeness tracking (12 months)
      const totalMonths = 12;

      // Group current year revenue by month
      const monthlyRevenue = eachMonthOfInterval({
        start: yearStart,
        end: now,
      }).map((month) => {
        const monthStart = new Date(month.setHours(0, 0, 0, 0));
        const monthEnd = endOfMonth(monthStart);
        const monthEndBounded = monthEnd > now ? now : monthEnd;

        const monthOrders = currentYearOrders.filter(
          (order) =>
            order.deliveredAt &&
            order.deliveredAt >= monthStart &&
            order.deliveredAt <= monthEndBounded
        );

        const revenue = monthOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        return {
          month: format(monthStart, "yyyy-MM"),
          monthName: format(monthStart, "MMMM yyyy"),
          revenue,
          orderCount: monthOrders.length,
          uniqueCustomers: new Set(monthOrders.map((o) => o.customerId)).size,
        };
      });

      // Calculate revenue by customer
      const customerRevenue = currentYearOrders.reduce((acc, order) => {
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
      const categoryRevenue = currentYearOrders.reduce((acc, order) => {
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

      // Get top products sold this year
      const productSales = currentYearOrders.reduce((acc, order) => {
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
      const currentYearRevenue = currentYearOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );
      const lastYearRevenue = lastYearOrders.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );

      const revenueChange = lastYearRevenue > 0
        ? ((currentYearRevenue - lastYearRevenue) / lastYearRevenue) * 100
        : 0;

      // Summary statistics
      const summary = {
        totalRevenue: currentYearRevenue,
        lastYearRevenue,
        revenueChange,
        revenueChangePercent: revenueChange.toFixed(1),
        totalOrders: currentYearOrders.length,
        uniqueCustomers: new Set(currentYearOrders.map((o) => o.customerId)).size,
        averageOrderValue: currentYearOrders.length > 0
          ? currentYearRevenue / currentYearOrders.length
          : 0,
        quota: Number(salesRep.yearlyRevenueQuota || 0),
        quotaProgress: salesRep.yearlyRevenueQuota
          ? (currentYearRevenue / Number(salesRep.yearlyRevenueQuota)) * 100
          : 0,
      };

      return NextResponse.json({
        summary,
        data: {
          monthlyRevenue,
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
          periodStart: yearStart.toISOString(),
          periodEnd: now.toISOString(),
          timestamp: now.toISOString(),
          dataCompleteness: {
            showing: monthlyRevenue.length,
            total: totalMonths,
            message: `Showing ${monthlyRevenue.length} of ${totalMonths} months`,
          },
        },
        insights: {
          peakRevenueMonth: (() => {
            const peak = monthlyRevenue.reduce((max, month) =>
              month.revenue > max.revenue ? month : max
            );
            return {
              month: peak.month,
              monthName: peak.monthName,
              revenue: peak.revenue,
              orderCount: peak.orderCount,
            };
          })(),
          topCustomerContribution:
            topCustomers.length > 0 && currentYearRevenue > 0
              ? ((topCustomers[0].revenue / currentYearRevenue) * 100).toFixed(1) + "%"
              : "0%",
          categoryDiversity: Object.keys(categoryRevenue.byCategory).length,
        },
      });
    }
  );
}
