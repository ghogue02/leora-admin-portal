import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";
import { logChange } from "@/lib/audit";

/**
 * POST /api/admin/inventory/[skuId]/adjust
 * Adjust inventory for a specific location
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;
    try {
      const { skuId } = await params;
      const body = await request.json();

      const { location, adjustmentType, quantity, reason } = body;

      // Validate input
      if (!location || !adjustmentType || !quantity || !reason) {
        return NextResponse.json(
          { error: "Missing required fields: location, adjustmentType, quantity, reason" },
          { status: 400 }
        );
      }

      if (quantity <= 0) {
        return NextResponse.json(
          { error: "Quantity must be greater than 0" },
          { status: 400 }
        );
      }

      if (!["add", "subtract", "set"].includes(adjustmentType)) {
        return NextResponse.json(
          { error: "Invalid adjustment type. Must be: add, subtract, or set" },
          { status: 400 }
        );
      }

      // Verify SKU exists
      const sku = await db.sku.findFirst({
        where: { id: skuId, tenantId },
      });

      if (!sku) {
        return NextResponse.json({ error: "SKU not found" }, { status: 404 });
      }

      // Find or create inventory record for this location
      let inventory = await db.inventory.findFirst({
        where: {
          tenantId,
          skuId,
          location,
        },
      });

      const oldQuantity = inventory?.onHand || 0;
      let newQuantity: number;

      // Calculate new quantity based on adjustment type
      switch (adjustmentType) {
        case "add":
          newQuantity = oldQuantity + quantity;
          break;
        case "subtract":
          newQuantity = oldQuantity - quantity;
          break;
        case "set":
          newQuantity = quantity;
          break;
        default:
          return NextResponse.json({ error: "Invalid adjustment type" }, { status: 400 });
      }

      // Prevent negative inventory
      if (newQuantity < 0) {
        return NextResponse.json(
          { error: "Adjustment would result in negative inventory" },
          { status: 400 }
        );
      }

      // Update or create inventory
      if (inventory) {
        inventory = await db.inventory.update({
          where: { id: inventory.id },
          data: { onHand: newQuantity },
        });
      } else {
        inventory = await db.inventory.create({
          data: {
            tenantId,
            skuId,
            location,
            onHand: newQuantity,
            allocated: 0,
          },
        });
      }

      // Log the adjustment with reason
      await logChange(
        {
          tenantId,
          userId: user.id,
          action: "INVENTORY_ADJUSTMENT",
          entityType: "Inventory",
          entityId: inventory.id,
          changes: {
            onHand: {
              old: oldQuantity,
              new: newQuantity,
            },
          },
          metadata: {
            location,
            adjustmentType,
            quantity,
            reason,
            skuCode: sku.code,
          },
          reason,
        },
        db,
        request
      );

      return NextResponse.json({
        success: true,
        inventory: {
          id: inventory.id,
          location: inventory.location,
          onHand: inventory.onHand,
          allocated: inventory.allocated,
        },
        adjustment: {
          oldQuantity,
          newQuantity,
          difference: newQuantity - oldQuantity,
        },
      });
    } catch (error) {
      console.error("Error adjusting inventory:", error);
      return NextResponse.json({ error: "Failed to adjust inventory" }, { status: 500 });
    }
  });
}
