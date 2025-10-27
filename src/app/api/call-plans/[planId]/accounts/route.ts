import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import {
  addAccountToCallPlanSchema,
  type CallPlanAccountsResponse,
} from "@/types/call-plan";

/**
 * GET /api/call-plans/[planId]/accounts
 * Get all accounts in a call plan with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get("page") || "1", 10);
      const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50", 10), 100);

      // Verify call plan exists and belongs to user
      const callPlan = await db.callPlan.findUnique({
        where: {
          id: params.planId,
          tenantId,
          userId: session.user.id,
        },
      });

      if (!callPlan) {
        return NextResponse.json(
          { error: "Call plan not found" },
          { status: 404 }
        );
      }

      // Get tasks with customer info
      const [tasks, totalCount] = await Promise.all([
        db.task.findMany({
          where: {
            callPlanId: params.planId,
            tenantId,
          },
          select: {
            id: true,
            customerId: true,
            description: true,
            status: true,
            priority: true,
            updatedAt: true,
            createdAt: true,
            customer: {
              select: {
                id: true,
                name: true,
                accountNumber: true,
                accountType: true,
                riskStatus: true,
                lastOrderDate: true,
                nextExpectedOrderDate: true,
                establishedRevenue: true,
                city: true,
                state: true,
              },
            },
          },
          orderBy: [
            { priority: "desc" },
            { createdAt: "asc" },
          ],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.task.count({
          where: {
            callPlanId: params.planId,
            tenantId,
          },
        }),
      ]);

      // Calculate summary stats
      const allTasks = await db.task.findMany({
        where: {
          callPlanId: params.planId,
          tenantId,
        },
        select: {
          status: true,
          priority: true,
          customer: {
            select: {
              riskStatus: true,
            },
          },
        },
      });

      const response: CallPlanAccountsResponse = {
        accounts: tasks.map((task) => ({
          id: task.id,
          customerId: task.customer?.id || "",
          customerName: task.customer?.name || "Unknown",
          accountNumber: task.customer?.accountNumber || null,
          accountType: task.customer?.accountType || null,
          priority: task.priority,
          objective: task.description,
          outcome: task.status === "COMPLETED" ? "Completed" : null,
          contactedDate: task.status === "COMPLETED" ? task.updatedAt?.toISOString() : null,
          riskStatus: task.customer?.riskStatus || "HEALTHY",
          lastOrderDate: task.customer?.lastOrderDate?.toISOString() || null,
          nextExpectedOrderDate: task.customer?.nextExpectedOrderDate?.toISOString() || null,
          establishedRevenue: task.customer?.establishedRevenue
            ? Number(task.customer.establishedRevenue)
            : null,
          location:
            task.customer?.city && task.customer?.state
              ? `${task.customer.city}, ${task.customer.state}`
              : null,
          createdAt: task.createdAt.toISOString(),
        })),
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
        summary: {
          totalAccounts: allTasks.length,
          completedAccounts: allTasks.filter((t) => t.status === "COMPLETED").length,
          highPriority: allTasks.filter((t) => t.priority === "HIGH").length,
          atRiskAccounts: allTasks.filter(
            (t) =>
              t.customer?.riskStatus === "AT_RISK_CADENCE" ||
              t.customer?.riskStatus === "AT_RISK_REVENUE" ||
              t.customer?.riskStatus === "DORMANT"
          ).length,
        },
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("[GET /api/call-plans/[planId]/accounts] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch call plan accounts" },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/call-plans/[planId]/accounts
 * Add account to call plan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const body = await request.json();
      const input = addAccountToCallPlanSchema.parse(body);

      // Verify call plan exists and belongs to user
      const callPlan = await db.callPlan.findUnique({
        where: {
          id: params.planId,
          tenantId,
          userId: session.user.id,
        },
      });

      if (!callPlan) {
        return NextResponse.json(
          { error: "Call plan not found" },
          { status: 404 }
        );
      }

      // Verify customer exists and belongs to sales rep
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

      const customer = await db.customer.findUnique({
        where: {
          id: input.customerId,
          tenantId,
          salesRepId: salesRep.id,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found or not assigned to you" },
          { status: 404 }
        );
      }

      // Check if account already exists in call plan
      const existingTask = await db.task.findFirst({
        where: {
          callPlanId: params.planId,
          customerId: input.customerId,
          tenantId,
        },
      });

      if (existingTask) {
        return NextResponse.json(
          { error: "Account already exists in call plan" },
          { status: 409 }
        );
      }

      // Create task for this account
      const task = await db.task.create({
        data: {
          tenantId,
          callPlanId: params.planId,
          customerId: input.customerId,
          userId: session.user.id,
          assignedById: session.user.id,
          title: `Contact ${customer.name}`,
          description: input.objective || `Follow up with ${customer.name}`,
          priority: input.priority || "MEDIUM",
          status: "PENDING",
          dueAt: callPlan.effectiveAt || new Date(),
        },
        select: {
          id: true,
          customerId: true,
          description: true,
          status: true,
          priority: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              accountType: true,
              riskStatus: true,
              lastOrderDate: true,
              nextExpectedOrderDate: true,
              establishedRevenue: true,
              city: true,
              state: true,
            },
          },
        },
      });

      return NextResponse.json(
        {
          id: task.id,
          customerId: task.customer?.id || "",
          customerName: task.customer?.name || "Unknown",
          accountNumber: task.customer?.accountNumber || null,
          accountType: task.customer?.accountType || null,
          priority: task.priority,
          objective: task.description,
          outcome: null,
          contactedDate: null,
          riskStatus: task.customer?.riskStatus || "HEALTHY",
          lastOrderDate: task.customer?.lastOrderDate?.toISOString() || null,
          nextExpectedOrderDate: task.customer?.nextExpectedOrderDate?.toISOString() || null,
          establishedRevenue: task.customer?.establishedRevenue
            ? Number(task.customer.establishedRevenue)
            : null,
          location:
            task.customer?.city && task.customer?.state
              ? `${task.customer.city}, ${task.customer.state}`
              : null,
          createdAt: task.createdAt.toISOString(),
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("[POST /api/call-plans/[planId]/accounts] Error:", error);

      if (error instanceof Error && error.name === "ZodError") {
        return NextResponse.json(
          { error: "Invalid request body", details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to add account to call plan" },
        { status: 500 }
      );
    }
  });
}
