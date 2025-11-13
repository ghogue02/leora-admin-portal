import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { hasSalesManagerPrivileges } from "@/lib/sales/role-helpers";

/**
 * GET /api/sales/manager/approvals
 *
 * Returns orders requiring manager approval (status=DRAFT, requiresApproval=true)
 * Includes inventory status for each line item
 */

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, roles }) => {
      if (!hasSalesManagerPrivileges(roles)) {
        return NextResponse.json({ error: "Manager role required." }, { status: 403 });
      }

      const orders = await db.order.findMany({
        where: {
          tenantId,
          requiresApproval: true,
          status: 'DRAFT',
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              territory: true,
            },
          },
          lines: {
            include: {
              sku: {
                select: {
                  code: true,
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Check current inventory status for each line
      const ordersWithInventory = await Promise.all(
        orders.map(async (order) => {
          const linesWithInventory = await Promise.all(
            order.lines.map(async (line) => {
              // Get current inventory
              const inventories = await db.inventory.findMany({
                where: {
                  tenantId,
                  skuId: line.skuId,
                  ...(order.warehouseLocation ? { location: order.warehouseLocation } : {}),
                },
              });

              const totals = inventories.reduce(
                (acc, inv) => ({
                  onHand: acc.onHand + inv.onHand,
                  allocated: acc.allocated + inv.allocated,
                }),
                { onHand: 0, allocated: 0 }
              );

              const available = Math.max(0, totals.onHand - totals.allocated);
              const shortfall = Math.max(0, line.quantity - available);

              return {
                ...line,
                inventoryStatus: {
                  onHand: totals.onHand,
                  allocated: totals.allocated,
                  available,
                  shortfall,
                },
              };
            })
          );

          return {
            ...order,
            lines: linesWithInventory,
          };
        })
      );

      return NextResponse.json({
        orders: ordersWithInventory.map(order => ({
          id: order.id,
          customer: order.customer,
          deliveryDate: order.deliveryDate,
          warehouseLocation: order.warehouseLocation,
          total: Number(order.total || 0),
          createdAt: order.createdAt,
          orderedAt: order.orderedAt,
          approvalReasons: Array.isArray(order.approvalReasons) ? order.approvalReasons : [],
          minimumOrder: {
            threshold: order.minimumOrderThreshold
              ? Number(order.minimumOrderThreshold)
              : null,
            violation: order.minimumOrderViolation,
          },
          lines: order.lines.map(line => ({
            id: line.id,
            quantity: line.quantity,
            sku: line.sku,
            inventoryStatus: line.inventoryStatus,
          })),
        })),
      });
    },
    { requireSalesRep: false },
  );
}
