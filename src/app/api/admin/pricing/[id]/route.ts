import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";
import { logChange, calculateChanges, AuditOperation } from "@/lib/audit";

/**
 * GET /api/admin/pricing/[id]
 * Get single price list with all items
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { id } = await params;

      const priceList = await db.priceList.findFirst({
        where: {
          id,
          tenantId,
        },
        include: {
          items: {
            include: {
              sku: {
                include: {
                  product: {
                    select: {
                      name: true,
                      brand: true,
                      category: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              sku: { code: "asc" },
            },
          },
        },
      });

      if (!priceList) {
        return NextResponse.json({ error: "Price list not found" }, { status: 404 });
      }

      return NextResponse.json({
        priceList: {
          id: priceList.id,
          name: priceList.name,
          currency: priceList.currency,
          isDefault: priceList.isDefault,
          effectiveAt: priceList.effectiveAt,
          expiresAt: priceList.expiresAt,
          items: priceList.items.map((item) => ({
            id: item.id,
            price: Number(item.price),
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity,
            sku: {
              id: item.sku.id,
              code: item.sku.code,
              product: item.sku.product,
            },
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching price list:", error);
      return NextResponse.json({ error: "Failed to fetch price list" }, { status: 500 });
    }
  });
}

/**
 * PUT /api/admin/pricing/[id]
 * Update price list
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;
    try {
      const { id } = await params;
      const body = await request.json();

      // Find current price list
      const currentPriceList = await db.priceList.findFirst({
        where: { id, tenantId },
      });

      if (!currentPriceList) {
        return NextResponse.json({ error: "Price list not found" }, { status: 404 });
      }

      // If setting as default, unset other defaults
      if (body.isDefault && !currentPriceList.isDefault) {
        await db.priceList.updateMany({
          where: { tenantId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      // Update price list
      const updatedPriceList = await db.priceList.update({
        where: { id },
        data: {
          name: body.name,
          currency: body.currency,
          isDefault: body.isDefault,
          effectiveAt: body.effectiveAt ? new Date(body.effectiveAt) : null,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        },
      });

      // Log changes
      const changes = calculateChanges(currentPriceList as any, updatedPriceList as any);
      if (Object.keys(changes).length > 0) {
        await logChange(
          {
            tenantId,
            userId: user.id,
            action: AuditOperation.UPDATE,
            entityType: "PriceList",
            entityId: id,
            changes,
          },
          db,
          request
        );
      }

      return NextResponse.json({ priceList: updatedPriceList });
    } catch (error) {
      console.error("Error updating price list:", error);
      return NextResponse.json({ error: "Failed to update price list" }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/admin/pricing/[id]
 * Delete price list and all items
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;
    try {
      const { id } = await params;

      // Find price list
      const priceList = await db.priceList.findFirst({
        where: { id, tenantId },
      });

      if (!priceList) {
        return NextResponse.json({ error: "Price list not found" }, { status: 404 });
      }

      // Check if this is the only price list
      const priceListCount = await db.priceList.count({
        where: { tenantId },
      });

      if (priceListCount === 1) {
        return NextResponse.json(
          { error: "Cannot delete the only price list" },
          { status: 400 }
        );
      }

      // Delete price list (items will cascade delete)
      await db.priceList.delete({
        where: { id },
      });

      // Log deletion
      await logChange(
        {
          tenantId,
          userId: user.id,
          action: AuditOperation.DELETE,
          entityType: "PriceList",
          entityId: id,
          metadata: {
            name: priceList.name,
            currency: priceList.currency,
          },
        },
        db,
        request
      );

      return NextResponse.json({
        success: true,
        message: "Price list deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting price list:", error);
      return NextResponse.json({ error: "Failed to delete price list" }, { status: 500 });
    }
  });
}
