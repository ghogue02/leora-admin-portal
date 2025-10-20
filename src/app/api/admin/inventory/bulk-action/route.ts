import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";
import { logChange, AuditOperation } from "@/lib/audit";

/**
 * POST /api/admin/inventory/bulk-action
 * Perform bulk actions on multiple SKUs
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;
    try {
      const body = await request.json();
      const { action, skuIds } = body;

      if (!action || !skuIds || !Array.isArray(skuIds) || skuIds.length === 0) {
        return NextResponse.json(
          { error: "Missing required fields: action, skuIds (array)" },
          { status: 400 }
        );
      }

      if (!["activate", "deactivate"].includes(action)) {
        return NextResponse.json(
          { error: "Invalid action. Must be: activate or deactivate" },
          { status: 400 }
        );
      }

      const isActive = action === "activate";

      // Verify all SKUs belong to this tenant
      const skus = await db.sku.findMany({
        where: {
          id: { in: skuIds },
          tenantId,
        },
      });

      if (skus.length !== skuIds.length) {
        return NextResponse.json(
          { error: "Some SKUs were not found or do not belong to this tenant" },
          { status: 404 }
        );
      }

      // Perform bulk update
      const result = await db.sku.updateMany({
        where: {
          id: { in: skuIds },
          tenantId,
        },
        data: {
          isActive,
        },
      });

      // Log each change
      await Promise.all(
        skus.map((sku) =>
          logChange(
            {
              tenantId,
              userId: user.id,
              action: AuditOperation.UPDATE,
              entityType: "Sku",
              entityId: sku.id,
              changes: {
                isActive: { old: sku.isActive, new: isActive },
              },
              metadata: {
                skuCode: sku.code,
                bulkAction: action,
              },
            },
            db,
            request
          )
        )
      );

      return NextResponse.json({
        success: true,
        count: result.count,
        message: `Successfully ${action}d ${result.count} SKU(s)`,
      });
    } catch (error) {
      console.error("Error performing bulk action:", error);
      return NextResponse.json({ error: "Failed to perform bulk action" }, { status: 500 });
    }
  });
}
