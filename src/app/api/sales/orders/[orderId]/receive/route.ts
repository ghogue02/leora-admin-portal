import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { fulfillInventoryReservation } from "@/lib/inventory/reservation";

/**
 * POST /api/sales/orders/[orderId]/receive
 * Mark purchase order as received and update inventory
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } },
) {
  const orderId = params.orderId;

  return withSalesSession(
    request,
    async ({ db, tenantId, roles }) => {
      // Check if user has admin/manager role
      const canReceivePOs =
        roles.includes("sales.admin") ||
        roles.includes("sales.manager") ||
        roles.includes("warehouse.manager");

      if (!canReceivePOs) {
        return NextResponse.json(
          { error: "Insufficient permissions to receive purchase orders" },
          { status: 403 },
        );
      }

      const body = await request.json();
      const { receivedQuantities } = body as {
        receivedQuantities: Record<string, number>;
      };

      // Update PO in transaction
      await db.$transaction(async (tx) => {
        // Get PO lines
        const poLines = await tx.$queryRaw<
          Array<{
            id: string;
            skuId: string;
            quantity: number;
          }>
        >`
          SELECT id, "skuId", quantity
          FROM "PurchaseOrderLine"
          WHERE "purchaseOrderId" = ${orderId}::uuid
            AND "tenantId" = ${tenantId}::uuid
        `;

        // Update received quantities and inventory
        for (const line of poLines) {
          const receivedQty = receivedQuantities[line.id] ?? line.quantity;

          // Update PO line
          await tx.$executeRaw`
            UPDATE "PurchaseOrderLine"
            SET "receivedQuantity" = ${receivedQty}
            WHERE id = ${line.id}::uuid
          `;

          // Update inventory
          await tx.$executeRaw`
            UPDATE "Inventory"
            SET "onHand" = "onHand" + ${receivedQty}
            WHERE "tenantId" = ${tenantId}::uuid
              AND "skuId" = ${line.skuId}::uuid
              AND "status" = 'AVAILABLE'
          `;
        }

        // Update PO status
        await tx.$executeRaw`
          UPDATE "PurchaseOrder"
          SET status = 'RECEIVED', "receivedAt" = NOW()
          WHERE id = ${orderId}::uuid
            AND "tenantId" = ${tenantId}::uuid
        `;
      });

      return NextResponse.json({ success: true });
    },
    { requireSalesRep: false },
  );
}
