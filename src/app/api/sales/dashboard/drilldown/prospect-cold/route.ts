import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

/**
 * GET /api/sales/dashboard/drilldown/prospect-cold
 * Returns detailed list of cold prospect customers (never ordered, 90+ days old)
 */
export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Get sales rep profile
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

      // Fetch cold prospect customers (never ordered, 90+ days since creation)
      const coldProspects = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          riskStatus: "PROSPECT_COLD",
          isPermanentlyClosed: false,
        },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        phone: true,
        billingEmail: true,
        city: true,
        state: true,
        accountType: true,
        accountPriority: true,
        createdAt: true,
        activities: {
          orderBy: { occurredAt: "desc" },
          take: 1,
          select: {
            occurredAt: true,
            activityType: {
              select: { name: true },
            },
          },
        },
        },
        orderBy: {
          createdAt: "asc", // Oldest first (highest priority)
        },
      });

      // Calculate engagement metrics
      const items = coldProspects.map((customer) => {
        const daysSinceCreated = Math.floor(
          (now.getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const lastActivity = customer.activities[0];
        const daysSinceActivity = lastActivity
          ? Math.floor((now.getTime() - new Date(lastActivity.occurredAt).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return {
        id: customer.id,
        customerName: customer.name,
        accountNumber: customer.accountNumber || "N/A",
        contactEmail: customer.billingEmail || "N/A",
        contactPhone: customer.phone || "N/A",
        location: `${customer.city || ""}${customer.city && customer.state ? ", " : ""}${customer.state || ""}`.trim() || "N/A",
        accountType: customer.accountType || "N/A",
        priority: customer.accountPriority || "N/A",
        daysSinceCreated,
        createdDate: customer.createdAt.toISOString().split("T")[0],
        lastActivity: lastActivity
          ? `${lastActivity.activityType.name} (${daysSinceActivity} days ago)`
          : "No activity",
          status: "COLD_LEAD",
          recommendation: daysSinceCreated > 180
            ? "Consider archiving or cleanup"
            : daysSinceActivity && daysSinceActivity > 60
            ? "Re-engage with samples or tasting invite"
            : "Schedule demo or first contact",
        };
      });

      // Calculate summary statistics
      const veryOld = items.filter((i) => i.daysSinceCreated > 180).length;
      const old = items.filter((i) => i.daysSinceCreated > 120 && i.daysSinceCreated <= 180).length;
      const moderate = items.filter((i) => i.daysSinceCreated >= 90 && i.daysSinceCreated <= 120).length;
      const withActivity = items.filter((i) => i.lastActivity !== "No activity").length;

      const summary = {
        totalColdLeads: coldProspects.length,
        veryOld180Plus: veryOld,
        old120to180: old,
        moderate90to120: moderate,
        withActivity,
        engagementRate: coldProspects.length > 0
          ? ((withActivity / coldProspects.length) * 100).toFixed(1) + "%"
          : "0%",
      };

      const insightMessages = [
        `${veryOld} leads are 180+ days old - consider archiving or final re-engagement campaign`,
        `${withActivity} of ${coldProspects.length} cold leads (${summary.engagementRate}) have had some engagement - worth re-contacting`,
        `${coldProspects.length - withActivity} leads have never been contacted - low conversion probability`,
        `${old} leads are 120-180 days old - final attempt recommended`,
        coldProspects.length > 100
          ? "Large cold lead pool - consider cleanup or targeted win-back campaign"
          : "Manageable cold lead list - schedule systematic re-engagement",
      ];

      return NextResponse.json({
        summary,
        data: items,
        metadata: {
          total: coldProspects.length,
          timestamp: now.toISOString(),
        },
        insights: insightMessages,
        columns: [
          { key: "customerName", label: "Customer", sortable: true },
          { key: "location", label: "Location" },
          { key: "accountType", label: "Type" },
          { key: "priority", label: "Priority" },
          { key: "daysSinceCreated", label: "Days Old", sortable: true },
          { key: "lastActivity", label: "Last Activity" },
          { key: "recommendation", label: "Recommendation" },
        ],
      });
    }
  );
}
