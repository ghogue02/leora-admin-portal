import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
import { publishOrderStatusUpdated } from "@/lib/realtime/orders.server";

/**
 * PUT /api/sales/orders/[orderId]/status
 *
 * Update order status with workflow validation
 *
 * Travis's workflow:
 * - Sales Rep: Can mark READY_TO_DELIVER
 * - Operations: Can mark PICKED, DELIVERED
 * - Manager: Can do anything (override)
 *
 * Status transitions:
 * DRAFT → (approval) → PENDING
 * PENDING → READY_TO_DELIVER (sales rep marks ready)
 * READY_TO_DELIVER → PICKED (operations picks)
 * PICKED → DELIVERED (operations/driver delivers)
 */

const UpdateStatusSchema = z.object({
  status: z.enum([
    'DRAFT',
    'PENDING',
    'READY_TO_DELIVER',
    'PICKED',
    'DELIVERED',
    'CANCELLED',
  ]),
  notes: z.string().optional(),
});

// Valid status transitions
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['PENDING', 'CANCELLED'],
  PENDING: ['READY_TO_DELIVER', 'CANCELLED'],
  READY_TO_DELIVER: ['PICKED', 'CANCELLED', 'PENDING'],
  PICKED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [], // Terminal state
  SUBMITTED: ['READY_TO_DELIVER', 'FULFILLED', 'CANCELLED'], // Legacy support
  FULFILLED: [], // Terminal state
  CANCELLED: [], // Terminal state
  PARTIALLY_FULFILLED: ['FULFILLED', 'CANCELLED'],
};

export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const { orderId } = params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = UpdateStatusSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { status: newStatus, notes } = parsed.data;

      return withSalesSession(
        request,
        async ({ db, tenantId, session }) => {
      const order = await db.order.findFirst({
        where: {
          id: orderId,
          tenantId,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              salesRepId: true,
            },
          },
          lines: {
            select: {
              skuId: true,
              quantity: true,
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Order not found." },
          { status: 404 }
        );
      }

      // Verify sales rep has access to this order
      const salesRepId = session.user.salesRep?.id;
      if (order.customer.salesRepId !== salesRepId) {
        return NextResponse.json(
          { error: "You don't have access to this order." },
          { status: 403 }
        );
      }

      // Validate status transition
      const currentStatus = order.status;
      const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

      if (!allowedTransitions.includes(newStatus as OrderStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
            allowedTransitions,
          },
          { status: 400 }
        );
      }

      // Update order status
      const updatedOrder = await db.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          ...(newStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
          ...(newStatus === 'PICKED' ? { fulfilledAt: new Date() } : {}),
        },
      });

      // If marking as DELIVERED, decrement inventory
      if (newStatus === 'DELIVERED') {
        await db.$transaction(async (tx) => {
          for (const line of order.lines) {
            const inventory = await tx.inventory.findFirst({
              where: {
                tenantId,
                skuId: line.skuId,
                location: order.warehouseLocation || 'main',
              },
            });

            if (inventory) {
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  onHand: {
                    decrement: line.quantity,
                  },
                  allocated: {
                    decrement: Math.min(inventory.allocated, line.quantity),
                  },
                },
              });
            }
          }

          // Update reservation status
          await tx.inventoryReservation.updateMany({
            where: {
              orderId: order.id,
              status: 'ACTIVE',
            },
            data: {
              status: 'RELEASED',
              releasedAt: new Date(),
            },
          });
        });
      }

      // Log activity
      const activityType = await db.activityType.findFirst({
        where: {
          tenantId,
          code: 'ORDER_STATUS_CHANGED',
        },
        select: { id: true },
      });

      if (activityType) {
        await db.activity.create({
          data: {
            tenantId,
            activityTypeId: activityType.id,
            userId: session.user.id,
            customerId: order.customerId,
            orderId: order.id,
            subject: `Order status updated to ${newStatus}`,
            notes: notes || `Status changed from ${currentStatus} to ${newStatus} by ${session.user.fullName}`,
            occurredAt: new Date(),
          },
        });
      }

      await publishOrderStatusUpdated({
        tenantId,
        orderId: updatedOrder.id,
        customerId: order.customerId,
        status: updatedOrder.status,
        previousStatus: currentStatus,
        salesRepId: order.salesRepId,
        updatedAt: updatedOrder.updatedAt,
      });

      return NextResponse.json({
        success: true,
        orderId: updatedOrder.id,
        previousStatus: currentStatus,
        newStatus: updatedOrder.status,
        message: `Order status updated to ${newStatus}`,
      });
    }
  );
}
