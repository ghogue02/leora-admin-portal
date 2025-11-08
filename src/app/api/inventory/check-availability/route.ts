import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { z } from "zod";

/**
 * Inventory Availability Check API
 *
 * Real-time inventory availability checking for order creation.
 * Returns detailed breakdown of total, allocated, and available inventory.
 *
 * Travis's Requirements:
 * - Show "Total On-Hand", "Allocated (Pending Orders)", and "Available"
 * - Warn (don't block) when insufficient inventory
 * - Allow admin override for low-inventory orders
 */

const CheckAvailabilitySchema = z.object({
  items: z.array(
    z.object({
      skuId: z.string().uuid(),
      quantity: z.number().int().positive(),
    })
  ),
  warehouseLocation: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = CheckAvailabilitySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.format() },
      { status: 400 }
    );
  }

  const { items, warehouseLocation } = parsed.data;

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Get SKU IDs for batch query
      const skuIds = items.map((item) => item.skuId);

      // Fetch inventory for all SKUs
      const inventories = await db.inventory.findMany({
        where: {
          tenantId,
          skuId: { in: skuIds },
          ...(warehouseLocation ? { location: warehouseLocation } : {}),
        },
        select: {
          id: true,
          skuId: true,
          location: true,
          onHand: true,
          allocated: true,
          sku: {
            select: {
              id: true,
              code: true,
              size: true,
              unitOfMeasure: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                },
              },
            },
          },
        },
      });

      // Get pending orders count for context
      const pendingOrdersCount = await db.order.count({
        where: {
          tenantId,
          status: { in: ["DRAFT", "PENDING", "SUBMITTED", "READY_TO_DELIVER"] },
          lines: {
            some: {
              skuId: { in: skuIds },
            },
          },
        },
      });

      // Group inventory by SKU (handle multi-location)
      const inventoryBySku = new Map<string, typeof inventories>();
      inventories.forEach((inv) => {
        const existing = inventoryBySku.get(inv.skuId) || [];
        existing.push(inv);
        inventoryBySku.set(inv.skuId, existing);
      });

      // Calculate availability for each requested item
      const results = items.map((item) => {
        const inventoriesForSku = inventoryBySku.get(item.skuId) || [];

        // Aggregate across all locations for this SKU
        const totals = inventoriesForSku.reduce(
          (acc, inv) => ({
            onHand: acc.onHand + inv.onHand,
            allocated: acc.allocated + inv.allocated,
            locations: [...acc.locations, inv.location],
          }),
          { onHand: 0, allocated: 0, locations: [] as string[] }
        );

        const available = Math.max(0, totals.onHand - totals.allocated);
        const sufficient = available >= item.quantity;
        const requiresApproval = !sufficient;

        // Determine warning level
        let warningLevel: "none" | "low" | "critical" = "none";
        if (!sufficient) {
          warningLevel = "critical";
        } else if (available < item.quantity + 10) {
          // Warn if less than 10 units above requested
          warningLevel = "low";
        }

        const firstInv = inventoriesForSku[0];

        return {
          skuId: item.skuId,
          sku: firstInv
            ? {
                code: firstInv.sku.code,
                size: firstInv.sku.size,
                unitOfMeasure: firstInv.sku.unitOfMeasure,
                product: firstInv.sku.product,
              }
            : null,
          warehouse: warehouseLocation || "all",
          locations: totals.locations,
          onHand: totals.onHand,
          allocated: totals.allocated,
          available,
          requested: item.quantity,
          sufficient,
          requiresApproval,
          warningLevel,
          shortfall: sufficient ? 0 : item.quantity - available,
        };
      });

      return NextResponse.json({
        results,
        summary: {
          totalItems: items.length,
          sufficientItems: results.filter((r) => r.sufficient).length,
          insufficientItems: results.filter((r) => !r.sufficient).length,
          requiresApproval: results.some((r) => r.requiresApproval),
          pendingOrdersCount,
        },
      });
    }
  );
}
