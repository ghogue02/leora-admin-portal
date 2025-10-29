import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { getInventoryStatus } from "@/lib/inventory/reservation";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const skus = await db.sku.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: true,
              description: true,
              tastingNotes: true,
              foodPairings: true,
              servingInfo: true,
              wineDetails: true,
              enrichedAt: true,
              enrichedBy: true,
            },
          },
          inventories: {
            select: {
              onHand: true,
              allocated: true,
              location: true,
            },
          },
          priceListItems: {
            include: {
              priceList: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                },
              },
            },
            where: {
              priceList: {
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gte: new Date() } },
                ],
              },
            },
          },
        },
        orderBy: [
          {
            product: {
              brand: "asc",
            },
          },
          {
            product: {
              name: "asc",
            },
          },
          {
            code: "asc",
          },
        ],
      });

      // Filter out invalid/corrupted products with aggressive rules
      const validSkus = skus.filter(sku => {
        const productName = sku.product?.name || "";

        // Exclude empty or very short names (likely corrupted)
        if (productName.length < 5) return false;

        // Exclude pure numbers ("1", "2", "021", "022", etc.)
        if (/^\d+$/.test(productName.trim())) return false;

        // Exclude pattern "X.XXX 0.00 0.00" or similar (corrupted data)
        if (/^[\d.]+\s+[\d.]+\s+[\d.]+/.test(productName)) return false;

        // Exclude names that are mostly numbers/periods/spaces (first 10 chars)
        const first10 = productName.substring(0, Math.min(10, productName.length));
        if (/^[\d\s.]+$/.test(first10)) return false;

        // Exclude names starting with "0 " or "0."
        if (/^0[\s.]/.test(productName)) return false;

        return true;
      });

      // Batch fetch all inventory for all SKUs (much faster than individual queries)
      const skuIds = validSkus.map(s => s.id);

      const inventoryRecords = await db.inventory.groupBy({
        by: ['skuId'],
        where: {
          skuId: { in: skuIds },
          tenantId,
        },
        _sum: {
          onHand: true,
          allocated: true,
        },
      });

      // Create inventory map for O(1) lookup
      const inventoryMap = new Map(
        inventoryRecords.map(inv => [
          inv.skuId,
          {
            onHand: inv._sum.onHand || 0,
            allocated: inv._sum.allocated || 0,
            available: (inv._sum.onHand || 0) - (inv._sum.allocated || 0),
          }
        ])
      );

      // Map SKUs to catalog items (no async queries!)
      const items = validSkus.map((sku) => {
        const inventory = inventoryMap.get(sku.id) || { onHand: 0, allocated: 0, available: 0 };

        return {
          skuId: sku.id,
          skuCode: sku.code,
          productName: sku.product.name,
          brand: sku.product.brand,
          category: sku.product.category,
          unitOfMeasure: sku.unitOfMeasure,
          size: sku.size,
          priceLists: sku.priceListItems.map((item) => ({
            priceListId: item.priceList.id,
            priceListName: item.priceList.name,
            price: Number(item.price),
            currency: item.priceList.currency,
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity,
          })),
          inventory: {
            totals: inventory,
            lowStock: inventory.available < 10,
            outOfStock: inventory.available <= 0,
          },
          product: {
            description: sku.product.description,
            tastingNotes: sku.product.tastingNotes,
            foodPairings: sku.product.foodPairings,
            servingInfo: sku.product.servingInfo,
            wineDetails: sku.product.wineDetails,
            enrichedAt: sku.product.enrichedAt,
            enrichedBy: sku.product.enrichedBy,
          },
        };
      });

      return NextResponse.json({ items });
    },
    { requireSalesRep: false },
  );
}
