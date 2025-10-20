import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";
import { Prisma } from "@prisma/client";

/**
 * GET /api/admin/inventory
 * List all SKUs with product info, inventory totals, and pricing
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { searchParams } = new URL(request.url);

      // Pagination
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const skip = (page - 1) * limit;

      // Search
      const search = searchParams.get("search") || "";

      // Filters
      const category = searchParams.get("category");
      const brand = searchParams.get("brand");
      const statusParam = searchParams.get("status");
      const includeInactive = searchParams.get("includeInactive") === "true";
      const priceMin = searchParams.get("priceMin");
      const priceMax = searchParams.get("priceMax");

      // Sorting
      const sortBy = searchParams.get("sortBy") || "productName";
      const sortOrder = (searchParams.get("sortOrder") || "asc") as "asc" | "desc";

      // Build where clause
      const where: Prisma.SkuWhereInput = {
        tenantId,
        ...((!includeInactive) && { isActive: true }),
      };

      // Search filter
      if (search) {
        where.OR = [
          { code: { contains: search, mode: "insensitive" } },
          { product: { name: { contains: search, mode: "insensitive" } } },
        ];
      }

      // Category filter
      if (category) {
        where.product = (where.product
          ? { ...where.product, category: category as string }
          : { category: category as string }) as any;
      }

      // Brand filter
      if (brand) {
        where.product = (where.product
          ? { ...where.product, brand }
          : { brand }) as any;
      }

      // Price range filter
      if (priceMin || priceMax) {
        where.pricePerUnit = {};
        if (priceMin) {
          where.pricePerUnit.gte = parseFloat(priceMin);
        }
        if (priceMax) {
          where.pricePerUnit.lte = parseFloat(priceMax);
        }
      }

      // Build order by
      let orderBy: Prisma.SkuOrderByWithRelationInput = {};

      switch (sortBy) {
        case "skuCode":
          orderBy.code = sortOrder;
          break;
        case "productName":
          orderBy.product = { name: sortOrder };
          break;
        case "brand":
          orderBy.product = { brand: sortOrder };
          break;
        case "category":
          orderBy.product = { category: sortOrder };
          break;
        case "price":
          orderBy.pricePerUnit = sortOrder;
          break;
        default:
          orderBy.product = { name: sortOrder };
      }

      // Fetch SKUs with related data
      const [skus, totalCount] = await Promise.all([
        db.sku.findMany({
          where,
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
              },
            },
            priceListItems: {
              where: {
                priceList: { isDefault: true },
              },
              select: {
                price: true,
              },
              take: 1,
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        db.sku.count({ where }),
      ]);

      // Get unique categories and brands for filters
      const [categoriesData, brandsData] = await Promise.all([
        db.product.findMany({
          where: { tenantId, category: { not: null } },
          select: { category: true },
          distinct: ["category"],
        }),
        db.product.findMany({
          where: { tenantId, brand: { not: null } },
          select: { brand: true },
          distinct: ["brand"],
        }),
      ]);

      const categories = categoriesData.map((p) => p.category).filter(Boolean) as string[];
      const brands = brandsData.map((p) => p.brand).filter(Boolean) as string[];

      // Transform data and calculate status
      const items = skus.map((sku) => {
        const inventoryLevel = sku.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
        const defaultPrice = sku.priceListItems[0]?.price || sku.pricePerUnit;

        let status: "in_stock" | "low_stock" | "out_of_stock";
        if (inventoryLevel === 0) {
          status = "out_of_stock";
        } else if (inventoryLevel <= 10) {
          status = "low_stock";
        } else {
          status = "in_stock";
        }

        return {
          skuId: sku.id,
          skuCode: sku.code,
          productName: sku.product.name,
          brand: sku.product.brand,
          category: sku.product.category,
          price: defaultPrice ? Number(defaultPrice) : null,
          inventoryLevel,
          status,
          isActive: sku.isActive,
        };
      });

      // Apply status filter if provided
      let filteredItems = items;
      if (statusParam) {
        const statusFilters = statusParam.split(",");
        filteredItems = items.filter((item) => statusFilters.includes(item.status));
      }

      return NextResponse.json({
        items: filteredItems,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        categories,
        brands,
      });
    } catch (error) {
      console.error("Error fetching inventory:", error);
      return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
    }
  });
}
