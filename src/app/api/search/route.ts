import { NextRequest, NextResponse } from "next/server";

import { withSalesSession } from "@/lib/auth/sales";
import { searchProducts } from "@/lib/search/products";
import { searchCustomers } from "@/lib/search/customers";
import { searchOrders } from "@/lib/search/orders";

const DEFAULT_ENTITIES = ["products", "customers", "orders"] as const;
type SearchEntity = (typeof DEFAULT_ENTITIES)[number];

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId }) => {
      const searchParams = request.nextUrl.searchParams;
      const query = (searchParams.get("q") ?? "").trim();
      if (!query) {
        return NextResponse.json(
          { error: "Missing search query" },
          { status: 400 },
        );
      }

      const entitiesParam = searchParams.getAll("entities").flatMap((value) => value.split(","));
      const entities: SearchEntity[] = (
        entitiesParam.length ? entitiesParam : DEFAULT_ENTITIES
      ).filter((entity): entity is SearchEntity => DEFAULT_ENTITIES.includes(entity as SearchEntity));

      const limitParam = Number.parseInt(searchParams.get("limit") ?? "5", 10);
      const limit = Number.isNaN(limitParam) ? 5 : Math.max(1, Math.min(10, limitParam));

      const start = Date.now();
      const results = await Promise.all(
        entities.map(async (entity) => {
          if (entity === "products") {
            return ["products", await searchProducts({ tenantId, query, limit })] as const;
          }
          if (entity === "customers") {
            return ["customers", await searchCustomers({ tenantId, query, limit })] as const;
          }
          if (entity === "orders") {
            return ["orders", await searchOrders({ tenantId, query, limit })] as const;
          }
          return null;
        }),
      );

      const response = {
        query,
        timestamp: new Date().toISOString(),
        results: results.reduce<Record<string, unknown[]>>((acc, result) => {
          if (!result) return acc;
          const [entity, data] = result;
          acc[entity] = data;
          return acc;
        }, {}),
        meta: {
          tenantId,
          entitiesRequested: entities,
          executionMs: Date.now() - start,
        },
      };

      return NextResponse.json(response);
    },
    { requireSalesRep: false },
  );
}
