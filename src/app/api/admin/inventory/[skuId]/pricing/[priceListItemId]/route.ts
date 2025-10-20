import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";
import { logChange, AuditOperation } from "@/lib/audit";

/**
 * DELETE /api/admin/inventory/[skuId]/pricing/[priceListItemId]
 * Delete a price list item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ skuId: string; priceListItemId: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;
    try {
      const { priceListItemId } = await params;

      // Find the price list item
      const priceListItem = await db.priceListItem.findFirst({
        where: {
          id: priceListItemId,
          tenantId,
        },
        include: {
          sku: true,
          priceList: true,
        },
      });

      if (!priceListItem) {
        return NextResponse.json({ error: "Price list item not found" }, { status: 404 });
      }

      // Delete the item
      await db.priceListItem.delete({
        where: { id: priceListItemId },
      });

      // Log deletion
      await logChange(
        {
          tenantId,
          userId: user.id,
          action: AuditOperation.DELETE,
          entityType: "PriceListItem",
          entityId: priceListItemId,
          metadata: {
            skuCode: priceListItem.sku.code,
            priceListName: priceListItem.priceList.name,
            price: Number(priceListItem.price),
          },
        },
        db,
        request
      );

      return NextResponse.json({
        success: true,
        message: "Price list item deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting price list item:", error);
      return NextResponse.json(
        { error: "Failed to delete price list item" },
        { status: 500 }
      );
    }
  });
}
