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

      // Get all customers
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

      // Calculate total customers EXCLUDING CLOSED to match tile calculation
      const totalCustomers =
        statusDistribution.HEALTHY +
        statusDistribution.AT_RISK_CADENCE +
        statusDistribution.AT_RISK_REVENUE +
        statusDistribution.DORMANT;
      // Explicitly exclude CLOSED to match tile calculation

      // Monthly Trends - Show current month only (historical snapshots not implemented)
      const monthlyTrends = [
        {
          month: format(now, "yyyy-MM"),
          monthLabel: format(now, "MMM yyyy"),
          HEALTHY: statusDistribution.HEALTHY,
          AT_RISK_CADENCE: statusDistribution.AT_RISK_CADENCE,
          AT_RISK_REVENUE: statusDistribution.AT_RISK_REVENUE,
          DORMANT: statusDistribution.DORMANT,
          CLOSED: statusDistribution.CLOSED,
          total: totalCustomers,
        },
      ];

      // Transition Matrix - Simplified (no historical data available)
      const transitionMatrix = [
        {
          fromStatus: 'HEALTHY',
          total: 0,
          transitions: { HEALTHY: 0, AT_RISK_CADENCE: 0, AT_RISK_REVENUE: 0, DORMANT: 0, CLOSED: 0 },
          probabilities: { HEALTHY: 0, AT_RISK_CADENCE: 0, AT_RISK_REVENUE: 0, DORMANT: 0, CLOSED: 0 },
        },
        {
          fromStatus: 'DORMANT',
          total: 0,
          transitions: { HEALTHY: 0, AT_RISK_CADENCE: 0, AT_RISK_REVENUE: 0, DORMANT: 0, CLOSED: 0 },
          probabilities: { HEALTHY: 0, AT_RISK_CADENCE: 0, AT_RISK_REVENUE: 0, DORMANT: 0, CLOSED: 0 },
        },
      ];

      // Health score calculation methodology - SIMPLIFIED
      const healthScoreMethodology = {
        description: "Customer health is based on recency of last order",
        statusCriteria: {
          HEALTHY: "Last order within 45 days",
          DORMANT: "45+ days since last order OR never ordered",
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
          timestamp: now.toISOString(),
          snapshotNote: "Historical trends require snapshot data (not yet implemented)",
        },
        insights: {
          improvementRate: 0,
          deteriorationRate: 0,
          reactivationRate: 0,
          trendDirection: "stable",
        },
      });
    }
  );
}
