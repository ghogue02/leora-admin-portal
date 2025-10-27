import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { releaseInventoryReservation } from "@/lib/inventory/reservation";

/**
 * POST /api/sales/orders/[orderId]/cancel
 * Cancel an order and release inventory reservations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const orderId = params.orderId;

  return withSalesSession(request, async ({ db, tenantId, session }) => {
    // Get the order
    const order = await db.order.findUnique({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        customer: {
          select: {
            salesRepId: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user is the assigned sales rep or has admin role
    const isAssignedRep = order.customer?.salesRepId === session.user.salesRep?.id;
    const isAdmin =
      session.user.roles.some((r) => r.role.code === "sales.admin") ||
      session.user.roles.some((r) => r.role.code === "sales.manager");

    if (!isAssignedRep && !isAdmin) {
      return NextResponse.json(
        { error: "You can only cancel orders for your assigned customers" },
        { status: 403 },
      );
    }

    // Check if order can be cancelled
    if (!["SUBMITTED", "PARTIALLY_FULFILLED"].includes(order.status)) {
      return NextResponse.json(
        { error: `Cannot cancel order with status ${order.status}` },
        { status: 400 },
      );
    }

    // Cancel order and release reservations in transaction
    await db.$transaction(async (tx) => {
      // Update order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
      });

      // Release inventory reservations
      await releaseInventoryReservation(tx, tenantId, orderId);
    });

    return NextResponse.json({ success: true });
  });
}
