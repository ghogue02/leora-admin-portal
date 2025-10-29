import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, subWeeks, addDays, startOfYear, startOfMonth, subMonths, endOfMonth } from "date-fns";

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
      const lastMonthStart = startOfMonth(subMonths(now, 1)); // Start of last month
      const lastMonthEnd = endOfMonth(subMonths(now, 1)); // End of last month
      const yearStart = startOfYear(now); // January 1st of current year

      // Week calculations
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

      // Get metrics data
      const [
        currentWeekRevenue,
        lastWeekRevenue,
        currentMonthRevenue,
        lastMonthRevenue,
        ytdRevenue,
        allTimeRevenue,
        currentWeekUniqueCustomers,
        currentMonthUniqueCustomers,
        ytdUniqueCustomers,
        allTimeUniqueCustomers,
        customerRiskCounts,
        recentActivities,
        upcomingEvents,
        customersDue,
        weeklyMetrics,
        pendingTasks,
      ] = await Promise.all([
        // Current week revenue (delivered orders only)
        db.order.aggregate({
          where: {
            tenantId,
            customer: {
              salesRepId: salesRep.id,
            },
            deliveredAt: {
              gte: currentWeekStart,
              lte: now,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        }),

        // Last week revenue for comparison
        db.order.aggregate({
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
          _sum: {
            total: true,
          },
        }),

        // Month-to-date revenue (start of current month to now)
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
        }),

        // Distinct customers (current week)
        db.order
          .findMany({
            where: {
              tenantId,
              customer: {
                salesRepId: salesRep.id,
              },
              deliveredAt: {
                gte: currentWeekStart,
                lte: now,
              },
              status: {
                not: "CANCELLED",
              },
            },
            select: {
              customerId: true,
            },
            distinct: ["customerId"],
          })
          .then((rows) => rows.length),

        // Distinct customers (current month / MTD)
        db.order
          .findMany({
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
            select: {
              customerId: true,
            },
            distinct: ["customerId"],
          })
          .then((rows) => rows.length),

        // Distinct customers (YTD)
        db.order
          .findMany({
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
            select: {
              customerId: true,
            },
            distinct: ["customerId"],
          })
          .then((rows) => rows.length),

        // Distinct customers (all time)
        db.order
          .findMany({
            where: {
              tenantId,
              customer: {
                salesRepId: salesRep.id,
              },
              status: {
                not: "CANCELLED",
              },
            },
            select: {
              customerId: true,
            },
            distinct: ["customerId"],
          })
          .then((rows) => rows.length),

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

      // Calculate metrics
      const currentWeekRevenueAmount = Number(currentWeekRevenue._sum.total ?? 0);
      const lastWeekRevenueAmount = Number(lastWeekRevenue._sum.total ?? 0);
      const currentMonthRevenueAmount = Number(currentMonthRevenue._sum.total ?? 0);
      const lastMonthRevenueAmount = Number(lastMonthRevenue._sum.total ?? 0);
      const ytdRevenueAmount = Number(ytdRevenue._sum.total ?? 0);
      const totalRevenue = Number(allTimeRevenue._sum.total ?? 0);
      const revenueChange = lastWeekRevenueAmount > 0
        ? ((currentWeekRevenueAmount - lastWeekRevenueAmount) / lastWeekRevenueAmount) * 100
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

      // Calculate quota progress
      const weeklyQuota = Number(salesRep.weeklyRevenueQuota ?? 0);
      const monthlyQuotaValue = Number(salesRep.monthlyRevenueQuota ?? 0);
      const monthlyQuota = monthlyQuotaValue > 0 ? monthlyQuotaValue : weeklyQuota * 4.33; // Average weeks per month fallback
      const weeklyQuotaProgress = weeklyQuota > 0 ? (currentWeekRevenueAmount / weeklyQuota) * 100 : 0;
      const monthlyQuotaProgress = monthlyQuota > 0 ? (currentMonthRevenueAmount / monthlyQuota) * 100 : 0;

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
          currentWeek: {
            revenue: currentWeekRevenueAmount,
            uniqueCustomers: currentWeekUniqueCustomers,
            quotaProgress: weeklyQuotaProgress,
          },
          lastWeek: {
            revenue: lastWeekRevenueAmount,
          },
          currentMonth: {
            revenue: currentMonthRevenueAmount,
            uniqueCustomers: currentMonthUniqueCustomers,
            quotaProgress: monthlyQuotaProgress,
          },
          lastMonth: {
            revenue: lastMonthRevenueAmount,
          },
          mtd: {
            revenue: currentMonthRevenueAmount,
            uniqueCustomers: currentMonthUniqueCustomers,
          },
          ytd: {
            revenue: ytdRevenueAmount,
            uniqueCustomers: ytdUniqueCustomers,
          },
          allTime: {
            revenue: totalRevenue,
            uniqueCustomers: allTimeUniqueCustomers,
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
