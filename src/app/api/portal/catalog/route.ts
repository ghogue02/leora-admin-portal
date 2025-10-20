import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId }) => {
      const skus = await db.sku.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          product: true,
          inventories: true,
          priceListItems: {
            include: {
              priceList: true,
            },
          },
        },
        orderBy: [
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

      const items = skus.map((sku) => {
        const inventoryTotals = sku.inventories.reduce(
          (acc, inventory) => {
            const onHand = inventory.onHand ?? 0;
            const allocated = inventory.allocated ?? 0;
            acc.onHand += onHand;
            acc.allocated += allocated;
            return acc;
          },
          { onHand: 0, allocated: 0 },
        );

        return {
          skuId: sku.id,
          skuCode: sku.code,
          productId: sku.productId,
          productName: sku.product.name,
          brand: sku.product.brand,
          category: sku.product.category,
          size: sku.size,
          unitOfMeasure: sku.unitOfMeasure,
          abv: sku.abv,
          pricePerUnit: sku.pricePerUnit ? Number(sku.pricePerUnit) : null,
          casesPerPallet: sku.casesPerPallet,
          priceLists: sku.priceListItems.map((item) => ({
            priceListId: item.priceListId,
            priceListName: item.priceList.name,
            price: Number(item.price),
            currency: item.priceList.currency,
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity,
          })),
          inventory: {
            byLocation: sku.inventories.map((inventory) => ({
              location: inventory.location,
              onHand: inventory.onHand,
              allocated: inventory.allocated,
              available: inventory.onHand - inventory.allocated,
              updatedAt: inventory.updatedAt,
            })),
            totals: {
              onHand: inventoryTotals.onHand,
              allocated: inventoryTotals.allocated,
              available: inventoryTotals.onHand - inventoryTotals.allocated,
            },
          },
        };
      });

      return NextResponse.json({ items });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}
