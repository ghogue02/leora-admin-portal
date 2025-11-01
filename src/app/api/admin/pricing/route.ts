import { NextRequest, NextResponse } from "next/server";
import { withAdminSession, AdminSessionContext } from "@/lib/auth/admin";
import { logChange, AuditOperation } from "@/lib/audit";

/**
 * GET /api/admin/pricing
 * List all price lists
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const priceLists = await db.priceList.findMany({
        where: { tenantId },
        include: {
          items: {
            select: { id: true },
          },
        },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });

      return NextResponse.json({
        priceLists: priceLists.map((pl) => ({
          id: pl.id,
          name: pl.name,
          currency: pl.currency,
          isDefault: pl.isDefault,
          effectiveAt: pl.effectiveAt,
          expiresAt: pl.expiresAt,
          jurisdictionType: pl.jurisdictionType,
          jurisdictionValue: pl.jurisdictionValue,
          allowManualOverride: pl.allowManualOverride,
          itemCount: pl.items.length,
        })),
      });
    } catch (error) {
      console.error("Error fetching price lists:", error);
      return NextResponse.json({ error: "Failed to fetch price lists" }, { status: 500 });
    }
  });
}

/**
 * POST /api/admin/pricing
 * Create a new price list
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;
    try {
      const body = await request.json();
      const {
        name,
        currency,
        isDefault,
        effectiveAt,
        expiresAt,
        jurisdictionType = "GLOBAL",
        jurisdictionValue,
        allowManualOverride = false,
      } = body;

      if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }

      if (jurisdictionType !== "GLOBAL" && !jurisdictionValue) {
        return NextResponse.json(
          { error: "Jurisdiction value is required for non-global price lists" },
          { status: 400 },
        );
      }

      // If setting as default, unset other defaults
      if (isDefault) {
        await db.priceList.updateMany({
          where: { tenantId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const priceList = await db.priceList.create({
        data: {
          tenantId,
          name,
          currency: currency || "USD",
          isDefault: isDefault || false,
          effectiveAt: effectiveAt ? new Date(effectiveAt) : null,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          jurisdictionType,
          jurisdictionValue: jurisdictionValue ?? null,
          allowManualOverride,
        },
      });

      // Log creation
      await logChange(
        {
          tenantId,
          userId: user.id,
          action: AuditOperation.CREATE,
          entityType: "PriceList",
          entityId: priceList.id,
          metadata: {
            name: priceList.name,
            currency: priceList.currency,
            isDefault: priceList.isDefault,
          },
        },
        db,
        request
      );

      return NextResponse.json({ priceList }, { status: 201 });
    } catch (error: any) {
      console.error("Error creating price list:", error);

      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A price list with this name already exists" },
          { status: 409 }
        );
      }

      return NextResponse.json({ error: "Failed to create price list" }, { status: 500 });
    }
  });
}
