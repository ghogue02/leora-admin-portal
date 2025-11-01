import { NextRequest, NextResponse } from "next/server";
import { withAdminSession } from "@/lib/auth/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: { customerId: string; flagId: string } },
) {
  const { customerId, flagId } = params;

  return withAdminSession(request, async ({ db, tenantId, user }) => {
    try {
      const flag = await db.customerDuplicateFlag.findFirst({
        where: {
          id: flagId,
          tenantId,
          customerId,
          status: "OPEN",
        },
      });

      if (!flag) {
        return NextResponse.json({ error: "Duplicate flag not found." }, { status: 404 });
      }

      const resolved = await db.customerDuplicateFlag.update({
        where: { id: flag.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedBy: user.id,
        },
      });

      await db.auditLog.create({
        data: {
          tenantId,
          userId: user.id,
          entityType: "CustomerDuplicateFlag",
          entityId: flag.id,
          action: "resolved",
          metadata: {
            customerId,
          },
        },
      });

      return NextResponse.json({ success: true, flag: resolved });
    } catch (error) {
      console.error("[admin/customers/duplicate-flags/resolve]", error);
      return NextResponse.json({ error: "Unable to resolve flag." }, { status: 500 });
    }
  });
}
