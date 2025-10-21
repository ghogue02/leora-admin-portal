import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subDays, subMonths } from "date-fns";

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

      // Parse query parameters for pagination and sorting
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
      const offset = parseInt(searchParams.get("offset") || "0");
      const sortBy = searchParams.get("sortBy") || "revenue"; // revenue, lastOrder, name
      const sortOrder = searchParams.get("sortOrder") || "desc"; // asc, desc

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const ninetyDaysAgo = subDays(now, 90);

      // Get healthy customers with detailed information
      const healthyCustomers = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          riskStatus: "HEALTHY",
          isPermanentlyClosed: false,
        },
        include: {
          orders: {
            where: {
              deliveredAt: {
                not: null,
              },
              status: {
                not: "CANCELLED",
              },
            },
            orderBy: {
              deliveredAt: "desc",
            },
            take: 10,
            select: {
              id: true,
              total: true,
              deliveredAt: true,
              orderedAt: true,
              status: true,
              lines: {
                select: {
                  quantity: true,
                  unitPrice: true,
                  sku: {
                    select: {
                      code: true,
                      product: {
                        select: {
                          name: true,
                          category: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          activities: {
            where: {
              occurredAt: {
                gte: ninetyDaysAgo,
              },
            },
            orderBy: {
              occurredAt: "desc",
            },
            take: 5,
            include: {
              activityType: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
          calendarEvents: {
            where: {
              startTime: {
                gte: now,
              },
            },
            orderBy: {
              startTime: "asc",
            },
            take: 3,
          },
        },
      });

      // Calculate detailed metrics for each customer
      const data = healthyCustomers.map((customer) => {
        const recentOrders = customer.orders.slice(0, 5);
        const last30DaysOrders = customer.orders.filter(
          (o) => o.deliveredAt && o.deliveredAt >= thirtyDaysAgo
        );
        const last90DaysOrders = customer.orders.filter(
          (o) => o.deliveredAt && o.deliveredAt >= ninetyDaysAgo
        );

        // Revenue metrics
        const last30DaysRevenue = last30DaysOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );
        const last90DaysRevenue = last90DaysOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );
        const averageOrderValue = recentOrders.length > 0
          ? recentOrders.reduce((sum, order) => sum + Number(order.total || 0), 0) / recentOrders.length
          : 0;

        // Ordering pattern consistency
        const orderDates = customer.orders
          .filter((o) => o.deliveredAt)
          .map((o) => o.deliveredAt!.getTime())
          .sort((a, b) => b - a);

        const intervals: number[] = [];
        for (let i = 0; i < orderDates.length - 1 && i < 5; i++) {
          intervals.push(
            Math.floor((orderDates[i] - orderDates[i + 1]) / (1000 * 60 * 60 * 24))
          );
        }

        const avgInterval = intervals.length > 0
          ? intervals.reduce((sum, val) => sum + val, 0) / intervals.length
          : customer.averageOrderIntervalDays || 0;

        const intervalConsistency = intervals.length > 1
          ? 100 - (Math.min(
              (Math.max(...intervals) - Math.min(...intervals)) / avgInterval * 100,
              100
            ))
          : 100;

        // Engagement score (0-100)
        const activityScore = Math.min((customer.activities.length / 5) * 100, 100);
        const orderFrequencyScore = last30DaysOrders.length >= 1 ? 100 : 50;
        const engagementScore = (activityScore + orderFrequencyScore + intervalConsistency) / 3;

        // Product diversity
        const uniqueProducts = new Set(
          customer.orders.flatMap((order) =>
            order.lines.map((line) => line.sku.product.name)
          )
        ).size;

        const uniqueCategories = new Set(
          customer.orders.flatMap((order) =>
            order.lines.map((line) => line.sku.product.category)
          )
        ).size;

        return {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
          contact: {
            phone: customer.phone,
            email: customer.billingEmail,
          },
          location: {
            city: customer.city,
            state: customer.state,
          },
          orderingPattern: {
            lastOrderDate: customer.lastOrderDate?.toISOString() || null,
            nextExpectedOrderDate: customer.nextExpectedOrderDate?.toISOString() || null,
            averageIntervalDays: Math.round(avgInterval),
            intervalConsistency: intervalConsistency.toFixed(1),
            orderCount30Days: last30DaysOrders.length,
            orderCount90Days: last90DaysOrders.length,
          },
          revenueMetrics: {
            establishedRevenue: Number(customer.establishedRevenue || 0),
            last30DaysRevenue,
            last90DaysRevenue,
            averageOrderValue,
            totalOrders: customer.orders.length,
          },
          engagement: {
            score: engagementScore.toFixed(1),
            recentActivities: customer.activities.length,
            upcomingEvents: customer.calendarEvents.length,
            lastActivityDate: customer.activities[0]?.occurredAt.toISOString() || null,
          },
          productDiversity: {
            uniqueProducts,
            uniqueCategories,
            topProducts: customer.orders
              .flatMap((order) => order.lines)
              .reduce((acc, line) => {
                const productName = line.sku.product.name;
                if (!acc[productName]) {
                  acc[productName] = { name: productName, quantity: 0, revenue: 0 };
                }
                acc[productName].quantity += line.quantity;
                acc[productName].revenue += Number(line.unitPrice) * line.quantity;
                return acc;
              }, {} as Record<string, any>),
          },
          recentOrders: recentOrders.map((order) => ({
            id: order.id,
            total: Number(order.total || 0),
            deliveredAt: order.deliveredAt?.toISOString() || null,
            status: order.status,
            itemCount: order.lines.length,
          })),
          upcomingEvents: customer.calendarEvents.map((event) => ({
            id: event.id,
            title: event.title,
            startTime: event.startTime.toISOString(),
            eventType: event.eventType,
          })),
        };
      });

      // Sort the data
      const sortedData = data.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case "revenue":
            comparison = b.revenueMetrics.establishedRevenue - a.revenueMetrics.establishedRevenue;
            break;
          case "lastOrder":
            const aDate = a.orderingPattern.lastOrderDate ? new Date(a.orderingPattern.lastOrderDate).getTime() : 0;
            const bDate = b.orderingPattern.lastOrderDate ? new Date(b.orderingPattern.lastOrderDate).getTime() : 0;
            comparison = bDate - aDate;
            break;
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          default:
            comparison = 0;
        }
        return sortOrder === "asc" ? -comparison : comparison;
      });

      // Apply pagination
      const paginatedData = sortedData.slice(offset, offset + limit);

      // Calculate summary statistics
      const summary = {
        totalHealthy: healthyCustomers.length,
        totalRevenue: data.reduce((sum, c) => sum + c.revenueMetrics.establishedRevenue, 0),
        averageEngagement: data.length > 0
          ? (data.reduce((sum, c) => sum + Number(c.engagement.score), 0) / data.length).toFixed(1)
          : "0",
        averageOrderValue: data.length > 0
          ? data.reduce((sum, c) => sum + c.revenueMetrics.averageOrderValue, 0) / data.length
          : 0,
        activeOrdering: data.filter((c) => c.orderingPattern.orderCount30Days > 0).length,
        recentActivity: data.filter((c) => c.engagement.recentActivities > 0).length,
      };

      return NextResponse.json({
        summary,
        data: paginatedData,
        metadata: {
          limit,
          offset,
          total: healthyCustomers.length,
          hasMore: offset + limit < healthyCustomers.length,
          sortBy,
          sortOrder,
          timestamp: now.toISOString(),
        },
        insights: {
          topPerformers: sortedData.slice(0, 5).map((c) => ({
            customerId: c.id,
            customerName: c.name,
            revenue: c.revenueMetrics.establishedRevenue,
            engagement: c.engagement.score,
          })),
          mostConsistent: sortedData
            .sort((a, b) => Number(b.orderingPattern.intervalConsistency) - Number(a.orderingPattern.intervalConsistency))
            .slice(0, 5)
            .map((c) => ({
              customerId: c.id,
              customerName: c.name,
              consistency: c.orderingPattern.intervalConsistency,
            })),
        },
      });
    }
  );
}
