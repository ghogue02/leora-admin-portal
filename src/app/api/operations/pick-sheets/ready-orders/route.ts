import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { OrderStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const orders = await db.order.findMany({
          where: {
            tenantId,
            status: OrderStatus.SUBMITTED,
            pickSheetStatus: "not_picked",
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            lines: {
              include: {
                sku: {
                  include: {
                    inventories: {
                      where: { tenantId },
                      select: { id: true },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            orderedAt: "asc",
          },
          take: 50,
        });

        const readyOrders = orders.map((order) => {
          const itemCount = order.lines.length;
          const totalQuantity = order.lines.reduce((sum, line) => sum + line.quantity, 0);
          const hasLocations = order.lines.every(
            (line) => (line.sku?.inventories?.length ?? 0) > 0,
          );

          return {
            id: order.id,
            orderNumber: order.orderNumber ?? `#${order.id.slice(0, 8)}`,
            customerName: order.customer?.name ?? "Unassigned",
            itemCount,
            totalQuantity,
            hasLocations,
            submittedAt: (order.orderedAt ?? order.createdAt ?? new Date()).toISOString(),
          };
        });

        return NextResponse.json({ readyOrders });
      } catch (error) {
        console.error("[ready-orders] Failed to load ready orders", error);
        return NextResponse.json(
          { error: "Failed to load ready orders" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
