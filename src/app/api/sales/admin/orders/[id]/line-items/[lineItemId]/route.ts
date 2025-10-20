import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { createAuditLog, calculateChanges } from "@/lib/audit-log";

type RouteParams = {
  params: Promise<{
    id: string;
    lineItemId: string;
  }>;
};

// PUT /api/sales/admin/orders/[id]/line-items/[lineItemId] - Update line item
export async function PUT(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    const body = await request.json();
    const { quantity, unitPrice, isSample } = body;

    // Get current line item
    const currentLineItem = await db.orderLine.findUnique({
      where: {
        id: params.lineItemId,
        tenantId,
      },
      include: {
        sku: true,
      },
    });

    if (!currentLineItem) {
      return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    }

    if (currentLineItem.orderId !== params.id) {
      return NextResponse.json(
        { error: "Line item does not belong to this order" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unitPrice !== undefined) updateData.unitPrice = unitPrice;
    if (isSample !== undefined) updateData.isSample = isSample;

    // Calculate changes
    const changes = calculateChanges(
      {
        quantity: currentLineItem.quantity,
        unitPrice: Number(currentLineItem.unitPrice),
        isSample: currentLineItem.isSample,
      },
      {
        quantity: updateData.quantity ?? currentLineItem.quantity,
        unitPrice: updateData.unitPrice ?? Number(currentLineItem.unitPrice),
        isSample: updateData.isSample ?? currentLineItem.isSample,
      }
    );

    // Update line item and recalculate total in transaction
    const result = await db.$transaction(async (tx) => {
      // Update line item
      const lineItem = await tx.orderLine.update({
        where: {
          id: params.lineItemId,
          tenantId,
        },
        data: updateData,
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

      // Log update
      if (Object.keys(changes).length > 0) {
        await createAuditLog(tx, {
          tenantId,
          userId: session.user.id,
          entityType: "Order",
          entityId: params.id,
          action: "UPDATE",
          changes: {
            lineItems: {
              action: "UPDATE",
              lineItemId: params.lineItemId,
              skuCode: currentLineItem.sku.code,
              ...changes,
            },
          },
          metadata: {
            newTotal,
          },
        });
      }

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

// DELETE /api/sales/admin/orders/[id]/line-items/[lineItemId] - Delete line item
export async function DELETE(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  return withAdminSession(request, async ({ db, tenantId, session }) => {
    // Get line item
    const lineItem = await db.orderLine.findUnique({
      where: {
        id: params.lineItemId,
        tenantId,
      },
      include: {
        sku: true,
      },
    });

    if (!lineItem) {
      return NextResponse.json({ error: "Line item not found" }, { status: 404 });
    }

    if (lineItem.orderId !== params.id) {
      return NextResponse.json(
        { error: "Line item does not belong to this order" },
        { status: 400 }
      );
    }

    // Delete line item and recalculate total in transaction
    const result = await db.$transaction(async (tx) => {
      // Delete line item
      await tx.orderLine.delete({
        where: {
          id: params.lineItemId,
          tenantId,
        },
      });

      // Recalculate order total
      const remainingLineItems = await tx.orderLine.findMany({
        where: {
          orderId: params.id,
          tenantId,
        },
      });

      const newTotal = remainingLineItems.reduce(
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

      // Log deletion
      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: "Order",
        entityId: params.id,
        action: "UPDATE",
        changes: {
          lineItems: {
            action: "DELETE",
            lineItemId: params.lineItemId,
            skuCode: lineItem.sku.code,
            quantity: lineItem.quantity,
            unitPrice: Number(lineItem.unitPrice),
          },
        },
        metadata: {
          newTotal,
        },
      });

      return { newTotal };
    });

    return NextResponse.json({
      success: true,
      orderTotal: result.newTotal,
    });
  });
}
