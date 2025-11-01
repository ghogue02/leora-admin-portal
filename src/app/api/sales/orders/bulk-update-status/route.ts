import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { OrderStatus, Prisma } from "@prisma/client";
import { z } from "zod";

/**
 * POST /api/sales/orders/bulk-update-status
 *
 * Travis's critical requirement: Bulk status updates
 *
 * "Operations team will pick one day's worth of invoices and be able to select all
 * these invoices and mark them as picked/delivered. Whereas the old process, we would
 * have to go into every single one."
 *
 * This endpoint:
 * 1. Takes array of order IDs
 * 2. Updates status for all (with validation)
 * 3. If marking DELIVERED → decrements inventory for all
 * 4. Logs activity for audit trail
 * 5. Returns summary of updated/failed orders
 */

const BulkUpdateSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(100),
  status: z.enum(['PENDING', 'READY_TO_DELIVER', 'PICKED', 'DELIVERED', 'CANCELLED']),
  notes: z.string().optional(),
});

// Valid bulk transitions (more permissive than single updates)
const BULK_ALLOWED_FROM: Record<string, OrderStatus[]> = {
  PENDING: ['DRAFT'],
  READY_TO_DELIVER: ['PENDING', 'READY_TO_DELIVER'],
  PICKED: ['READY_TO_DELIVER', 'PICKED'],
  DELIVERED: ['PICKED', 'READY_TO_DELIVER'],
  CANCELLED: ['DRAFT', 'PENDING', 'READY_TO_DELIVER', 'PICKED'],
};

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = BulkUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { orderIds, status: newStatus, notes } = parsed.data;

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Fetch orders to validate
      const orders = await db.order.findMany({
        where: {
          tenantId,
          id: { in: orderIds },
        },
        include: {
          lines: {
            select: {
              skuId: true,
              quantity: true,
            },
          },
        },
      });

      if (orders.length === 0) {
        return NextResponse.json(
          { error: "No orders found with provided IDs" },
          { status: 404 }
        );
      }

      const results = {
        updated: 0,
        failed: 0,
        errors: [] as Array<{ orderId: string; error: string }>,
      };

      // Process each order
      for (const order of orders) {
        try {
          // Validate transition
          const allowedFrom = BULK_ALLOWED_FROM[newStatus] || [];
          if (!allowedFrom.includes(order.status as OrderStatus)) {
            results.failed++;
            results.errors.push({
              orderId: order.id,
              error: `Invalid transition from ${order.status} to ${newStatus}`,
            });
            continue;
          }

          // Update order status in transaction
          await db.$transaction(async (tx) => {
            // Update order
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: newStatus,
                ...(newStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
                ...(newStatus === 'PICKED' ? { fulfilledAt: new Date() } : {}),
              },
            });

            // If marking as DELIVERED, decrement inventory
            if (newStatus === 'DELIVERED') {
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
            }

            // Log activity
            const activityType = await tx.activityType.findFirst({
              where: {
                tenantId,
                code: 'ORDER_STATUS_CHANGED',
              },
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
                  subject: `Bulk status update to ${newStatus}`,
                  notes: notes || `Status changed from ${order.status} to ${newStatus} via bulk operation by ${session.user.fullName}`,
                  occurredAt: new Date(),
                },
              });
            }
          });

          results.updated++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            orderId: order.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return NextResponse.json({
        success: true,
        updated: results.updated,
        failed: results.failed,
        total: orderIds.length,
        errors: results.errors.length > 0 ? results.errors : undefined,
        message: `Updated ${results.updated} of ${orderIds.length} orders to ${newStatus}`,
      });
    }
  );
}
