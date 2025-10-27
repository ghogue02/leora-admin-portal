import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { getInventoryStatus } from "@/lib/inventory/reservation";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const now = new Date();

      // Fetch promotional products
      const promotionalProducts = await db.product.findMany({
        where: {
          tenantId,
          isPromotion: true,
          OR: [
            { promotionEndDate: null },
            { promotionEndDate: { gte: now } },
          ],
        },
        include: {
          skus: {
            where: {
              isActive: true,
            },
            include: {
              priceListItems: {
                include: {
                  priceList: {
                    select: {
                      currency: true,
                    },
                  },
                },
                orderBy: {
                  price: "asc",
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          promotionEndDate: "asc",
        },
      });

      // Fetch closeout products
      const closeoutProducts = await db.product.findMany({
        where: {
          tenantId,
          isCloseout: true,
        },
        include: {
          skus: {
            where: {
              isActive: true,
            },
            include: {
              priceListItems: {
                include: {
                  priceList: {
                    select: {
                      currency: true,
                    },
                  },
                },
                orderBy: {
                  price: "asc",
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      // Process promotional items
      const promotions = await Promise.all(
        promotionalProducts.flatMap((product) =>
          product.skus.map(async (sku) => {
            const inventoryStatus = await getInventoryStatus(db, tenantId, sku.id);
            const bestPrice = sku.priceListItems[0];

            return {
              skuId: sku.id,
              skuCode: sku.code,
              productName: product.name,
              brand: product.brand,
              category: product.category,
              size: sku.size,
              promotionDiscount: product.promotionDiscount
                ? Number(product.promotionDiscount)
                : null,
              promotionEndDate: product.promotionEndDate,
              isCloseout: false,
              price: bestPrice ? Number(bestPrice.price) : null,
              currency: bestPrice?.priceList.currency ?? "USD",
              inventory: {
                available: inventoryStatus.available,
                lowStock: inventoryStatus.lowStock,
                outOfStock: inventoryStatus.outOfStock,
              },
            };
          }),
        ),
      );

      // Process closeout items
      const closeouts = await Promise.all(
        closeoutProducts.flatMap((product) =>
          product.skus.map(async (sku) => {
            const inventoryStatus = await getInventoryStatus(db, tenantId, sku.id);
            const bestPrice = sku.priceListItems[0];

            return {
              skuId: sku.id,
              skuCode: sku.code,
              productName: product.name,
              brand: product.brand,
              category: product.category,
              size: sku.size,
              promotionDiscount: product.promotionDiscount
                ? Number(product.promotionDiscount)
                : null,
              promotionEndDate: product.promotionEndDate,
              isCloseout: true,
              price: bestPrice ? Number(bestPrice.price) : null,
              currency: bestPrice?.priceList.currency ?? "USD",
              inventory: {
                available: inventoryStatus.available,
                lowStock: inventoryStatus.lowStock,
                outOfStock: inventoryStatus.outOfStock,
              },
            };
          }),
        ),
      );

      return NextResponse.json({
        promotions,
        closeouts,
      });
    },
    { requireSalesRep: false },
  );
}
