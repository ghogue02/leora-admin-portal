import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

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
              name: true,
              brand: true,
              category: true,
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
                  name: true,
                  currency: true,
                },
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

      const items = skus.map((sku) => {
        // Calculate inventory totals
        const inventoryTotals = sku.inventories.reduce(
          (acc, inventory) => {
            const onHand = inventory.onHand ?? 0;
            const allocated = inventory.allocated ?? 0;
            acc.onHand += onHand;
            acc.available += onHand - allocated;
            return acc;
          },
          { onHand: 0, available: 0 },
        );

        return {
          skuId: sku.id,
          skuCode: sku.code,
          productName: sku.product.name,
          brand: sku.product.brand,
          category: sku.product.category,
          unitOfMeasure: sku.unitOfMeasure,
          size: sku.size,
          priceLists: sku.priceListItems.map((item) => ({
            priceListId: item.priceListId,
            priceListName: item.priceList.name,
            price: Number(item.price),
            currency: item.priceList.currency,
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity,
          })),
          inventory: {
            totals: {
              onHand: inventoryTotals.onHand,
              available: inventoryTotals.available,
            },
          },
        };
      });

      return NextResponse.json({ items });
    }
  );
}
