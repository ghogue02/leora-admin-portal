import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";
import { logChange, AuditOperation } from "@/lib/audit";

/**
 * POST /api/admin/inventory/[skuId]/pricing
 * Add or update price list item for a SKU
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;
    try {
      const { skuId } = await params;
      const body = await request.json();

      const { priceListId, price, minQuantity, maxQuantity } = body;

      // Validate input
      if (!priceListId || price === undefined || price === null) {
        return NextResponse.json(
          { error: "Missing required fields: priceListId, price" },
          { status: 400 }
        );
      }

      if (price < 0) {
        return NextResponse.json({ error: "Price cannot be negative" }, { status: 400 });
      }

      // Verify SKU exists
      const sku = await db.sku.findFirst({
        where: { id: skuId, tenantId },
      });

      if (!sku) {
        return NextResponse.json({ error: "SKU not found" }, { status: 404 });
      }

      // Verify price list exists
      const priceList = await db.priceList.findFirst({
        where: { id: priceListId, tenantId },
      });

      if (!priceList) {
        return NextResponse.json({ error: "Price list not found" }, { status: 404 });
      }

      // Check if item already exists
      const existingItem = await db.priceListItem.findFirst({
        where: {
          tenantId,
          priceListId,
          skuId,
        },
      });

      let priceListItem;
      let action: string;

      if (existingItem) {
        // Update existing item
        const oldPrice = Number(existingItem.price);
        priceListItem = await db.priceListItem.update({
          where: { id: existingItem.id },
          data: {
            price,
            minQuantity: minQuantity || 1,
            maxQuantity: maxQuantity || null,
          },
        });

        action = AuditOperation.UPDATE;

        // Log price change
        await logChange(
          {
            tenantId,
            userId: user.id,
            action,
            entityType: "PriceListItem",
            entityId: priceListItem.id,
            changes: {
              price: { old: oldPrice, new: price },
              minQuantity: { old: existingItem.minQuantity, new: minQuantity || 1 },
              maxQuantity: { old: existingItem.maxQuantity, new: maxQuantity || null },
            },
            metadata: {
              skuCode: sku.code,
              priceListName: priceList.name,
            },
          },
          db,
          request
        );
      } else {
        // Create new item
        priceListItem = await db.priceListItem.create({
          data: {
            tenantId,
            priceListId,
            skuId,
            price,
            minQuantity: minQuantity || 1,
            maxQuantity: maxQuantity || null,
          },
        });

        action = AuditOperation.CREATE;

        // Log creation
        await logChange(
          {
            tenantId,
            userId: user.id,
            action,
            entityType: "PriceListItem",
            entityId: priceListItem.id,
            metadata: {
              skuCode: sku.code,
              priceListName: priceList.name,
              price,
              minQuantity: minQuantity || 1,
              maxQuantity: maxQuantity || null,
            },
          },
          db,
          request
        );
      }

      return NextResponse.json({
        success: true,
        priceListItem: {
          id: priceListItem.id,
          price: Number(priceListItem.price),
          minQuantity: priceListItem.minQuantity,
          maxQuantity: priceListItem.maxQuantity,
        },
        action,
      });
    } catch (error) {
      console.error("Error creating/updating price list item:", error);
      return NextResponse.json(
        { error: "Failed to create/update price list item" },
        { status: 500 }
      );
    }
  });
}
