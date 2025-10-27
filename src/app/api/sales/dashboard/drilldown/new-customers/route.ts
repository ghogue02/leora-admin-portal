import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfMonth, format } from "date-fns";

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

      // Get all customers created this month for this sales rep
      const newCustomers = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          createdAt: {
            gte: monthStart,
            lte: now,
          },
        },
        include: {
          orders: {
            where: {
              status: {
                not: "CANCELLED",
              },
              deliveredAt: {
                not: null,
              },
            },
            orderBy: {
              deliveredAt: "asc",
            },
            include: {
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
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Process customer data with first order information
      const customersWithDetails = newCustomers.map((customer) => {
        const deliveredOrders = customer.orders.filter(
          (order) => order.deliveredAt !== null
        );

        const firstOrder = deliveredOrders.length > 0 ? deliveredOrders[0] : null;
        const totalRevenue = deliveredOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        const totalOrders = deliveredOrders.length;

        // Calculate product categories from first order
        const categoriesInFirstOrder = firstOrder
          ? Array.from(
              new Set(
                firstOrder.lines.map(
                  (line) => line.sku.product.category || "Uncategorized"
                )
              )
            )
          : [];

        return {
          customerId: customer.id,
          customerName: customer.name,
          accountNumber: customer.accountNumber,
          email: customer.email,
          phone: customer.phone,
          location: {
            address: customer.address,
            city: customer.city,
            state: customer.state,
            zipCode: customer.zipCode,
          },
          createdAt: customer.createdAt.toISOString(),
          firstOrderDate: firstOrder?.deliveredAt?.toISOString() || null,
          firstOrderValue: firstOrder ? Number(firstOrder.total || 0) : 0,
          firstOrderId: firstOrder?.id || null,
          categoriesInFirstOrder,
          totalOrders,
          totalRevenue,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
          daysSinceCreation: Math.floor(
            (now.getTime() - customer.createdAt.getTime()) / (24 * 60 * 60 * 1000)
          ),
          hasOrdered: deliveredOrders.length > 0,
        };
      });

      // Separate customers with and without orders
      const customersWithOrders = customersWithDetails.filter((c) => c.hasOrdered);
      const customersWithoutOrders = customersWithDetails.filter((c) => !c.hasOrdered);

      // Calculate statistics
      const totalNewCustomers = newCustomers.length;
      const customersWithOrdersCount = customersWithOrders.length;
      const conversionRate = totalNewCustomers > 0
        ? (customersWithOrdersCount / totalNewCustomers) * 100
        : 0;

      const totalRevenueFromNewCustomers = customersWithOrders.reduce(
        (sum, customer) => sum + customer.totalRevenue,
        0
      );

      const averageFirstOrderValue = customersWithOrders.length > 0
        ? customersWithOrders.reduce((sum, c) => sum + c.firstOrderValue, 0) /
          customersWithOrders.length
        : 0;

      // Group by day of week for pattern analysis
      const customersByDayOfWeek = newCustomers.reduce((acc, customer) => {
        const dayOfWeek = format(customer.createdAt, "EEEE");
        if (!acc[dayOfWeek]) {
          acc[dayOfWeek] = 0;
        }
        acc[dayOfWeek] += 1;
        return acc;
      }, {} as Record<string, number>);

      // Category popularity among new customers
      const categoryPopularity = customersWithOrders.reduce((acc, customer) => {
        customer.categoriesInFirstOrder.forEach((category) => {
          if (!acc[category]) {
            acc[category] = 0;
          }
          acc[category] += 1;
        });
        return acc;
      }, {} as Record<string, number>);

      // Summary statistics
      const summary = {
        totalNewCustomers,
        customersWithOrders: customersWithOrdersCount,
        customersWithoutOrders: customersWithoutOrders.length,
        conversionRate,
        conversionRatePercent: conversionRate.toFixed(1),
        totalRevenueFromNewCustomers,
        averageFirstOrderValue,
        averageRevenuePerCustomer: customersWithOrdersCount > 0
          ? totalRevenueFromNewCustomers / customersWithOrdersCount
          : 0,
      };

      return NextResponse.json({
        summary,
        data: {
          customersWithOrders: customersWithOrders.sort(
            (a, b) => b.totalRevenue - a.totalRevenue
          ),
          customersWithoutOrders: customersWithoutOrders.sort(
            (a, b) => a.daysSinceCreation - b.daysSinceCreation
          ),
          customersByDayOfWeek: Object.entries(customersByDayOfWeek)
            .map(([dayOfWeek, count]) => ({ dayOfWeek, count }))
            .sort((a, b) => b.count - a.count),
          categoryPopularity: Object.entries(categoryPopularity)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count),
        },
        metadata: {
          periodStart: monthStart.toISOString(),
          periodEnd: now.toISOString(),
          timestamp: now.toISOString(),
        },
        insights: {
          topNewCustomer: customersWithOrders.length > 0
            ? {
                customerId: customersWithOrders[0].customerId,
                customerName: customersWithOrders[0].customerName,
                totalSpent: customersWithOrders[0].totalSpent,
                orderCount: customersWithOrders[0].orderCount,
              }
            : null,
          mostPopularDay: Object.entries(customersByDayOfWeek).length > 0
            ? (() => {
                const popular = Object.entries(customersByDayOfWeek).reduce((max, [day, count]) =>
                  count > max.count ? { dayOfWeek: day, count } : max
                , { dayOfWeek: "", count: 0 });
                return { dayOfWeek: popular.dayOfWeek, count: popular.count };
              })()
            : null,
          mostPopularCategory: Object.entries(categoryPopularity).length > 0
            ? (() => {
                const popular = Object.entries(categoryPopularity).reduce((max, [category, count]) =>
                  count > max.count ? { category, count } : max
                , { category: "", count: 0 });
                return { category: popular.category, count: popular.count };
              })()
            : null,
          averageDaysToFirstOrder: customersWithOrders.length > 0
            ? customersWithOrders.reduce((sum, c) => {
                const daysToOrder = c.firstOrderDate
                  ? Math.floor(
                      (new Date(c.firstOrderDate).getTime() -
                        new Date(c.createdAt).getTime()) /
                        (24 * 60 * 60 * 1000)
                    )
                  : 0;
                return sum + daysToOrder;
              }, 0) / customersWithOrders.length
            : 0,
        },
      });
    }
  );
}
