import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import type { Prisma } from "@prisma/client";

/**
 * PUT /api/sales/catalog/[skuId]
 * Update product and SKU details
 * Per Travis: Anyone can edit, any fields, edits go live immediately
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { skuId: string } }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const { skuId } = params;
      const updates = await request.json();

      try {
        // Get current SKU with product
        const sku = await db.sku.findFirst({
          where: {
            id: skuId,
            tenantId,
          },
          include: {
            product: true,
          },
        });

        if (!sku) {
          return NextResponse.json({ error: "SKU not found" }, { status: 404 });
        }

        // Update Product fields
        if (updates.product) {
          const productUpdates: Prisma.ProductUpdateInput = {};

          // Basic fields
          if (updates.product.name !== undefined) productUpdates.name = updates.product.name;
          if (updates.product.brand !== undefined) productUpdates.brand = updates.product.brand;
          if (updates.product.category !== undefined) productUpdates.category = updates.product.category;
          if (updates.product.description !== undefined) productUpdates.description = updates.product.description;

          // Wine details
          if (updates.product.vintage !== undefined) productUpdates.vintage = updates.product.vintage;
          if (updates.product.colour !== undefined) productUpdates.colour = updates.product.colour;
          if (updates.product.varieties !== undefined) productUpdates.varieties = updates.product.varieties;
          if (updates.product.style !== undefined) productUpdates.style = updates.product.style;
          if (updates.product.manufacturer !== undefined) productUpdates.manufacturer = updates.product.manufacturer;

          // Enriched data (JSON fields)
          if (updates.product.tastingNotes !== undefined) productUpdates.tastingNotes = updates.product.tastingNotes;
          if (updates.product.foodPairings !== undefined) productUpdates.foodPairings = updates.product.foodPairings;
          if (updates.product.servingInfo !== undefined) productUpdates.servingInfo = updates.product.servingInfo;
          if (updates.product.wineDetails !== undefined) productUpdates.wineDetails = updates.product.wineDetails;

          // Cost tracking
          if (updates.product.unitCogs !== undefined) productUpdates.unitCogs = updates.product.unitCogs;

          // Regulatory
          if (updates.product.abcCode !== undefined) productUpdates.abcCode = updates.product.abcCode;
          if (updates.product.mocoNumber !== undefined) productUpdates.mocoNumber = updates.product.mocoNumber;

          if (Object.keys(productUpdates).length > 0) {
            await db.product.update({
              where: { id: sku.product.id },
              data: productUpdates,
            });
          }
        }

        // Update SKU fields
        if (updates.sku) {
          const skuUpdates: Prisma.SkuUpdateInput = {};

          if (updates.sku.size !== undefined) skuUpdates.size = updates.sku.size;
          if (updates.sku.unitOfMeasure !== undefined) skuUpdates.unitOfMeasure = updates.sku.unitOfMeasure;
          if (updates.sku.abv !== undefined) skuUpdates.abv = updates.sku.abv;
          if (updates.sku.itemsPerCase !== undefined) skuUpdates.itemsPerCase = updates.sku.itemsPerCase;
          if (updates.sku.liters !== undefined) skuUpdates.liters = updates.sku.liters;
          if (updates.sku.bottleBarcode !== undefined) skuUpdates.bottleBarcode = updates.sku.bottleBarcode;
          if (updates.sku.caseBarcode !== undefined) skuUpdates.caseBarcode = updates.sku.caseBarcode;
          if (updates.sku.batchNumber !== undefined) skuUpdates.batchNumber = updates.sku.batchNumber;
          if (updates.sku.barrelOrTank !== undefined) skuUpdates.barrelOrTank = updates.sku.barrelOrTank;
          if (updates.sku.casesPerPallet !== undefined) skuUpdates.casesPerPallet = updates.sku.casesPerPallet;

          if (Object.keys(skuUpdates).length > 0) {
            await db.sku.update({
              where: { id: skuId },
              data: skuUpdates,
            });
          }
        }

        // Audit log (track who changed what)
        await db.auditLog.create({
          data: {
            tenantId,
            userId: session.user.id,
            action: "UPDATE_PRODUCT",
            entityType: "Product",
            entityId: sku.product.id,
            changes: updates,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Product updated successfully",
        });
      } catch (error: unknown) {
        console.error("[ProductUpdate] Error:", error);
        return NextResponse.json(
          {
            error: "Failed to update product",
            details: error instanceof Error ? error.message : undefined,
          },
          { status: 500 }
        );
      }
    },
    { requireSalesRep: false } // Anyone can edit per Travis
  );
}

/**
 * PATCH /api/sales/catalog/[skuId]?action=archive
 * Archive or unarchive a product
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { skuId: string } }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const { skuId } = params;
      const { searchParams } = new URL(request.url);
      const action = searchParams.get("action");

      if (action !== "archive") {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
      }

      try {
        // Get current SKU with product
        const sku = await db.sku.findFirst({
          where: {
            id: skuId,
            tenantId,
          },
          include: {
            product: true,
          },
        });

        if (!sku) {
          return NextResponse.json({ error: "SKU not found" }, { status: 404 });
        }

        const isArchived = sku.product.isArchived;
        const newArchivedState = !isArchived;

        // Update product archive status
        await db.product.update({
          where: { id: sku.product.id },
          data: {
            isArchived: newArchivedState,
            archivedAt: newArchivedState ? new Date() : null,
            archivedBy: newArchivedState ? session.user.id : null,
          },
        });

        // Audit log
        await db.auditLog.create({
          data: {
            tenantId,
            userId: session.user.id,
            action: newArchivedState ? "ARCHIVE_PRODUCT" : "UNARCHIVE_PRODUCT",
            entityType: "Product",
            entityId: sku.product.id,
            changes: {
              isArchived: newArchivedState,
              productName: sku.product.name,
            },
          },
        });

        return NextResponse.json({
          success: true,
          message: newArchivedState
            ? "Product archived successfully"
            : "Product unarchived successfully",
          isArchived: newArchivedState,
        });
      } catch (error: unknown) {
        console.error("[ProductArchive] Error:", error);
        return NextResponse.json(
          {
            error: "Failed to archive product",
            details: error instanceof Error ? error.message : undefined,
          },
          { status: 500 }
        );
      }
    },
    { requireSalesRep: false } // Anyone can archive
  );
}
