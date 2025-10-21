import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subDays } from "date-fns";

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

      // Parse query parameters for pagination
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
      const offset = parseInt(searchParams.get("offset") || "0");

      const now = new Date();

      // Get at-risk customers with detailed information
      const atRiskCustomers = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          riskStatus: "AT_RISK_CADENCE",
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
            take: 5,
            select: {
              id: true,
              total: true,
              deliveredAt: true,
              orderedAt: true,
              status: true,
            },
          },
          activities: {
            orderBy: {
              occurredAt: "desc",
            },
            take: 3,
            include: {
              activityType: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
          tasks: {
            where: {
              status: {
                in: ["PENDING", "IN_PROGRESS"],
              },
            },
            orderBy: {
              dueAt: "asc",
            },
            take: 3,
          },
        },
        orderBy: {
          lastOrderDate: "asc",
        },
        skip: offset,
        take: limit,
      });

      // Get total count for pagination
      const totalCount = await db.customer.count({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          riskStatus: "AT_RISK_CADENCE",
          isPermanentlyClosed: false,
        },
      });

      // Calculate metrics for each customer
      const data = atRiskCustomers.map((customer) => {
        const daysSinceLastOrder = customer.lastOrderDate
          ? Math.floor(
              (now.getTime() - customer.lastOrderDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        const expectedIntervalDays = customer.averageOrderIntervalDays || 0;
        const daysOverdue = expectedIntervalDays > 0 && daysSinceLastOrder
          ? Math.max(0, daysSinceLastOrder - expectedIntervalDays)
          : 0;

        const latenessPct = expectedIntervalDays > 0 && daysOverdue > 0
          ? (daysOverdue / expectedIntervalDays) * 100
          : 0;

        // Calculate trend from recent orders
        const recentRevenue = customer.orders.slice(0, 3).reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );
        const avgRecentRevenue = customer.orders.length > 0
          ? recentRevenue / Math.min(3, customer.orders.length)
          : 0;

        // Determine recommended action
        let recommendedAction = "Schedule check-in call";
        if (daysOverdue > 14) {
          recommendedAction = "Urgent: In-person visit required";
        } else if (daysOverdue > 7) {
          recommendedAction = "Call to understand ordering pause";
        }

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
          riskMetrics: {
            daysSinceLastOrder,
            expectedIntervalDays,
            daysOverdue,
            latenessPct: latenessPct.toFixed(1),
            lastOrderDate: customer.lastOrderDate?.toISOString() || null,
            nextExpectedOrderDate: customer.nextExpectedOrderDate?.toISOString() || null,
          },
          revenueMetrics: {
            establishedRevenue: Number(customer.establishedRevenue || 0),
            avgRecentRevenue: avgRecentRevenue.toFixed(2),
            totalRecentOrders: customer.orders.length,
          },
          recentActivity: customer.activities.map((activity) => ({
            id: activity.id,
            type: activity.activityType.name,
            typeCode: activity.activityType.code,
            subject: activity.subject,
            occurredAt: activity.occurredAt.toISOString(),
            outcome: activity.outcome,
          })),
          pendingTasks: customer.tasks.map((task) => ({
            id: task.id,
            title: task.title,
            dueAt: task.dueAt?.toISOString() || null,
            status: task.status,
            priority: task.priority,
          })),
          recentOrders: customer.orders.map((order) => ({
            id: order.id,
            total: Number(order.total || 0),
            deliveredAt: order.deliveredAt?.toISOString() || null,
            status: order.status,
          })),
          recommendedAction,
        };
      });

      // Calculate summary statistics
      const summary = {
        totalAtRisk: totalCount,
        criticalCount: data.filter((c) => Number(c.riskMetrics.daysOverdue) > 14).length,
        urgentCount: data.filter((c) => Number(c.riskMetrics.daysOverdue) > 7 && Number(c.riskMetrics.daysOverdue) <= 14).length,
        moderateCount: data.filter((c) => Number(c.riskMetrics.daysOverdue) <= 7).length,
        avgDaysOverdue: data.length > 0
          ? (data.reduce((sum, c) => sum + Number(c.riskMetrics.daysOverdue), 0) / data.length).toFixed(1)
          : "0",
        totalRevenueAtRisk: data.reduce((sum, c) => sum + c.revenueMetrics.establishedRevenue, 0),
      };

      return NextResponse.json({
        summary,
        data,
        metadata: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
          timestamp: now.toISOString(),
        },
        insights: {
          topPriorities: data
            .filter((c) => Number(c.riskMetrics.daysOverdue) > 7)
            .slice(0, 5)
            .map((c) => ({
              customerId: c.id,
              customerName: c.name,
              daysOverdue: c.riskMetrics.daysOverdue,
              action: c.recommendedAction,
            })),
        },
      });
    }
  );
}
