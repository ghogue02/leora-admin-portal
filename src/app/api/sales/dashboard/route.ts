import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, subWeeks, getISOWeek, getYear, addDays, startOfYear, startOfMonth, subMonths, endOfMonth } from "date-fns";

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
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
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
      const monthStart = startOfMonth(now); // Start of current month
      const monthEnd = endOfMonth(now); // End of current month
      const lastMonthStart = startOfMonth(subMonths(now, 1)); // Start of last month
      const lastMonthEnd = endOfMonth(subMonths(now, 1)); // End of last month
      const yearStart = startOfYear(now); // January 1st of current year

      // Keep week calculations for activities only
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

      // Get current month metrics
      const [
        currentMonthRevenue,
        lastMonthRevenue,
        mtdRevenue,
        ytdRevenue,
        allTimeRevenue,
        customerRiskCounts,
        recentActivities,
        upcomingEvents,
        customersDue,
        weeklyMetrics,
        pendingTasks,
      ] = await Promise.all([
        // Current month revenue (MTD - delivered orders only)
        db.order.aggregate({
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
          _sum: {
            total: true,
          },
          _count: {
            customerId: true,
          },
        }),

        // Last month revenue for comparison (full month)
        db.order.aggregate({
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
          _sum: {
            total: true,
          },
        }),

        // MTD revenue (Month-to-Date from start of current month)
        db.order.aggregate({
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
          _sum: {
            total: true,
          },
          _count: {
            customerId: true,
          },
        }),

        // YTD revenue (Year-to-Date from January 1)
        db.order.aggregate({
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
          _sum: {
            total: true,
          },
          _count: {
            customerId: true,
          },
        }),

        // All-time revenue (for display when no current week revenue)
        db.order.aggregate({
          where: {
            tenantId,
            customer: {
              salesRepId: salesRep.id,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
          _count: {
            customerId: true,
          },
        }),

        // Customer risk status counts
        db.customer.groupBy({
          by: ["riskStatus"],
          where: {
            tenantId,
            salesRepId: salesRep.id,
            isPermanentlyClosed: false,
          },
          _count: {
            _all: true,
          },
        }),

        // Recent activities (last 7 days)
        db.activity.findMany({
          where: {
            tenantId,
            userId: session.user.id,
            occurredAt: {
              gte: subWeeks(now, 1),
            },
          },
          include: {
            activityType: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            occurredAt: "desc",
          },
          take: 10,
        }),

        // Upcoming calendar events (next 7-10 days)
        db.calendarEvent.findMany({
          where: {
            tenantId,
            userId: session.user.id,
            startTime: {
              gte: now,
              lte: addDays(now, 10),
            },
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            startTime: "asc",
          },
          take: 5,
        }),

        // Customers due to order this week
        db.customer.findMany({
          where: {
            tenantId,
            salesRepId: salesRep.id,
            isPermanentlyClosed: false,
            nextExpectedOrderDate: {
              lte: currentWeekEnd,
            },
            riskStatus: {
              in: ["HEALTHY", "AT_RISK_CADENCE"],
            },
          },
          select: {
            id: true,
            name: true,
            nextExpectedOrderDate: true,
            lastOrderDate: true,
            averageOrderIntervalDays: true,
            riskStatus: true,
          },
          orderBy: {
            nextExpectedOrderDate: "asc",
          },
          take: 10,
        }),

        // Get weekly metrics record (if exists)
        db.repWeeklyMetric.findFirst({
          where: {
            tenantId,
            salesRepId: salesRep.id,
            weekStartDate: currentWeekStart,
          },
        }),

        // Pending tasks from management
        db.task.findMany({
          where: {
            tenantId,
            userId: session.user.id,
            status: {
              in: ["PENDING", "IN_PROGRESS"],
            },
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            dueAt: "asc",
          },
          take: 5,
        }),
      ]);

      // Calculate metrics - Now using month-over-month
      const currentRevenue = Number(currentMonthRevenue._sum.total ?? 0);
      const lastRevenue = Number(lastMonthRevenue._sum.total ?? 0);
      const mtdRevenueAmount = Number(mtdRevenue._sum.total ?? 0);
      const ytdRevenueAmount = Number(ytdRevenue._sum.total ?? 0);
      const totalRevenue = Number(allTimeRevenue._sum.total ?? 0);
      const revenueChange = lastRevenue > 0
        ? ((currentRevenue - lastRevenue) / lastRevenue) * 100
        : 0;

      // Aggregate risk counts
      const riskCounts = customerRiskCounts.reduce(
        (acc, group) => {
          acc[group.riskStatus] = group._count._all;
          return acc;
        },
        {
          HEALTHY: 0,
          AT_RISK_CADENCE: 0,
          AT_RISK_REVENUE: 0,
          DORMANT: 0,
          CLOSED: 0,
        } as Record<string, number>
      );

      // Activity summary (group by type)
      const activitySummary = recentActivities.reduce(
        (acc, activity) => {
          const typeCode = activity.activityType.code;
          acc[typeCode] = (acc[typeCode] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      // Calculate quota progress - Now using monthly quota
      const weeklyQuota = Number(salesRep.weeklyRevenueQuota ?? 0);
      const monthlyQuota = weeklyQuota * 4.33; // Average weeks per month
      const quotaProgress = monthlyQuota > 0 ? (currentRevenue / monthlyQuota) * 100 : 0;

      return NextResponse.json({
        salesRep: {
          id: salesRep.id,
          name: salesRep.user.fullName,
          email: salesRep.user.email,
          territory: salesRep.territoryName,
          deliveryDay: salesRep.deliveryDay,
          weeklyQuota: weeklyQuota,
          monthlyQuota: monthlyQuota,
          quarterlyQuota: Number(salesRep.quarterlyRevenueQuota ?? 0),
          annualQuota: Number(salesRep.annualRevenueQuota ?? 0),
        },
        metrics: {
          currentMonth: {
            revenue: currentRevenue,
            uniqueCustomers: currentMonthRevenue._count.customerId,
            quotaProgress,
          },
          lastMonth: {
            revenue: lastRevenue,
          },
          mtd: {
            revenue: mtdRevenueAmount,
            uniqueCustomers: mtdRevenue._count.customerId,
          },
          ytd: {
            revenue: ytdRevenueAmount,
            uniqueCustomers: ytdRevenue._count.customerId,
          },
          allTime: {
            revenue: totalRevenue,
            uniqueCustomers: allTimeRevenue._count.customerId,
          },
          comparison: {
            revenueChange,
            revenueChangePercent: revenueChange.toFixed(1),
          },
          weeklyMetrics: weeklyMetrics
            ? {
                inPersonVisits: weeklyMetrics.inPersonVisits,
                tastingAppointments: weeklyMetrics.tastingAppointments,
                emailContacts: weeklyMetrics.emailContacts,
                phoneContacts: weeklyMetrics.phoneContacts,
                textContacts: weeklyMetrics.textContacts,
                newCustomersAdded: weeklyMetrics.newCustomersAdded,
                reactivatedCustomers: weeklyMetrics.reactivatedCustomersCount,
              }
            : null,
        },
        customerHealth: {
          healthy: riskCounts.HEALTHY,
          atRiskCadence: riskCounts.AT_RISK_CADENCE,
          atRiskRevenue: riskCounts.AT_RISK_REVENUE,
          dormant: riskCounts.DORMANT,
          closed: riskCounts.CLOSED,
          total:
            riskCounts.HEALTHY +
            riskCounts.AT_RISK_CADENCE +
            riskCounts.AT_RISK_REVENUE +
            riskCounts.DORMANT,
        },
        activities: {
          recent: recentActivities.map((activity) => ({
            id: activity.id,
            type: activity.activityType.name,
            typeCode: activity.activityType.code,
            subject: activity.subject,
            notes: activity.notes,
            occurredAt: activity.occurredAt.toISOString(),
            customer: activity.customer
              ? {
                  id: activity.customer.id,
                  name: activity.customer.name,
                }
              : null,
            outcome: activity.outcome,
          })),
          summary: activitySummary,
        },
        upcomingEvents: upcomingEvents.map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          eventType: event.eventType,
          location: event.location,
          customer: event.customer
            ? {
                id: event.customer.id,
                name: event.customer.name,
              }
            : null,
        })),
        customersDue: customersDue.map((customer) => ({
          id: customer.id,
          name: customer.name,
          lastOrderDate: customer.lastOrderDate?.toISOString() ?? null,
          nextExpectedOrderDate: customer.nextExpectedOrderDate?.toISOString() ?? null,
          averageOrderIntervalDays: customer.averageOrderIntervalDays,
          riskStatus: customer.riskStatus,
          daysOverdue: customer.nextExpectedOrderDate
            ? Math.max(
                0,
                Math.floor(
                  (now.getTime() - customer.nextExpectedOrderDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              )
            : 0,
        })),
        tasks: pendingTasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.description,
          dueAt: task.dueAt?.toISOString() ?? null,
          status: task.status,
          customer: task.customer
            ? {
                id: task.customer.id,
                name: task.customer.name,
              }
            : null,
        })),
      });
    }
  );
}
