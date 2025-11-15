import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";

/**
 * GET /api/admin/inventory/prices/export
 * Export pricing data as CSV
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { searchParams } = new URL(request.url);
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

      // Fetch all matching SKUs (no pagination for export)
      const skus = await db.sku.findMany({
        where,
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
              priceListId: true,
              price: true,
              priceList: {
                select: {
                  name: true,
                },
              },
            },
            ...(priceListId ? { where: { priceListId } } : {}),
          },
        },
        orderBy: [{ code: "asc" }],
      });

      // Get all price lists for headers
      const priceLists = await db.priceList.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
        },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });

      // Build CSV
      const headers = [
        "SKU Code",
        "Product Name",
        "Brand",
        "Category",
        ...priceLists.map((pl) => pl.name),
      ];

      const rows = skus.map((sku) => {
        const priceMap: Record<string, string> = {};
        sku.priceListItems.forEach((item) => {
          priceMap[item.priceList.name] = Number(item.price).toFixed(2);
        });

        return [
          sku.code,
          sku.product.name,
          sku.product.brand || "",
          sku.product.category || "",
          ...priceLists.map((pl) => priceMap[pl.name] || ""),
        ];
      });

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => formatCsvValue(cell)).join(","))
        .join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="inventory-prices-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    } catch (error) {
      console.error("Error exporting pricing data:", error);
      return NextResponse.json({ error: "Export failed" }, { status: 500 });
    }
  });
}

function formatCsvValue(value: string): string {
  if (/["\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
