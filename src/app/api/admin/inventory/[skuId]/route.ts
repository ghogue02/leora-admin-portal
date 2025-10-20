import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";
import { logChange, calculateChanges, AuditOperation } from "@/lib/audit";
import { PrismaClient } from "@prisma/client";

/**
 * GET /api/admin/inventory/[skuId]
 * Get single SKU with all details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const { skuId } = await params;

      const sku = await db.sku.findFirst({
        where: {
          id: skuId,
          tenantId,
        },
        include: {
          product: {
            include: {
              supplier: true,
            },
          },
          inventories: {
            orderBy: { location: "asc" },
          },
          priceListItems: {
            include: {
              priceList: {
                select: {
                  id: true,
                  name: true,
                  currency: true,
                  effectiveAt: true,
                  expiresAt: true,
                },
              },
            },
            orderBy: {
              priceList: { name: "asc" },
            },
          },
        },
      });

      if (!sku) {
        return NextResponse.json({ error: "SKU not found" }, { status: 404 });
      }

      // Get audit history for this SKU and its product
      const auditLogs = await db.auditLog.findMany({
        where: {
          tenantId,
          OR: [
            { entityType: "Sku", entityId: sku.id },
            { entityType: "Product", entityId: sku.product.id },
            {
              entityType: "Inventory",
              entityId: { in: sku.inventories.map((inv) => inv.id) },
            },
          ],
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return NextResponse.json({
        sku: {
          id: sku.id,
          code: sku.code,
          size: sku.size,
          unitOfMeasure: sku.unitOfMeasure,
          abv: sku.abv,
          casesPerPallet: sku.casesPerPallet,
          pricePerUnit: sku.pricePerUnit,
          isActive: sku.isActive,
          product: {
            id: sku.product.id,
            name: sku.product.name,
            brand: sku.product.brand,
            description: sku.product.description,
            category: sku.product.category,
            isSampleOnly: sku.product.isSampleOnly,
            supplierId: sku.product.supplierId,
          },
          inventories: sku.inventories.map((inv) => ({
            id: inv.id,
            location: inv.location,
            onHand: inv.onHand,
            allocated: inv.allocated,
          })),
          priceListItems: sku.priceListItems.map((item) => ({
            id: item.id,
            price: Number(item.price),
            minQuantity: item.minQuantity,
            maxQuantity: item.maxQuantity,
            priceList: item.priceList,
          })),
          supplier: sku.product.supplier
            ? {
                id: sku.product.supplier.id,
                name: sku.product.supplier.name,
              }
            : null,
        },
        auditLogs,
      });
    } catch (error) {
      console.error("Error fetching SKU:", error);
      return NextResponse.json({ error: "Failed to fetch SKU" }, { status: 500 });
    }
  });
}

/**
 * PUT /api/admin/inventory/[skuId]
 * Update SKU and/or Product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ skuId: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;
    try {
      const { skuId } = await params;
      const body = await request.json();

      // Fetch current SKU and product
      const currentSku = await db.sku.findFirst({
        where: { id: skuId, tenantId },
        include: { product: true },
      });

      if (!currentSku) {
        return NextResponse.json({ error: "SKU not found" }, { status: 404 });
      }

      // Update product if fields provided
      const productUpdates: any = {};
      if (body.productName !== undefined) productUpdates.name = body.productName;
      if (body.brand !== undefined) productUpdates.brand = body.brand;
      if (body.category !== undefined) productUpdates.category = body.category;
      if (body.description !== undefined) productUpdates.description = body.description;
      if (body.supplierId !== undefined) productUpdates.supplierId = body.supplierId;
      if (body.isSampleOnly !== undefined) productUpdates.isSampleOnly = body.isSampleOnly;

      // Update SKU fields
      const skuUpdates: any = {};
      if (body.isActive !== undefined) skuUpdates.isActive = body.isActive;
      if (body.size !== undefined) skuUpdates.size = body.size;
      if (body.unitOfMeasure !== undefined) skuUpdates.unitOfMeasure = body.unitOfMeasure;
      if (body.abv !== undefined) skuUpdates.abv = body.abv;
      if (body.casesPerPallet !== undefined) skuUpdates.casesPerPallet = body.casesPerPallet;
      if (body.pricePerUnit !== undefined) skuUpdates.pricePerUnit = body.pricePerUnit;

      // Perform updates in transaction
      const dbClient = db as PrismaClient;
      const [updatedProduct, updatedSku] = await dbClient.$transaction([
        // Update product if there are changes
        Object.keys(productUpdates).length > 0
          ? dbClient.product.update({
              where: { id: currentSku.productId },
              data: productUpdates,
            })
          : (dbClient.product.findUnique({ where: { id: currentSku.productId } }) as any),
        // Update SKU if there are changes
        Object.keys(skuUpdates).length > 0
          ? dbClient.sku.update({
              where: { id: skuId },
              data: skuUpdates,
            })
          : (dbClient.sku.findUnique({ where: { id: skuId } }) as any),
      ]);

      // Log product changes
      if (Object.keys(productUpdates).length > 0) {
        const productChanges = calculateChanges(
          currentSku.product as any,
          updatedProduct as any
        );
        await logChange(
          {
            tenantId,
            userId: user.id,
            action: AuditOperation.UPDATE,
            entityType: "Product",
            entityId: currentSku.productId,
            changes: productChanges,
          },
          db,
          request
        );
      }

      // Log SKU changes
      if (Object.keys(skuUpdates).length > 0) {
        const skuChanges = calculateChanges(currentSku as any, updatedSku as any);
        await logChange(
          {
            tenantId,
            userId: user.id,
            action: AuditOperation.UPDATE,
            entityType: "Sku",
            entityId: skuId,
            changes: skuChanges,
          },
          db,
          request
        );
      }

      return NextResponse.json({
        success: true,
        sku: updatedSku,
        product: updatedProduct,
      });
    } catch (error) {
      console.error("Error updating SKU:", error);
      return NextResponse.json({ error: "Failed to update SKU" }, { status: 500 });
    }
  });
}
