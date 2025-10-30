import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      if (!session.portalUser.customerId) {
        return NextResponse.json({ error: "Customer context required." }, { status: 400 });
      }

      const method = await db.portalPaymentMethod.findFirst({
        where: {
          id: params.id,
          tenantId,
          customerId: session.portalUser.customerId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (!method) {
        return NextResponse.json({ error: "Payment method not found." }, { status: 404 });
      }

      await db.portalPaymentMethod.delete({
        where: { id: method.id },
      });

      if (method.isDefault) {
        const nextDefault = await db.portalPaymentMethod.findFirst({
          where: {
            tenantId,
            customerId: session.portalUser.customerId,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        if (nextDefault) {
          await db.portalPaymentMethod.update({
            where: { id: nextDefault.id },
            data: { isDefault: true },
          });
        }
      }

      return NextResponse.json({ success: true });
    },
    { requiredPermissions: ["portal.orders.write"] },
  );
}
