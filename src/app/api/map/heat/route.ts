/**
 * Heat Map Data API Route
 * GET /api/map/heat
 */

import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const metric = (request.nextUrl.searchParams.get("metric") || "revenue") as
        | "revenue"
        | "orders";

      const customers = await db.customer.findMany({
        where: {
          tenantId,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          latitude: true,
          longitude: true,
          orders: {
            where: { status: "FULFILLED" },
            select: { total: true },
          },
        },
      });

      const heatData = customers
        .map((customer) => ({
          latitude: customer.latitude,
          longitude: customer.longitude,
          value:
            metric === "revenue"
              ? customer.orders.reduce((sum, order) => sum + Number(order.total || 0), 0)
              : customer.orders.length,
        }))
        .filter((point) => point.value > 0);

      return NextResponse.json({ success: true, metric, data: heatData });
    } catch (error) {
      console.error("[map/heat] Failed to load heat data:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  });
}
