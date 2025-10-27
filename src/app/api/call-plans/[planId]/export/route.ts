import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

/**
 * GET /api/call-plans/[planId]/export
 * Export call plan as PDF
 *
 * Note: This is a placeholder implementation. For production, you would:
 * 1. Install a PDF library like `pdfkit` or `puppeteer`
 * 2. Generate a formatted PDF with call plan details
 * 3. Return the PDF as a downloadable file
 *
 * For now, this returns JSON data that can be used by the frontend
 * to generate a PDF client-side or trigger a print dialog.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      // Get call plan with all details
      const callPlan = await db.callPlan.findUnique({
        where: {
          id: params.planId,
          tenantId,
          userId: session.user.id,
        },
        select: {
          id: true,
          name: true,
          description: true,
          effectiveAt: true,
          createdAt: true,
          user: {
            select: {
              fullName: true,
              email: true,
              salesRepProfile: {
                select: {
                  territoryName: true,
                },
              },
            },
          },
          tasks: {
            select: {
              id: true,
              description: true,
              status: true,
              priority: true,
              dueAt: true,
              createdAt: true,
              updatedAt: true,
              customer: {
                select: {
                  name: true,
                  accountNumber: true,
                  accountType: true,
                  riskStatus: true,
                  lastOrderDate: true,
                  nextExpectedOrderDate: true,
                  establishedRevenue: true,
                  phone: true,
                  billingEmail: true,
                  street1: true,
                  city: true,
                  state: true,
                  postalCode: true,
                },
              },
            },
            orderBy: [
              { priority: "desc" },
              { createdAt: "asc" },
            ],
          },
        },
      });

      if (!callPlan) {
        return NextResponse.json(
          { error: "Call plan not found" },
          { status: 404 }
        );
      }

      // Parse week/year from name
      const match = callPlan.name.match(/Week (\d+) \((\d{4})\)/);
      const week = match ? parseInt(match[1], 10) : 0;
      const year = match ? parseInt(match[2], 10) : new Date().getFullYear();

      // Format data for export
      const exportData = {
        metadata: {
          title: callPlan.name,
          description: callPlan.description,
          week,
          year,
          territory: callPlan.user.salesRepProfile?.territoryName || "N/A",
          salesRep: callPlan.user.fullName,
          email: callPlan.user.email,
          generatedAt: new Date().toISOString(),
          effectiveAt: callPlan.effectiveAt?.toISOString() || null,
        },
        summary: {
          totalAccounts: callPlan.tasks.length,
          completedAccounts: callPlan.tasks.filter((t) => t.status === "COMPLETED").length,
          pendingAccounts: callPlan.tasks.filter((t) => t.status === "PENDING").length,
          highPriority: callPlan.tasks.filter((t) => t.priority === "HIGH").length,
          mediumPriority: callPlan.tasks.filter((t) => t.priority === "MEDIUM").length,
          lowPriority: callPlan.tasks.filter((t) => t.priority === "LOW").length,
          atRiskAccounts: callPlan.tasks.filter(
            (t) =>
              t.customer?.riskStatus === "AT_RISK_CADENCE" ||
              t.customer?.riskStatus === "AT_RISK_REVENUE" ||
              t.customer?.riskStatus === "DORMANT"
          ).length,
        },
        accounts: callPlan.tasks.map((task) => ({
          customerName: task.customer?.name || "Unknown",
          accountNumber: task.customer?.accountNumber || "N/A",
          accountType: task.customer?.accountType || "N/A",
          priority: task.priority,
          status: task.status,
          riskStatus: task.customer?.riskStatus || "HEALTHY",
          objective: task.description,
          outcome: task.status === "COMPLETED" ? "Completed" : "Pending",
          contactedDate: task.status === "COMPLETED" ? task.updatedAt?.toISOString() : null,
          lastOrderDate: task.customer?.lastOrderDate?.toISOString() || null,
          nextExpectedOrderDate: task.customer?.nextExpectedOrderDate?.toISOString() || null,
          establishedRevenue: task.customer?.establishedRevenue
            ? Number(task.customer.establishedRevenue)
            : null,
          contact: {
            phone: task.customer?.phone || null,
            email: task.customer?.billingEmail || null,
          },
          address: {
            street: task.customer?.street1 || null,
            city: task.customer?.city || null,
            state: task.customer?.state || null,
            postalCode: task.customer?.postalCode || null,
          },
        })),
      };

      // Check if client wants JSON or PDF
      const format = request.nextUrl.searchParams.get("format") || "json";

      if (format === "pdf") {
        // TODO: Implement PDF generation
        // For now, return a message indicating PDF generation is not yet implemented
        return NextResponse.json(
          {
            error: "PDF generation not yet implemented",
            message: "Use format=json to get exportable data",
            data: exportData,
          },
          { status: 501 }
        );
      }

      // Return JSON data
      return NextResponse.json(exportData);
    } catch (error) {
      console.error("[GET /api/call-plans/[planId]/export] Error:", error);
      return NextResponse.json(
        { error: "Failed to export call plan" },
        { status: 500 }
      );
    }
  });
}
