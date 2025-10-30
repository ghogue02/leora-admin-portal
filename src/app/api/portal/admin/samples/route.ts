import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

type UpdateAllowanceBody = {
  monthlyAllowance?: number;
};

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId }) => {
      const settings = await db.tenantSettings.findUnique({
        where: { tenantId },
      });

      return NextResponse.json({
        allowance: settings?.sampleAllowancePerMonth ?? 60,
        tenantId,
      });
    },
    { requiredPermissions: ["portal.samples.configure"] },
  );
}

export async function PATCH(request: NextRequest) {
  let body: UpdateAllowanceBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { monthlyAllowance } = body;

  if (monthlyAllowance !== undefined) {
    if (!Number.isInteger(monthlyAllowance) || monthlyAllowance < 0) {
      return NextResponse.json(
        { error: "monthlyAllowance must be a non-negative integer when provided." },
        { status: 400 },
      );
    }
  } else {
    return NextResponse.json({ error: "monthlyAllowance is required." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId }) => {
      const updated = await db.tenantSettings.upsert({
        where: { tenantId },
        update: {
          sampleAllowancePerMonth: monthlyAllowance,
        },
        create: {
          tenantId,
          sampleAllowancePerMonth: monthlyAllowance,
          defaultPortalRole: "portal.viewer",
        },
      });

      return NextResponse.json({
        allowance: updated.sampleAllowancePerMonth,
        tenantId,
      });
    },
    { requiredPermissions: ["portal.samples.configure"] },
  );
}
