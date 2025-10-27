import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { updateCallPlanAccountSchema } from "@/types/call-plan";

/**
 * PATCH /api/call-plans/[planId]/accounts/[accountId]
 * Update account in call plan (objective, outcome, contacted date)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { planId: string; accountId: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const body = await request.json();
      const input = updateCallPlanAccountSchema.parse(body);

      // Verify task exists in call plan and belongs to user
      const task = await db.task.findFirst({
        where: {
          id: params.accountId,
          callPlanId: params.planId,
          tenantId,
          userId: session.user.id,
        },
      });

      if (!task) {
        return NextResponse.json(
          { error: "Account not found in call plan" },
          { status: 404 }
        );
      }

      // Update task
      const updatedTask = await db.task.update({
        where: {
          id: params.accountId,
        },
        data: {
          description: input.objective,
          priority: input.priority,
          status: input.outcome ? "COMPLETED" : task.status,
          updatedAt: input.contactedDate ? new Date(input.contactedDate) : undefined,
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
      });

      return NextResponse.json({
        id: updatedTask.id,
        customerId: updatedTask.customer?.id || "",
        customerName: updatedTask.customer?.name || "Unknown",
        accountNumber: updatedTask.customer?.accountNumber || null,
        accountType: updatedTask.customer?.accountType || null,
        priority: updatedTask.priority,
        objective: updatedTask.description,
        outcome: input.outcome || (updatedTask.status === "COMPLETED" ? "Completed" : null),
        contactedDate:
          input.contactedDate ||
          (updatedTask.status === "COMPLETED" ? updatedTask.updatedAt?.toISOString() : null),
        riskStatus: updatedTask.customer?.riskStatus || "HEALTHY",
        lastOrderDate: updatedTask.customer?.lastOrderDate?.toISOString() || null,
        nextExpectedOrderDate:
          updatedTask.customer?.nextExpectedOrderDate?.toISOString() || null,
        establishedRevenue: updatedTask.customer?.establishedRevenue
          ? Number(updatedTask.customer.establishedRevenue)
          : null,
        location:
          updatedTask.customer?.city && updatedTask.customer?.state
            ? `${updatedTask.customer.city}, ${updatedTask.customer.state}`
            : null,
        createdAt: updatedTask.createdAt.toISOString(),
      });
    } catch (error) {
      console.error("[PATCH /api/call-plans/[planId]/accounts/[accountId]] Error:", error);

      if (error instanceof Error && error.name === "ZodError") {
        return NextResponse.json(
          { error: "Invalid request body", details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to update account" },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/call-plans/[planId]/accounts/[accountId]
 * Remove account from call plan
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { planId: string; accountId: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      // Verify task exists in call plan and belongs to user
      const task = await db.task.findFirst({
        where: {
          id: params.accountId,
          callPlanId: params.planId,
          tenantId,
          userId: session.user.id,
        },
      });

      if (!task) {
        return NextResponse.json(
          { error: "Account not found in call plan" },
          { status: 404 }
        );
      }

      // Delete task
      await db.task.delete({
        where: {
          id: params.accountId,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("[DELETE /api/call-plans/[planId]/accounts/[accountId]] Error:", error);
      return NextResponse.json(
        { error: "Failed to remove account from call plan" },
        { status: 500 }
      );
    }
  });
}
