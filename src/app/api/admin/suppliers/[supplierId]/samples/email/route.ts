import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";
import { sendSupplierSampleReportEmail } from "@/lib/samples/supplier-email";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ supplierId: string }> },
) {
  return withAdminSession(request, async ({ db, tenantId, user }) => {
    const { supplierId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const recipient = typeof body?.recipient === "string" ? body.recipient : user.email;

    const result = await sendSupplierSampleReportEmail(db, {
      tenantId,
      supplierId,
      recipient,
      requestedBy: user,
      startDate: body?.startDate,
      endDate: body?.endDate,
    });

    return NextResponse.json({ success: true, result });
  });
}
