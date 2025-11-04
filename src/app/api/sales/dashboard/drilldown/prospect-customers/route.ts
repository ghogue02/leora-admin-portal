import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { generateDrilldownActions, formatActionSteps } from "@/lib/ai/drilldown-actions";

/**
 * GET /api/sales/dashboard/drilldown/prospect-customers
 * Returns detailed list of prospect customers (never ordered, < 90 days old)
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

      // Fetch prospect customers (never ordered, < 90 days since creation)
      const prospects = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          riskStatus: "PROSPECT",
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
          createdAt: "desc", // Newest prospects first
        },
      });

      // Calculate engagement metrics
      const items = prospects.map((customer) => {
        const daysSinceCreated = Math.floor(
          (now.getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );
        const lastActivity = customer.activities[0];

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
          ? `${lastActivity.activityType.name} (${new Date(lastActivity.occurredAt).toLocaleDateString()})`
          : "No activity",
          status: "PROSPECT",
          urgency: daysSinceCreated > 60 ? "HIGH" : daysSinceCreated > 30 ? "MEDIUM" : "LOW",
        };
      });

      // Calculate summary statistics
      const highUrgency = items.filter((i) => i.urgency === "HIGH").length;
      const mediumUrgency = items.filter((i) => i.urgency === "MEDIUM").length;
      const lowUrgency = items.filter((i) => i.urgency === "LOW").length;
      const withActivity = items.filter((i) => i.lastActivity !== "No activity").length;

      const summary = {
        totalProspects: prospects.length,
        highUrgency,
        mediumUrgency,
        lowUrgency,
        withActivity,
        engagementRate: prospects.length > 0
          ? ((withActivity / prospects.length) * 100).toFixed(1) + "%"
          : "0%",
      };

      const insightMessages = [
        `${highUrgency} prospects in system 60+ days without converting - high urgency outreach needed`,
        `${withActivity} of ${prospects.length} prospects (${summary.engagementRate}) have engagement history`,
        `${mediumUrgency} prospects at 30-60 days - schedule demos and tastings`,
        `${lowUrgency} prospects under 30 days - maintain regular contact`,
        prospects.length > 0
          ? "Focus on converting recent prospects while they're still warm"
          : "No recent prospects - consider lead generation campaigns",
      ];

      // Generate AI-powered action steps
      const aiActionSteps = await generateDrilldownActions({
        drilldownType: 'prospect-customers',
        customerData: items,
        summary,
        salesRepName: session.user.name || 'Sales Rep',
      });

      const formattedActions = formatActionSteps(aiActionSteps);

      return NextResponse.json({
        summary,
        data: items,
        metadata: {
          total: prospects.length,
          timestamp: now.toISOString(),
        },
        insights: insightMessages,
        aiActionSteps: formattedActions,
        columns: [
          { key: "customerName", label: "Customer", sortable: true },
          { key: "location", label: "Location" },
          { key: "accountType", label: "Type" },
          { key: "priority", label: "Priority" },
          { key: "daysSinceCreated", label: "Days Old", sortable: true },
          { key: "lastActivity", label: "Last Activity" },
          { key: "urgency", label: "Urgency" },
        ],
      });
    }
  );
}
