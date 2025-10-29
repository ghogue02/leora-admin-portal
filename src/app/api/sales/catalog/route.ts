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
          product: {
            // Filter out invalid products with pattern "0 X.XXX 0.00 0.00"
            name: {
              not: {
                startsWith: "0 ",
              },
            },
            // Also exclude products with null or empty names
            NOT: [
              { name: null },
              { name: "" },
            ],
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: true,
              description: true,
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

      // Get inventory status with reservations for each SKU
      const items = await Promise.all(
        skus.map(async (sku) => {
          const inventoryStatus = await getInventoryStatus(db, tenantId, sku.id);

          const totals = {
            onHand: inventoryStatus.onHand,
            available: inventoryStatus.available,
            reserved: inventoryStatus.reserved,
          };

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
              totals,
              lowStock: inventoryStatus.lowStock,
              outOfStock: inventoryStatus.outOfStock,
            },
            product: {
              description: sku.product.description,
            },
          };
        }),
      );

      return NextResponse.json({ items });
    },
    { requireSalesRep: false },
  );
}
