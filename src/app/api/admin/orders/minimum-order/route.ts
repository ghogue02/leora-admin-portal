import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAdminSession } from "@/lib/auth/admin";
import { buildMinimumOrderPolicy } from "@/lib/orders/minimum-order-policy";

const UpdateSchema = z.object({
  minimumOrderAmount: z.number().min(0).max(100_000),
  enforcementEnabled: z.boolean(),
});

export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId }) => {
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

export async function PUT(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = UpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { minimumOrderAmount, enforcementEnabled } = parsed.data;

  return withAdminSession(request, async ({ db, tenantId, user }) => {
    const settings = await db.tenantSettings.upsert({
      where: { tenantId },
      update: {
        minimumOrderAmount,
        minimumOrderEnforcementEnabled: enforcementEnabled,
      },
      create: {
        tenantId,
        minimumOrderAmount,
        minimumOrderEnforcementEnabled: enforcementEnabled,
      },
    });

    const policy = buildMinimumOrderPolicy({
      tenantSettings: {
        minimumOrderAmount: settings.minimumOrderAmount,
        minimumOrderEnforcementEnabled: settings.minimumOrderEnforcementEnabled,
      },
    });

    return NextResponse.json({
      policy: {
        ...policy,
        overrideAmount: policy.overrideAmount ?? null,
      },
      updatedAt: settings.updatedAt,
      updatedBy: {
        id: user.id,
        name: user.fullName,
      },
    });
  });
}
