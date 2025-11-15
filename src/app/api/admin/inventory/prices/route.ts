import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";

/**
 * GET /api/admin/inventory/prices
 * Fetch all SKUs with pricing across all price lists
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get("page") || "1", 10);
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const search = searchParams.get("search") || "";
      const category = searchParams.get("category") || "";
      const brand = searchParams.get("brand") || "";
      const priceListId = searchParams.get("priceListId") || "";

      // Build where clause
      const where = {
        tenantId,
        isActive: true,
        product: {
          isArchived: false,
          ...(category ? { category } : {}),
          ...(brand ? { brand } : {}),
        },
        ...(search
          ? {
              OR: [
                { code: { contains: search, mode: "insensitive" as const } },
                { product: { name: { contains: search, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      };

      // Fetch SKUs with pagination
      const [skus, totalCount] = await Promise.all([
        db.sku.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            code: true,
            product: {
              select: {
                name: true,
                brand: true,
                category: true,
              },
            },
            priceListItems: {
              select: {
                id: true,
                priceListId: true,
                price: true,
                minQuantity: true,
                maxQuantity: true,
              },
              ...(priceListId ? { where: { priceListId } } : {}),
            },
          },
          orderBy: [{ code: "asc" }],
        }),
        db.sku.count({ where }),
      ]);

      // Fetch all price lists
      const priceLists = await db.priceList.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          currency: true,
        },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });

      // Fetch distinct categories and brands for filters
      const [categoriesResult, brandsResult] = await Promise.all([
        db.product.findMany({
          where: { tenantId, isArchived: false, category: { not: null } },
          distinct: ["category"],
          select: { category: true },
        }),
        db.product.findMany({
          where: { tenantId, isArchived: false, brand: { not: null } },
          distinct: ["brand"],
          select: { brand: true },
        }),
      ]);

      const categories = categoriesResult
        .map((p) => p.category)
        .filter((c): c is string => c !== null)
        .sort();
      const brands = brandsResult
        .map((p) => p.brand)
        .filter((b): b is string => b !== null)
        .sort();

      // Transform SKU data into pricing structure
      const items = skus.map((sku) => {
        const prices: Record<
          string,
          {
            itemId: string | null;
            price: number | null;
            minQuantity: number;
            maxQuantity: number | null;
          }
        > = {};

        // Initialize all price lists with null
        priceLists.forEach((pl) => {
          prices[pl.id] = {
            itemId: null,
            price: null,
            minQuantity: 1,
            maxQuantity: null,
          };
        });

        // Fill in actual prices
        sku.priceListItems.forEach((item) => {
          prices[item.priceListId] = {
            itemId: item.id,
            price: Number(item.price),
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity,
          };
        });

        return {
          skuId: sku.id,
          skuCode: sku.code,
          productName: sku.product.name,
          brand: sku.product.brand,
          category: sku.product.category,
          prices,
        };
      });

      return NextResponse.json({
        items,
        priceLists,
        categories,
        brands,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching pricing data:", error);
      return NextResponse.json({ error: "Failed to fetch pricing data" }, { status: 500 });
    }
  });
}
