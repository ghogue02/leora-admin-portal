import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { addDays, startOfWeek, endOfWeek } from "date-fns";
import type { Prisma } from "@prisma/client";

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

      // Parse query parameters for pagination and filtering
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
      const offset = parseInt(searchParams.get("offset") || "0");
      const timeframe = searchParams.get("timeframe") || "week"; // week, today, overdue

      const now = new Date();
      let endDate: Date;

      switch (timeframe) {
        case "today":
          endDate = now;
          break;
        case "overdue":
          endDate = now;
          break;
        case "week":
        default:
          endDate = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
          break;
      }

      // Build where clause based on timeframe
      const whereClause: Prisma.CustomerWhereInput = {
        tenantId,
        salesRepId: salesRep.id,
        isPermanentlyClosed: false,
        riskStatus: {
          in: ["HEALTHY", "AT_RISK_CADENCE"],
        },
      };

      if (timeframe === "overdue") {
        whereClause.nextExpectedOrderDate = {
          lt: now,
        };
      } else {
        whereClause.nextExpectedOrderDate = {
          lte: endDate,
          gte: now,
        };
      }

      // Get customers due to order
      const customersDue = await db.customer.findMany({
        where: whereClause,
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
            take: 3,
            select: {
              id: true,
              total: true,
              deliveredAt: true,
              status: true,
            },
          },
          activities: {
            orderBy: {
              occurredAt: "desc",
            },
            take: 2,
            include: {
              activityType: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
        orderBy: {
          nextExpectedOrderDate: "asc",
        },
        skip: offset,
        take: limit,
      });

      // Get total count
      const totalCount = await db.customer.count({
        where: whereClause,
      });

      // Calculate metrics for each customer
      const data = customersDue.map((customer) => {
        const daysUntilDue = customer.nextExpectedOrderDate
          ? Math.floor(
              (customer.nextExpectedOrderDate.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        const daysOverdue = daysUntilDue !== null && daysUntilDue < 0
          ? Math.abs(daysUntilDue)
          : 0;

        // Calculate average order value from recent orders
        const avgOrderValue = customer.orders.length > 0
          ? customer.orders.reduce((sum, order) => sum + Number(order.total || 0), 0) /
            customer.orders.length
          : 0;

        // Check if customer has been contacted recently (last 7 days)
        const recentContact = customer.activities.some((activity) =>
          activity.occurredAt >= addDays(now, -7)
        );

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
            averageIntervalDays: customer.averageOrderIntervalDays,
            daysUntilDue,
            daysOverdue,
            isOverdue: daysOverdue > 0,
          },
          revenueMetrics: {
            establishedRevenue: Number(customer.establishedRevenue || 0),
            avgOrderValue: avgOrderValue.toFixed(2),
            recentOrderCount: customer.orders.length,
          },
          engagement: {
            recentContact,
            lastActivity: customer.activities[0]
              ? {
                  type: customer.activities[0].activityType.name,
                  occurredAt: customer.activities[0].occurredAt.toISOString(),
                }
              : null,
          },
          recentOrders: customer.orders.map((order) => ({
            id: order.id,
            total: Number(order.total || 0),
            deliveredAt: order.deliveredAt?.toISOString() || null,
          })),
          actions: {
            quickOrderLink: `/sales/orders/create?customerId=${customer.id}`,
            contactLink: `/sales/customers/${customer.id}/contact`,
            viewCustomerLink: `/sales/customers/${customer.id}`,
          },
        };
      });

      // Calculate summary statistics
      const summary = {
        totalDue: totalCount,
        overdueCount: data.filter((c) => c.orderingPattern.isOverdue).length,
        dueThisWeek: data.filter((c) => !c.orderingPattern.isOverdue).length,
        contactedRecently: data.filter((c) => c.engagement.recentContact).length,
        needsContact: data.filter((c) => !c.engagement.recentContact).length,
        potentialRevenue: data.reduce((sum, c) => sum + Number(c.revenueMetrics.avgOrderValue), 0),
      };

      return NextResponse.json({
        summary,
        data,
        metadata: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
          timeframe,
          timestamp: now.toISOString(),
        },
        insights: {
          highPriority: data
            .filter((c) => c.orderingPattern.isOverdue && !c.engagement.recentContact)
            .slice(0, 5)
            .map((c) => ({
              customerId: c.id,
              customerName: c.name,
              daysOverdue: c.orderingPattern.daysOverdue,
              potentialRevenue: parseFloat(Number(c.revenueMetrics.avgOrderValue).toFixed(2)),
              action: "Contact urgently - overdue and no recent contact",
            })),
          topRevenue: [...data]
            .sort((a, b) => Number(b.revenueMetrics.avgOrderValue) - Number(a.revenueMetrics.avgOrderValue))
            .slice(0, 5)
            .map((c) => ({
              customerId: c.id,
              customerName: c.name,
              avgOrderValue: parseFloat(Number(c.revenueMetrics.avgOrderValue).toFixed(2)),
            })),
        },
      });
    }
  );
}
