import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { buildMinimumOrderPolicy } from "@/lib/orders/minimum-order-policy";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const settings = await db.tenantSettings.findUnique({
      where: { tenantId },
    });

    const policy = buildMinimumOrderPolicy({
      tenantSettings: settings
        ? {
            minimumOrderAmount: settings.minimumOrderAmount,
            minimumOrderEnforcementEnabled: settings.minimumOrderEnforcementEnabled,
          }
        : undefined,
    });

    return NextResponse.json({
      policy: {
        ...policy,
        overrideAmount: policy.overrideAmount ?? null,
      },
      updatedAt: settings?.updatedAt ?? null,
    });
  });
}
