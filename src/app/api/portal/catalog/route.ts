import { NextRequest, NextResponse } from "next/server";

import { withPortalSession } from "@/lib/auth/portal";
import { queryCatalog } from "@/lib/catalog/query";

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  return value === "true";
}

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ tenantId }) => {
      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get("q") ?? "";
      const brands = searchParams.getAll("brand").filter(Boolean);
      const categories = searchParams.getAll("category").filter(Boolean);
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
        priceListId,
        onlyInStock,
        sort,
      });

      return NextResponse.json(data);
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}
