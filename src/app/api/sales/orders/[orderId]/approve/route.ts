import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { runWithTransaction } from "@/lib/prisma";
import {
  allocateInventory,
  ensureInventoryAvailability,
  fetchInventorySnapshots,
  releaseAllocationsForOrder,
} from "@/lib/orders";
import { z } from "zod";

/**
 * POST /api/sales/orders/[orderId]/approve
 *
 * Manager approves or rejects an order requiring approval
 *
 * Actions:
 * - approve: Allocate inventory, change status to PENDING
 * - reject: Cancel order, release any allocated inventory
 */

const ApprovalSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export async function POST(
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

  const parsed = ApprovalSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { action, reason } = parsed.data;

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // TODO: Verify user has manager role
      // For now, any sales user can approve

      const order = await db.order.findFirst({
        where: {
          id: orderId,
          tenantId,
          requiresApproval: true,
          status: 'DRAFT',
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
          lines: {
            select: {
              id: true,
              skuId: true,
              quantity: true,
              unitPrice: true,
              appliedPricingRules: true,
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json(
          { error: "Order not found or does not require approval." },
          { status: 404 }
        );
      }

      try {
        if (action === 'approve') {
          // Approve: Allocate inventory and change status to PENDING
          await runWithTransaction(db, async (tx) => {
            const quantityDescriptors = order.lines.map(line => ({
              skuId: line.skuId,
              quantity: line.quantity,
            }));

            const inventoryMap = await fetchInventorySnapshots(
              tx,
              tenantId,
              quantityDescriptors.map(item => item.skuId),
            );

            // Try to allocate - might still fail if inventory changed
            try {
              ensureInventoryAvailability(inventoryMap, quantityDescriptors);
              const allocationsBySku = await allocateInventory(tx, inventoryMap, quantityDescriptors);

              // Create inventory reservations with 48-hour expiration
              const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

              await tx.inventoryReservation.createMany({
                data: order.lines.map(line => ({
                  tenantId,
                  skuId: line.skuId,
                  orderId: order.id,
                  quantity: line.quantity,
                  expiresAt,
                  status: 'ACTIVE',
                })),
              });

              // Update order status
              await tx.order.update({
                where: { id: orderId },
                data: {
                  status: 'PENDING',
                  requiresApproval: false,
                  approvedById: session.user.id,
                  approvedAt: new Date(),
                },
              });

              // Log activity
              const activityType = await tx.activityType.findFirst({
                where: { tenantId, code: 'ORDER_APPROVED' },
                select: { id: true },
              });

              if (activityType) {
                await tx.activity.create({
                  data: {
                    tenantId,
                    activityTypeId: activityType.id,
                    userId: session.user.id,
                    customerId: order.customerId,
                    orderId: order.id,
                    subject: `Order approved by ${session.user.fullName}`,
                    notes: `Order approved and inventory allocated. Status changed from DRAFT to PENDING.`,
                    occurredAt: new Date(),
                  },
                });
              }
            } catch (invError) {
              throw new Error('Inventory no longer available. Cannot approve order.');
            }
          });

          return NextResponse.json({
            success: true,
            message: 'Order approved and inventory allocated',
            orderId: order.id,
            newStatus: 'PENDING',
          });
        } else if (action === 'reject') {
          // Reject: Cancel order and release any allocated inventory
          await runWithTransaction(db, async (tx) => {
            // Release any allocated inventory
            await releaseAllocationsForOrder(tx, tenantId, order.lines);

            // Update order status
            await tx.order.update({
              where: { id: orderId },
              data: {
                status: 'CANCELLED',
              },
            });

            // Log activity
            const activityType = await tx.activityType.findFirst({
              where: { tenantId, code: 'ORDER_REJECTED' },
              select: { id: true },
            });

            if (activityType) {
              await tx.activity.create({
                data: {
                  tenantId,
                  activityTypeId: activityType.id,
                  userId: session.user.id,
                  customerId: order.customerId,
                  orderId: order.id,
                  subject: `Order rejected by ${session.user.fullName}`,
                  notes: reason || 'Order rejected by manager.',
                  occurredAt: new Date(),
                },
              });
            }
          });

          return NextResponse.json({
            success: true,
            message: 'Order rejected and cancelled',
            orderId: order.id,
            newStatus: 'CANCELLED',
          });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      } catch (error) {
        console.error('Approval action failed:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Failed to process approval' },
          { status: 500 }
        );
      }
    }
  );
}
