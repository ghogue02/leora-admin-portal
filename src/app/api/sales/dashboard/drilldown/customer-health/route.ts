import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, format } from "date-fns";

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
      const sixMonthsAgo = subMonths(now, 6);

      // Get current customer health status counts
      const currentHealthStatus = await db.customer.groupBy({
        by: ["riskStatus"],
        where: {
          tenantId,
          salesRepId: salesRep.id,
          isPermanentlyClosed: false,
        },
        _count: {
          _all: true,
        },
      });

      // Get all customers with their health snapshots over time
      const customers = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          isPermanentlyClosed: false,
        },
        select: {
          id: true,
          name: true,
          riskStatus: true,
          lastOrderDate: true,
          establishedRevenue: true,
          averageOrderIntervalDays: true,
          createdAt: true,
        },
      });

      // Get historical snapshots for trend analysis
      const snapshots = await db.accountHealthSnapshot.findMany({
        where: {
          tenantId,
          customer: {
            salesRepId: salesRep.id,
          },
          snapshotDate: {
            gte: sixMonthsAgo,
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
          snapshotDate: "asc",
        },
      });

      // Group snapshots by month to see trends
      const months = eachMonthOfInterval({
        start: sixMonthsAgo,
        end: now,
      });

      const monthlyTrends = months.map((month) => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);

        const monthSnapshots = snapshots.filter(
          (s) => s.snapshotDate >= monthStart && s.snapshotDate <= monthEnd
        );

        // Get the most recent snapshot per customer in this month
        const customerLatestSnapshots = monthSnapshots.reduce((acc, snapshot) => {
          const customerId = snapshot.customerId;
          if (!acc[customerId] || snapshot.snapshotDate > acc[customerId].snapshotDate) {
            acc[customerId] = snapshot;
          }
          return acc;
        }, {} as Record<string, any>);

        const snapshots_arr = Object.values(customerLatestSnapshots);

        const statusCounts = {
          HEALTHY: snapshots_arr.filter((s: any) => s.riskStatus === "HEALTHY").length,
          AT_RISK_CADENCE: snapshots_arr.filter((s: any) => s.riskStatus === "AT_RISK_CADENCE").length,
          AT_RISK_REVENUE: snapshots_arr.filter((s: any) => s.riskStatus === "AT_RISK_REVENUE").length,
          DORMANT: snapshots_arr.filter((s: any) => s.riskStatus === "DORMANT").length,
          CLOSED: snapshots_arr.filter((s: any) => s.riskStatus === "CLOSED").length,
        };

        return {
          month: format(month, "yyyy-MM"),
          monthLabel: format(month, "MMM yyyy"),
          ...statusCounts,
          total: snapshots_arr.length,
        };
      });

      // Calculate transition matrix (how customers move between statuses)
      // Group snapshots by customer and sort by date
      const customerSnapshots = snapshots.reduce((acc, snapshot) => {
        const customerId = snapshot.customerId;
        if (!acc[customerId]) {
          acc[customerId] = [];
        }
        acc[customerId].push(snapshot);
        return acc;
      }, {} as Record<string, any[]>);

      // Track transitions
      const transitions: Record<string, Record<string, number>> = {
        HEALTHY: { HEALTHY: 0, AT_RISK_CADENCE: 0, AT_RISK_REVENUE: 0, DORMANT: 0, CLOSED: 0 },
        AT_RISK_CADENCE: { HEALTHY: 0, AT_RISK_CADENCE: 0, AT_RISK_REVENUE: 0, DORMANT: 0, CLOSED: 0 },
        AT_RISK_REVENUE: { HEALTHY: 0, AT_RISK_CADENCE: 0, AT_RISK_REVENUE: 0, DORMANT: 0, CLOSED: 0 },
        DORMANT: { HEALTHY: 0, AT_RISK_CADENCE: 0, AT_RISK_REVENUE: 0, DORMANT: 0, CLOSED: 0 },
        CLOSED: { HEALTHY: 0, AT_RISK_CADENCE: 0, AT_RISK_REVENUE: 0, DORMANT: 0, CLOSED: 0 },
      };

      Object.values(customerSnapshots).forEach((snapshots_list) => {
        // Sort by date
        const sorted = snapshots_list.sort(
          (a, b) => a.snapshotDate.getTime() - b.snapshotDate.getTime()
        );

        // Track transitions between consecutive snapshots
        for (let i = 0; i < sorted.length - 1; i++) {
          const fromStatus = sorted[i].riskStatus;
          const toStatus = sorted[i + 1].riskStatus;
          if (transitions[fromStatus] && transitions[fromStatus][toStatus] !== undefined) {
            transitions[fromStatus][toStatus]++;
          }
        }
      });

      // Calculate transition probabilities
      const transitionMatrix = Object.entries(transitions).map(([fromStatus, toStatuses]) => {
        const total = Object.values(toStatuses).reduce((sum: number, count) => sum + (count as number), 0);
        const probabilities = Object.entries(toStatuses).reduce((acc, [status, count]) => {
          acc[status] = total > 0 ? ((count as number) / total) * 100 : 0;
          return acc;
        }, {} as Record<string, number>);

        return {
          fromStatus,
          total,
          transitions: toStatuses,
          probabilities,
        };
      });

      // Current status distribution
      const statusDistribution = {
        HEALTHY: 0,
        AT_RISK_CADENCE: 0,
        AT_RISK_REVENUE: 0,
        DORMANT: 0,
        CLOSED: 0,
      };

      currentHealthStatus.forEach((group) => {
        statusDistribution[group.riskStatus] = group._count._all;
      });

      const totalCustomers = Object.values(statusDistribution).reduce((sum, count) => sum + count, 0);

      // Health score calculation methodology
      const healthScoreMethodology = {
        description: "Customer health score is calculated based on ordering patterns, revenue trends, and engagement",
        factors: [
          {
            factor: "Ordering Cadence",
            weight: "40%",
            description: "Consistency with expected ordering intervals",
          },
          {
            factor: "Revenue Trend",
            weight: "35%",
            description: "Revenue growth or decline over recent periods",
          },
          {
            factor: "Engagement",
            weight: "15%",
            description: "Recent activities, communications, and interactions",
          },
          {
            factor: "Payment Behavior",
            weight: "10%",
            description: "Timeliness of payments and outstanding balances",
          },
        ],
        statusCriteria: {
          HEALTHY: "Ordering regularly within expected intervals, stable or growing revenue",
          AT_RISK_CADENCE: "Ordering frequency declining, gaps exceeding average interval",
          AT_RISK_REVENUE: "Revenue declining by 15% or more compared to established baseline",
          DORMANT: "No orders for 45+ days, significantly overdue based on ordering pattern",
          CLOSED: "Permanently closed or no longer doing business",
        },
      };

      // Summary statistics
      const summary = {
        totalCustomers,
        statusDistribution,
        statusPercentages: {
          HEALTHY: totalCustomers > 0 ? ((statusDistribution.HEALTHY / totalCustomers) * 100).toFixed(1) : "0",
          AT_RISK_CADENCE: totalCustomers > 0 ? ((statusDistribution.AT_RISK_CADENCE / totalCustomers) * 100).toFixed(1) : "0",
          AT_RISK_REVENUE: totalCustomers > 0 ? ((statusDistribution.AT_RISK_REVENUE / totalCustomers) * 100).toFixed(1) : "0",
          DORMANT: totalCustomers > 0 ? ((statusDistribution.DORMANT / totalCustomers) * 100).toFixed(1) : "0",
          CLOSED: totalCustomers > 0 ? ((statusDistribution.CLOSED / totalCustomers) * 100).toFixed(1) : "0",
        },
        atRiskTotal: statusDistribution.AT_RISK_CADENCE + statusDistribution.AT_RISK_REVENUE + statusDistribution.DORMANT,
        healthyPercentage: totalCustomers > 0
          ? ((statusDistribution.HEALTHY / totalCustomers) * 100).toFixed(1)
          : "0",
      };

      return NextResponse.json({
        summary,
        data: {
          currentStatus: statusDistribution,
          monthlyTrends,
          transitionMatrix,
          healthScoreMethodology,
        },
        metadata: {
          timeRange: {
            start: sixMonthsAgo.toISOString(),
            end: now.toISOString(),
          },
          snapshotCount: snapshots.length,
          timestamp: now.toISOString(),
        },
        insights: {
          improvementRate:
            transitionMatrix.find((t) => t.fromStatus === "AT_RISK_CADENCE")?.probabilities.HEALTHY || 0,
          deteriorationRate:
            transitionMatrix.find((t) => t.fromStatus === "HEALTHY")?.probabilities.AT_RISK_CADENCE || 0,
          reactivationRate:
            transitionMatrix.find((t) => t.fromStatus === "DORMANT")?.probabilities.HEALTHY || 0,
          trendDirection: monthlyTrends.length >= 2
            ? monthlyTrends[monthlyTrends.length - 1].HEALTHY > monthlyTrends[monthlyTrends.length - 2].HEALTHY
              ? "improving"
              : "declining"
            : "stable",
        },
      });
    }
  );
}
