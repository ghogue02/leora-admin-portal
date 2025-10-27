import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { updateCallPlanSchema, type CallPlanDetail } from "@/types/call-plan";

/**
 * GET /api/call-plans/[planId]
 * Get specific call plan with all accounts
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
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
          userId: true,
          createdAt: true,
          updatedAt: true,
          tasks: {
            select: {
              id: true,
              customerId: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueAt: true,
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

      const response: CallPlanDetail = {
        id: callPlan.id,
        name: callPlan.name,
        description: callPlan.description,
        week,
        year,
        effectiveAt: callPlan.effectiveAt?.toISOString() || null,
        userId: callPlan.userId,
        accountCount: callPlan.tasks.length,
        completedCount: callPlan.tasks.filter((t) => t.status === "COMPLETED").length,
        createdAt: callPlan.createdAt.toISOString(),
        updatedAt: callPlan.updatedAt.toISOString(),
        accounts: callPlan.tasks.map((task) => ({
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
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("[GET /api/call-plans/[planId]] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch call plan" },
        { status: 500 }
      );
    }
  });
}

/**
 * PATCH /api/call-plans/[planId]
 * Update call plan metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const body = await request.json();
      const input = updateCallPlanSchema.parse(body);

      // Verify ownership
      const existing = await db.callPlan.findUnique({
        where: {
          id: params.planId,
          tenantId,
          userId: session.user.id,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Call plan not found" },
          { status: 404 }
        );
      }

      // Update call plan
      const callPlan = await db.callPlan.update({
        where: {
          id: params.planId,
        },
        data: {
          name: input.name,
          description: input.description,
          effectiveAt: input.effectiveAt ? new Date(input.effectiveAt) : undefined,
        },
        select: {
          id: true,
          name: true,
          description: true,
          effectiveAt: true,
          createdAt: true,
          updatedAt: true,
          tasks: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      // Parse week/year from name
      const match = callPlan.name.match(/Week (\d+) \((\d{4})\)/);
      const week = match ? parseInt(match[1], 10) : 0;
      const year = match ? parseInt(match[2], 10) : new Date().getFullYear();

      return NextResponse.json({
        id: callPlan.id,
        name: callPlan.name,
        description: callPlan.description,
        week,
        year,
        effectiveAt: callPlan.effectiveAt?.toISOString() || null,
        accountCount: callPlan.tasks.length,
        completedCount: callPlan.tasks.filter((t) => t.status === "COMPLETED").length,
        createdAt: callPlan.createdAt.toISOString(),
        updatedAt: callPlan.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error("[PATCH /api/call-plans/[planId]] Error:", error);

      if (error instanceof Error && error.name === "ZodError") {
        return NextResponse.json(
          { error: "Invalid request body", details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update call plan" },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/call-plans/[planId]
 * Delete call plan and all associated tasks
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      // Verify ownership
      const existing = await db.callPlan.findUnique({
        where: {
          id: params.planId,
          tenantId,
          userId: session.user.id,
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Call plan not found" },
          { status: 404 }
        );
      }

      // Delete call plan (tasks will be cascade deleted)
      await db.callPlan.delete({
        where: {
          id: params.planId,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("[DELETE /api/call-plans/[planId]] Error:", error);
      return NextResponse.json(
        { error: "Failed to delete call plan" },
        { status: 500 }
      );
    }
  });
}
