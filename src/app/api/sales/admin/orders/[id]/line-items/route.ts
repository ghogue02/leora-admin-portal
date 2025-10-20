import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { createAuditLog } from "@/lib/audit-log";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// POST /api/sales/admin/orders/[id]/line-items - Add line item
export async function POST(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    const body = await request.json();
    const { skuId, quantity, unitPrice, isSample } = body;

    if (!skuId || !quantity) {
      return NextResponse.json(
        { error: "SKU ID and quantity are required" },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await db.order.findUnique({
      where: {
        id: params.id,
        tenantId,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify SKU exists
    const sku = await db.sku.findUnique({
      where: {
        id: skuId,
        tenantId,
      },
      include: {
        product: true,
      },
    });

    if (!sku) {
      return NextResponse.json({ error: "SKU not found" }, { status: 404 });
    }

    // Use provided price or SKU price
    const finalPrice = unitPrice ?? (sku.pricePerUnit ? Number(sku.pricePerUnit) : 0);

    // Create line item and update order total in transaction
    const result = await db.$transaction(async (tx) => {
      // Create line item
      const lineItem = await tx.orderLine.create({
        data: {
          tenantId,
          orderId: params.id,
          skuId,
          quantity,
          unitPrice: finalPrice,
          isSample: isSample || false,
        },
        include: {
          sku: {
            include: {
              product: true,
            },
          },
        },
      });

      // Recalculate order total
      const lineItems = await tx.orderLine.findMany({
        where: {
          orderId: params.id,
          tenantId,
        },
      });

      const newTotal = lineItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.unitPrice),
        0
      );

      // Update order total
      await tx.order.update({
        where: {
          id: params.id,
          tenantId,
        },
        data: {
          total: newTotal,
        },
      });

      // Log addition
      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: "Order",
        entityId: params.id,
        action: "UPDATE",
        changes: {
          lineItems: {
            action: "ADD",
            skuCode: sku.code,
            quantity,
            unitPrice: finalPrice,
          },
        },
        metadata: {
          lineItemId: lineItem.id,
          newTotal,
        },
      });

      return { lineItem, newTotal };
    });

    return NextResponse.json({
      lineItem: {
        ...result.lineItem,
        unitPrice: Number(result.lineItem.unitPrice),
      },
      orderTotal: result.newTotal,
    });
  });
}
