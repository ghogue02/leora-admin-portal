import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  const body = await request.json();

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        const { updates } = body;

        if (!Array.isArray(updates) || updates.length === 0) {
          return NextResponse.json(
            { error: "Updates array is required" },
            { status: 400 },
          );
        }

        const results: unknown[] = [];
        const errors: Array<{ skuId?: string; error: string }> = [];

        for (const update of updates) {
          try {
            const { skuId, location, aisle, row } = update ?? {};

            if (!skuId || !location) {
              errors.push({ skuId, error: "Missing skuId or location" });
              continue;
            }

            const existingInventory = await db.inventory.findFirst({
              where: {
                tenantId,
                skuId,
              },
            });

            if (existingInventory) {
              const updated = await db.inventory.update({
                where: { id: existingInventory.id },
                data: { location, aisle, row },
                include: {
                  sku: {
                    include: {
                      product: true,
                    },
                  },
                },
              });
              results.push(updated);
            } else {
              const created = await db.inventory.create({
                data: {
                  tenantId,
                  skuId,
                  location,
                  aisle,
                  row,
                  onHand: 0,
                  allocated: 0,
                },
                include: {
                  sku: {
                    include: {
                      product: true,
                    },
                  },
                },
              });
              results.push(created);
            }
          } catch (error) {
            errors.push({ skuId: update?.skuId, error: String(error) });
          }
        }

        return NextResponse.json({
          success: results.length,
          failed: errors.length,
          results,
          errors,
        });
      } catch (error) {
        console.error("Error bulk updating locations:", error);
        return NextResponse.json(
          { error: "Failed to bulk update locations" },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
