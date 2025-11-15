import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";
import { logChange, AuditOperation } from "@/lib/audit";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * PATCH /api/admin/inventory/prices/bulk
 * Bulk update prices by percentage for selected SKUs in a price list
 */
export async function PATCH(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;
    try {
      const body = await request.json();
      const { skuIds, priceListId, percentChange } = body;

      // Validate input
      if (!Array.isArray(skuIds) || skuIds.length === 0) {
        return NextResponse.json({ error: "No SKUs selected" }, { status: 400 });
      }

      if (!priceListId) {
        return NextResponse.json({ error: "Price list is required" }, { status: 400 });
      }

      if (typeof percentChange !== "number" || isNaN(percentChange)) {
        return NextResponse.json({ error: "Invalid percentage change" }, { status: 400 });
      }

      // Verify price list exists
      const priceList = await db.priceList.findFirst({
        where: { id: priceListId, tenantId },
      });

      if (!priceList) {
        return NextResponse.json({ error: "Price list not found" }, { status: 404 });
      }

      // Fetch existing price list items for these SKUs
      const existingItems = await db.priceListItem.findMany({
        where: {
          tenantId,
          priceListId,
          skuId: { in: skuIds },
        },
        include: {
          sku: {
            select: {
              code: true,
            },
          },
        },
      });

      if (existingItems.length === 0) {
        return NextResponse.json(
          { error: "No existing prices found for selected SKUs in this price list" },
          { status: 400 }
        );
      }

      // Calculate new prices
      const multiplier = 1 + percentChange / 100;
      const updates: Array<{
        id: string;
        oldPrice: number;
        newPrice: number;
        skuCode: string;
      }> = [];

      for (const item of existingItems) {
        const oldPrice = Number(item.price);
        const newPrice = Math.round(oldPrice * multiplier * 100) / 100; // Round to 2 decimals

        if (newPrice < 0) {
          return NextResponse.json(
            {
              error: `Calculated price for SKU ${item.sku.code} would be negative. Aborting bulk update.`,
            },
            { status: 400 }
          );
        }

        updates.push({
          id: item.id,
          oldPrice,
          newPrice,
          skuCode: item.sku.code,
        });
      }

      // Perform updates in a transaction
      await db.$transaction(
        updates.map((update) =>
          db.priceListItem.update({
            where: { id: update.id },
            data: { price: new Decimal(update.newPrice) },
          })
        )
      );

      // Log bulk change
      await logChange(
        {
          tenantId,
          userId: user.id,
          action: AuditOperation.UPDATE,
          entityType: "PriceListItem",
          entityId: priceListId,
          metadata: {
            bulkUpdate: true,
            priceListName: priceList.name,
            percentChange,
            skuCount: updates.length,
            skuIds,
            changes: updates.map((u) => ({
              skuCode: u.skuCode,
              oldPrice: u.oldPrice,
              newPrice: u.newPrice,
            })),
          },
        },
        db,
        request
      );

      return NextResponse.json({
        success: true,
        updated: updates.length,
        skipped: skuIds.length - updates.length,
        percentChange,
        priceListName: priceList.name,
        details: updates,
      });
    } catch (error) {
      console.error("Error in bulk price update:", error);
      return NextResponse.json(
        { error: "Bulk update failed", details: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 }
      );
    }
  });
}
