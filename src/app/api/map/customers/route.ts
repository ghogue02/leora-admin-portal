/**
 * Map Customers API Route
 * GET /api/map/customers
 */

import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const customers = await db.customer.findMany({
        where: {
          tenantId,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          accountType: true,
          riskStatus: true,
          city: true,
          state: true,
        },
        take: 1000,
      });

      return NextResponse.json({
        success: true,
        count: customers.length,
        customers,
      });
    } catch (error) {
      console.error("[map/customers] Failed to load map data:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  });
}
