import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

/**
 * GET /api/sales/orders/purchase-orders
 * List all purchase orders
 */
export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, roles }) => {
      // Check if user has admin/manager role for PO access
      const canViewPOs =
        roles.includes("sales.admin") ||
        roles.includes("sales.manager") ||
        roles.includes("warehouse.manager");

      if (!canViewPOs) {
        return NextResponse.json(
          { error: "Insufficient permissions to view purchase orders" },
          { status: 403 },
        );
      }

      const purchaseOrders = await db.$queryRaw<
        Array<{
          id: string;
          poNumber: string;
          supplierId: string | null;
          supplierName: string | null;
          status: string;
          orderedAt: Date;
          expectedAt: Date | null;
          receivedAt: Date | null;
          lineCount: bigint;
          totalCost: string;
        }>
      >`
        SELECT
          po.id,
          po."poNumber",
          po."supplierId",
          s.name as "supplierName",
          po.status,
          po."orderedAt",
          po."expectedAt",
          po."receivedAt",
          COUNT(pol.id)::bigint as "lineCount",
          COALESCE(SUM(pol.quantity * pol."unitCost"), 0)::text as "totalCost"
        FROM "PurchaseOrder" po
        LEFT JOIN "Supplier" s ON s.id = po."supplierId"
        LEFT JOIN "PurchaseOrderLine" pol ON pol."purchaseOrderId" = po.id
        WHERE po."tenantId" = ${tenantId}::uuid
        GROUP BY po.id, po."poNumber", po."supplierId", s.name, po.status, po."orderedAt", po."expectedAt", po."receivedAt"
        ORDER BY po."orderedAt" DESC
      `;

      return NextResponse.json({
        purchaseOrders: purchaseOrders.map((po) => ({
          id: po.id,
          poNumber: po.poNumber,
          supplier: po.supplierId
            ? {
                id: po.supplierId,
                name: po.supplierName ?? "Unknown",
              }
            : null,
          status: po.status,
          orderedAt: po.orderedAt,
          expectedAt: po.expectedAt,
          receivedAt: po.receivedAt,
          lineCount: Number(po.lineCount),
          totalCost: parseFloat(po.totalCost),
        })),
      });
    },
    { requireSalesRep: false },
  );
}

/**
 * POST /api/sales/orders/purchase-orders
 * Create a new purchase order
 */
export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, roles }) => {
      // Check if user has admin/manager role for PO creation
      const canCreatePOs =
        roles.includes("sales.admin") ||
        roles.includes("sales.manager") ||
        roles.includes("warehouse.manager");

      if (!canCreatePOs) {
        return NextResponse.json(
          { error: "Insufficient permissions to create purchase orders" },
          { status: 403 },
        );
      }

      const body = await request.json();
      const { poNumber, supplierId, expectedAt, notes, items } = body as {
        poNumber: string;
        supplierId?: string;
        expectedAt?: string;
        notes?: string;
        items: Array<{ skuId: string; quantity: number; unitCost: number }>;
      };

      if (!poNumber || !items || items.length === 0) {
        return NextResponse.json(
          { error: "PO number and items are required" },
          { status: 400 },
        );
      }

      // Create PO in transaction
      const purchaseOrder = await db.$transaction(async (tx) => {
        const po = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO "PurchaseOrder" (
            "tenantId", "poNumber", "supplierId", "status", "orderedAt", "expectedAt", "notes"
          ) VALUES (
            ${tenantId}::uuid,
            ${poNumber},
            ${supplierId ?? null}::uuid,
            'PENDING',
            NOW(),
            ${expectedAt ? new Date(expectedAt) : null}::timestamp,
            ${notes ?? null}
          )
          RETURNING id
        `;

        const poId = po[0].id;

        // Insert PO lines
        for (const item of items) {
          await tx.$executeRaw`
            INSERT INTO "PurchaseOrderLine" (
              "tenantId", "purchaseOrderId", "skuId", "quantity", "unitCost"
            ) VALUES (
              ${tenantId}::uuid,
              ${poId}::uuid,
              ${item.skuId}::uuid,
              ${item.quantity},
              ${item.unitCost}
            )
          `;
        }

        return poId;
      });

      return NextResponse.json(
        { success: true, purchaseOrderId: purchaseOrder },
        { status: 201 },
      );
    },
    { requireSalesRep: false },
  );
}
