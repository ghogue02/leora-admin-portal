import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { createAuditLog } from "@/lib/audit-log";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// PUT /api/sales/admin/orders/[id]/cancel - Cancel order
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    const body = await request.json();
    const { reason } = body;

    // Get current order
    const currentOrder = await db.order.findUnique({
      where: {
        id: params.id,
        tenantId,
      },
      include: {
        payments: true,
      },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order has payments
    if (currentOrder.payments.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot cancel order with payments. Please contact accounting.",
        },
        { status: 400 }
      );
    }

    // Cancel order in transaction
    const cancelledOrder = await db.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: {
          id: params.id,
          tenantId,
        },
        data: {
          status: "CANCELLED",
        },
      });

      // Log cancellation
      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: "Order",
        entityId: params.id,
        action: "CANCEL",
        changes: {
          status: {
            from: currentOrder.status,
            to: "CANCELLED",
          },
        },
        metadata: {
          reason: reason || "No reason provided",
        },
      });

      return order;
    });

    return NextResponse.json({
      order: {
        ...cancelledOrder,
        total: Number(cancelledOrder.total || 0),
      },
    });
  });
}
