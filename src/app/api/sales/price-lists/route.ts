import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const priceLists = await db.priceList.findMany({
      where: { tenantId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    return NextResponse.json({
      priceLists: priceLists.map((list) => ({
        id: list.id,
        name: list.name,
        currency: list.currency,
        jurisdictionType: list.jurisdictionType,
        jurisdictionValue: list.jurisdictionValue,
        isDefault: list.isDefault,
        allowManualOverride: list.allowManualOverride,
        effectiveAt: list.effectiveAt,
        expiresAt: list.expiresAt,
      })),
    });
  });
}
