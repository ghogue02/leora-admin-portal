import { NextRequest, NextResponse } from "next/server";
import { ProductFieldScope } from "@prisma/client";

import { withSalesSession } from "@/lib/auth/sales";
import { queryCatalog } from "@/lib/catalog/query";
import { getTenantProductFieldConfig } from "@/lib/product-fields/config";
import { CatalogResponse } from "@/types/catalog";

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return value === "true";
}

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId }) => {
      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get("q") ?? "";
      const brands = searchParams.getAll("brand").filter(Boolean);
      const categories = searchParams.getAll("category").filter(Boolean);
      const lifecycle = searchParams
        .getAll("lifecycle")
        .filter(Boolean) as Parameters<typeof queryCatalog>[0]["lifecycle"];
      const priceListId = searchParams.get("priceListId");
      const onlyInStock = parseBoolean(searchParams.get("onlyInStock"));
      const sort = (searchParams.get("sort") as
        | "priority"
        | "availability"
        | "az"
        | null) ?? "priority";

      const data = await queryCatalog({
        tenantId,
        search,
        brands,
        categories,
        lifecycle,
        priceListId,
        onlyInStock,
        sort,
      });

      const fieldConfig = await getTenantProductFieldConfig(tenantId, {
        scopes: [
          ProductFieldScope.PRODUCT,
          ProductFieldScope.PRICING,
          ProductFieldScope.INVENTORY,
          ProductFieldScope.SALES,
        ],
      });

      const response: CatalogResponse = {
        ...data,
        fields: fieldConfig.map((field) => ({
          id: field.id,
          key: field.key,
          label: field.label,
          description: field.description,
          section: field.section,
          scope: field.scope,
          inputType: field.inputType,
          supportsManualEntry: field.supportsManualEntry,
          visible: field.visible,
          required: field.required,
          displayOrder: field.displayOrder,
          showInPortal: field.showInPortal,
          filterable: field.filterable,
          options: field.options,
        })),
      };

      return NextResponse.json(response);
    },
    { requireSalesRep: false },
  );
}
