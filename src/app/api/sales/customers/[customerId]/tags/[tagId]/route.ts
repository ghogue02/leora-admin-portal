import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

/**
 * DELETE /api/sales/customers/[customerId]/tags/[tagId]
 * Remove a tag (soft delete by setting removedAt)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ customerId: string; tagId: string }> }
) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const { customerId, tagId } = await context.params;

      // Verify customer exists and belongs to tenant
      const customer = await db.customer.findUnique({
        where: {
          id: customerId,
          tenantId,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      // Check if tag exists and is active
      const existingTag = await db.$queryRaw`
        SELECT * FROM "CustomerTag"
        WHERE "id" = ${tagId}::uuid
        AND "tenantId" = ${tenantId}::uuid
        AND "customerId" = ${customerId}::uuid
        AND "removedAt" IS NULL
      `;

      if (!Array.isArray(existingTag) || existingTag.length === 0) {
        return NextResponse.json(
          { error: "Tag not found or already removed" },
          { status: 404 }
        );
      }

      // Soft delete the tag by setting removedAt
      await db.$executeRaw`
        UPDATE "CustomerTag"
        SET "removedAt" = NOW()
        WHERE "id" = ${tagId}::uuid
        AND "tenantId" = ${tenantId}::uuid
        AND "customerId" = ${customerId}::uuid
      `;

      return NextResponse.json({
        success: true,
        message: "Tag removed successfully",
      });
    } catch (error) {
      console.error("Error removing customer tag:", error);
      return NextResponse.json(
        { error: "Failed to remove tag" },
        { status: 500 }
      );
    }
  });
}
