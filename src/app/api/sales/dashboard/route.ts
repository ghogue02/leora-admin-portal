import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { buildCustomerHealthSnapshot } from "@/lib/sales/customer-health-service";
import {
  activitySampleItemSelect,
  activitySampleItemWithActivitySelect,
  serializeSampleFollowUp,
} from "@/app/api/sales/activities/_helpers";
import {
  startOfWeek,
  endOfWeek,
  subWeeks,
  addDays,
  startOfYear,
  startOfMonth,
  subMonths,
  endOfMonth,
  subDays,
} from "date-fns";

const MANAGER_EMAIL = "travis@wellcraftedbeverage.com";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const impersonationAllowed = session.user.email?.toLowerCase() === MANAGER_EMAIL;
      const requestedSalesRepId = request.nextUrl.searchParams.get("salesRepId");

      const commonInclude = {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      } as const;

      const viewerSalesRep = session.user.salesRep?.id
        ? await db.salesRep.findUnique({
            where: {
              tenantId_userId: {
                tenantId,
                userId: session.user.id,
              },
            },
            ...commonInclude,
          })
        : null;

      let salesRep = viewerSalesRep;

      if (requestedSalesRepId && impersonationAllowed) {
        salesRep = await db.salesRep.findFirst({
          where: {
            tenantId,
            id: requestedSalesRepId,
          },
          ...commonInclude,
        });
      }

      if (!salesRep && impersonationAllowed) {
        salesRep = await db.salesRep.findFirst({
          where: {
            tenantId,
            isActive: true,
          },
          orderBy: {
            user: {
              fullName: "asc",
            },
          },
          ...commonInclude,
        });
      }

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

      const managerReps = impersonationAllowed
        ? await db.salesRep.findMany({
            where: {
              tenantId,
              isActive: true,
            },
            orderBy: {
              user: {
                fullName: "asc",
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
          })
        : [];

      const managerView = {
        enabled: impersonationAllowed,
        selectedSalesRepId: salesRep.id,
        reps: managerReps.map((rep) => ({
          id: rep.id,
          name: rep.user.fullName ?? "Unnamed",
          territory: rep.territoryName,
          email: rep.user.email ?? null,
        })),
      };

      const targetUserId = salesRep.user.id;
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
        recentSampleItems,
        openSampleFollowUpItems,
        samplesLoggedThisWeek,
        samplesCompletedThisWeek,
        openSampleFollowUpCount,
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
            deliveredAt: {
              lte: now,
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
            userId: targetUserId,
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
            sampleItems: {
              select: activitySampleItemSelect,
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
            userId: targetUserId,
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
              in: ["HEALTHY", "AT_RISK_CADENCE", "AT_RISK_REVENUE"],
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
            userId: targetUserId,
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

        db.activitySampleItem.findMany({
          where: {
            activity: {
              tenantId,
              userId: targetUserId,
              occurredAt: {
                gte: subWeeks(now, 1),
              },
            },
          },
          select: activitySampleItemWithActivitySelect,
          orderBy: {
            activity: {
              occurredAt: "desc",
            },
          },
          take: 5,
        }),

        db.activitySampleItem.findMany({
          where: {
            followUpNeeded: true,
            followUpCompletedAt: null,
            activity: {
              tenantId,
              userId: targetUserId,
            },
          },
          select: activitySampleItemWithActivitySelect,
          orderBy: {
            activity: {
              occurredAt: "asc",
            },
          },
          take: 20,
        }),

        db.activitySampleItem.count({
          where: {
            activity: {
              tenantId,
              userId: targetUserId,
              occurredAt: {
                gte: currentWeekStart,
                lte: now,
              },
            },
          },
        }),

        db.activitySampleItem.count({
          where: {
            followUpCompletedAt: {
              gte: currentWeekStart,
              lte: now,
            },
            activity: {
              tenantId,
              userId: session.user.id,
            },
          },
        }),

        db.activitySampleItem.count({
          where: {
            followUpNeeded: true,
            followUpCompletedAt: null,
            activity: {
              tenantId,
              userId: session.user.id,
            },
          },
        }),
      ]);

      const sampleLookbackDays = 30;
      const samplePeriodStart = subDays(now, sampleLookbackDays);
      const periodSamples = await db.sampleUsage.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          tastedAt: {
            gte: samplePeriodStart,
            lte: now,
          },
        },
        select: {
          id: true,
          customerId: true,
          skuId: true,
          tastedAt: true,
          quantity: true,
          resultedInOrder: true,
        },
      });

      let periodSampleQuantity = 0;
      const periodCustomerIds = new Set<string>();
      const periodConvertedCustomerIds = new Set<string>();

      if (periodSamples.length > 0) {
        const customerIdList = Array.from(new Set(periodSamples.map((sample) => sample.customerId)));
        const skuIdList = Array.from(new Set(periodSamples.map((sample) => sample.skuId)));

        const periodOrders = await db.order.findMany({
          where: {
            tenantId,
            customerId: {
              in: customerIdList,
            },
            orderedAt: {
              gte: samplePeriodStart,
              lte: now,
            },
            lines: {
              some: {
                skuId: {
                  in: skuIdList,
                },
              },
            },
          },
          select: {
            id: true,
            customerId: true,
            orderedAt: true,
            lines: {
              select: {
                skuId: true,
                quantity: true,
                unitPrice: true,
              },
            },
          },
        });

        const ordersByCustomer = new Map<string, typeof periodOrders[number][]>();
        for (const order of periodOrders) {
          const bucket = ordersByCustomer.get(order.customerId) ?? [];
          bucket.push(order);
          ordersByCustomer.set(order.customerId, bucket);
        }

        for (const sample of periodSamples) {
          periodSampleQuantity += sample.quantity ?? 1;
          periodCustomerIds.add(sample.customerId);

          const windowEnd = addDays(sample.tastedAt, 30);
          const candidateOrders = ordersByCustomer.get(sample.customerId) ?? [];
          const convertedByOrder = candidateOrders.some((order) => {
            if (!order.orderedAt) return false;
            if (order.orderedAt < sample.tastedAt || order.orderedAt > windowEnd) {
              return false;
            }
            return order.lines.some(
              (line) => line.skuId === sample.skuId && Number(line.unitPrice) * line.quantity > 0,
            );
          });

          if (convertedByOrder || sample.resultedInOrder) {
            periodConvertedCustomerIds.add(sample.customerId);
          }
        }
      }

      const periodLabel = "Last 30 Days";
      const periodUniqueCustomers = periodCustomerIds.size;
      const periodConversionRate =
        periodUniqueCustomers > 0
          ? periodConvertedCustomerIds.size / periodUniqueCustomers
          : 0;

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

      // Aggregate risk counts (including new PROSPECT statuses)
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
          PROSPECT: 0,
          PROSPECT_COLD: 0,
          UNQUALIFIED: 0,
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

      const recentSamples = recentSampleItems.map(serializeSampleFollowUp);
      const openSampleFollowUpsSerialized = openSampleFollowUpItems.map(serializeSampleFollowUp);

      const sampleInsights = {
        metrics: {
          loggedThisWeek: samplesLoggedThisWeek,
          completedThisWeek: samplesCompletedThisWeek,
          openFollowUps: openSampleFollowUpCount,
          periodLabel,
          periodSampleQuantity,
          periodUniqueCustomers,
          periodCustomerConversionRate: periodConversionRate,
        },
        recentActivities: recentSamples,
        followUps: openSampleFollowUpsSerialized,
        alerts: buildSampleAlerts({
          samplesLoggedThisWeek,
          openSampleFollowUpCount,
          periodConversionRate,
          periodSampleQuantity,
        }),
      };

      const customerSnapshot = await buildCustomerHealthSnapshot({
        db,
        tenantId,
        salesRepId: salesRep.id,
        userId: session.user.id,
        now,
      });

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
          prospect: riskCounts.PROSPECT,
          prospectCold: riskCounts.PROSPECT_COLD,
          unqualified: riskCounts.UNQUALIFIED,
          total:
            riskCounts.HEALTHY +
            riskCounts.AT_RISK_CADENCE +
            riskCounts.AT_RISK_REVENUE +
            riskCounts.DORMANT,
          totalProspects: riskCounts.PROSPECT + riskCounts.PROSPECT_COLD,
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
            outcome: activity.outcomes?.[0] ?? null,
            outcomes: activity.outcomes ?? [],
            samples: (activity.sampleItems ?? []).map((item) => ({
              id: item.id,
              skuId: item.skuId,
              sampleListItemId: item.sampleListItemId ?? null,
              feedback: item.feedback ?? "",
              followUpNeeded: item.followUpNeeded ?? false,
              followUpCompletedAt: item.followUpCompletedAt?.toISOString() ?? null,
              sku: item.sku
                ? {
                    id: item.sku.id,
                    code: item.sku.code,
                    name: item.sku.product?.name ?? null,
                    brand: item.sku.product?.brand ?? null,
                    unitOfMeasure: item.sku.unitOfMeasure ?? null,
                    size: item.sku.size ?? null,
                  }
                : null,
            })),
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
        sampleInsights,
        managerView,
        accountPulse: customerSnapshot.accountPulse,
        customerSignals: customerSnapshot.signals,
        customerCoverage: customerSnapshot.coverage,
        portfolioHealth: customerSnapshot.portfolio,
        targetPipeline: customerSnapshot.targetPipeline,
        coldLeads: customerSnapshot.coldLeads,
        customerReportRows: customerSnapshot.reportRows,
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
    },
    { requireSalesRep: false }
  );
}

function buildSampleAlerts(params: {
  samplesLoggedThisWeek: number;
  openSampleFollowUpCount: number;
  periodConversionRate: number;
  periodSampleQuantity: number;
}) {
  const alerts: Array<{ id: string; message: string; severity: "info" | "warning" | "critical" }> = [];

  if (params.openSampleFollowUpCount > 0) {
    alerts.push({
      id: "follow-ups-open",
      message: `${params.openSampleFollowUpCount.toLocaleString()} sample follow-up${params.openSampleFollowUpCount === 1 ? "" : "s"} need attention.`,
      severity: params.openSampleFollowUpCount > 5 ? "critical" : "warning",
    });
  }

  if (params.samplesLoggedThisWeek === 0) {
    alerts.push({
      id: "no-samples-week",
      message: "No samples logged this week. Add at least one tasting to stay on track.",
      severity: "warning",
    });
  }

  if (params.periodSampleQuantity >= 10 && params.periodConversionRate < 0.25) {
    alerts.push({
      id: "conversion-low",
      message: "Conversion rate is trending low for this period.",
      severity: "info",
    });
  }

  return alerts;
}
