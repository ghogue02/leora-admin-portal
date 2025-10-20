import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";

/**
 * GET /api/admin/inventory/low-stock
 * Get SKUs with low inventory levels
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { searchParams } = new URL(request.url);
      const threshold = parseInt(searchParams.get("threshold") || "10");

      // Get all active SKUs with their inventory
      const skus = await db.sku.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              category: true,
            },
          },
          inventories: true,
        },
      });

      // Filter and transform to low stock items
      const lowStockItems = skus
        .map((sku) => {
          const inventoryByLocation = sku.inventories.map((inv) => ({
            location: inv.location,
            onHand: inv.onHand,
            allocated: inv.allocated,
          }));

          const totalOnHand = sku.inventories.reduce((sum, inv) => sum + inv.onHand, 0);

          return {
            skuId: sku.id,
            skuCode: sku.code,
            productName: sku.product.name,
            brand: sku.product.brand,
            category: sku.product.category,
            totalOnHand,
            inventoryByLocation,
          };
        })
        .filter((item) => item.totalOnHand <= threshold && item.totalOnHand >= 0)
        .sort((a, b) => a.totalOnHand - b.totalOnHand);

      return NextResponse.json({
        lowStockItems,
        threshold,
        count: lowStockItems.length,
      });
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      return NextResponse.json(
        { error: "Failed to fetch low stock items" },
        { status: 500 }
      );
    }
  });
}
