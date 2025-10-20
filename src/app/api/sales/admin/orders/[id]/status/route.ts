import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { createAuditLog } from "@/lib/audit-log";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// PUT /api/sales/admin/orders/[id]/status - Change order status
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    const body = await request.json();
    const { status, reason } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    // Validate status
    const validStatuses = [
      "DRAFT",
      "SUBMITTED",
      "FULFILLED",
      "CANCELLED",
      "PARTIALLY_FULFILLED",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get current order
    const currentOrder = await db.order.findUnique({
      where: {
        id: params.id,
        tenantId,
      },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update order in transaction
    const updatedOrder = await db.$transaction(async (tx) => {
      const updateData: any = {
        status,
      };

      // If changing to FULFILLED, set fulfilledAt if not already set
      if (status === "FULFILLED" && !currentOrder.fulfilledAt) {
        updateData.fulfilledAt = new Date();
      }

      const order = await tx.order.update({
        where: {
          id: params.id,
          tenantId,
        },
        data: updateData,
      });

      // Log status change
      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: "Order",
        entityId: params.id,
        action: "STATUS_CHANGE",
        changes: {
          status: {
            from: currentOrder.status,
            to: status,
          },
        },
        metadata: {
          reason,
          fulfilledAt: updateData.fulfilledAt,
        },
      });

      return order;
    });

    return NextResponse.json({
      order: {
        ...updatedOrder,
        total: Number(updatedOrder.total || 0),
      },
    });
  });
}
