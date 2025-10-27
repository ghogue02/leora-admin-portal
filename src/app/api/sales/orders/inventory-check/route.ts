import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { checkInventoryAvailability } from "@/lib/inventory/reservation";

/**
 * POST /api/sales/orders/inventory-check
 * Check inventory availability before submitting an order
 */
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const body = await request.json();
    const { items } = body as { items: Array<{ skuId: string; quantity: number }> };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 },
      );
    }

    // Check availability for each item
    const results = await Promise.all(
      items.map(async (item) => {
        const check = await checkInventoryAvailability(
          db,
          tenantId,
          item.skuId,
          item.quantity,
        );

        return {
          skuId: item.skuId,
          requestedQuantity: item.quantity,
          ...check,
        };
      }),
    );

    // Determine overall status
    const allAvailable = results.every((r) => r.available);
    const hasWarnings = results.some((r) => r.warning);

    return NextResponse.json({
      available: allAvailable,
      hasWarnings,
      items: results,
    });
  });
}
