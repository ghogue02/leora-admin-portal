import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

/**
 * POST /api/sales/products/[productId]/archive
 *
 * Archive a product
 * - Sets isArchived = true
 * - Sets archivedAt = NOW()
 * - Sets archivedBy = userId
 *
 * Returns success message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const { productId } = await params;

      console.log("📦 [Archive Product] Starting archive");
      console.log("📦 [Archive Product] productId:", productId);
      console.log("📦 [Archive Product] userId:", session.user.id);
      console.log("📦 [Archive Product] tenantId:", tenantId);

      // Verify the product exists and belongs to this tenant
      const product = await db.product.findFirst({
        where: {
          id: productId,
          tenantId,
        },
        select: {
          id: true,
          name: true,
          isArchived: true,
        },
      });

      if (!product) {
        console.log("❌ [Archive Product] Product not found");
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      if (product.isArchived) {
        console.log("⚠️ [Archive Product] Product already archived");
        return NextResponse.json(
          {
            error: "Product is already archived",
            product: {
              id: product.id,
              name: product.name,
              isArchived: product.isArchived,
            }
          },
          { status: 400 }
        );
      }

      // Archive the product
      const archivedProduct = await db.product.update({
        where: {
          id: productId,
        },
        data: {
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: session.user.id,
        },
        select: {
          id: true,
          name: true,
          isArchived: true,
          archivedAt: true,
          archivedBy: true,
        },
      });

      console.log("✅ [Archive Product] Product archived successfully");
      console.log("✅ [Archive Product] Product:", archivedProduct.name);

      return NextResponse.json({
        success: true,
        message: `Product "${archivedProduct.name}" has been archived`,
        product: archivedProduct,
      });
    } catch (error) {
      console.error("❌ [Archive Product] Error:", error);
      return NextResponse.json(
        {
          error: "Failed to archive product",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  });
}

/**
 * DELETE /api/sales/products/[productId]/archive
 *
 * Unarchive a product
 * - Sets isArchived = false
 * - Clears archivedAt
 * - Clears archivedBy
 *
 * Returns success message
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const { productId } = await params;

      console.log("📦 [Unarchive Product] Starting unarchive");
      console.log("📦 [Unarchive Product] productId:", productId);
      console.log("📦 [Unarchive Product] userId:", session.user.id);
      console.log("📦 [Unarchive Product] tenantId:", tenantId);

      // Verify the product exists and belongs to this tenant
      const product = await db.product.findFirst({
        where: {
          id: productId,
          tenantId,
        },
        select: {
          id: true,
          name: true,
          isArchived: true,
        },
      });

      if (!product) {
        console.log("❌ [Unarchive Product] Product not found");
        return NextResponse.json(
          { error: "Product not found" },
          { status: 404 }
        );
      }

      if (!product.isArchived) {
        console.log("⚠️ [Unarchive Product] Product is not archived");
        return NextResponse.json(
          {
            error: "Product is not archived",
            product: {
              id: product.id,
              name: product.name,
              isArchived: product.isArchived,
            }
          },
          { status: 400 }
        );
      }

      // Unarchive the product
      const unarchivedProduct = await db.product.update({
        where: {
          id: productId,
        },
        data: {
          isArchived: false,
          archivedAt: null,
          archivedBy: null,
        },
        select: {
          id: true,
          name: true,
          isArchived: true,
          archivedAt: true,
          archivedBy: true,
        },
      });

      console.log("✅ [Unarchive Product] Product unarchived successfully");
      console.log("✅ [Unarchive Product] Product:", unarchivedProduct.name);

      return NextResponse.json({
        success: true,
        message: `Product "${unarchivedProduct.name}" has been restored from archive`,
        product: unarchivedProduct,
      });
    } catch (error) {
      console.error("❌ [Unarchive Product] Error:", error);
      return NextResponse.json(
        {
          error: "Failed to unarchive product",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  });
}
