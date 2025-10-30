import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

type UpdateAddressPayload = {
  label?: string;
  street1?: string;
  street2?: string | null;
  city?: string;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  isDefault?: boolean;
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  let payload: UpdateAddressPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, session, tenantId }) => {
      if (!session.portalUser.customerId) {
        return NextResponse.json({ error: "Customer context required." }, { status: 400 });
      }

      const address = await db.customerAddress.findFirst({
        where: {
          id: params.id,
          tenantId,
          customerId: session.portalUser.customerId,
        },
      });

      if (!address) {
        return NextResponse.json({ error: "Address not found." }, { status: 404 });
      }

      const updateData = {
        label: payload.label?.trim() || address.label,
        street1: payload.street1?.trim() || address.street1,
        street2: payload.street2 === undefined ? address.street2 : payload.street2?.trim() || null,
        city: payload.city?.trim() || address.city,
        state: payload.state === undefined ? address.state : payload.state?.trim() || null,
        postalCode: payload.postalCode === undefined ? address.postalCode : payload.postalCode?.trim() || null,
        country: payload.country?.trim() || address.country,
      };

      if (!updateData.street1 || !updateData.city) {
        return NextResponse.json({ error: "street1 and city are required." }, { status: 400 });
      }

      if (payload.isDefault) {
        await db.customerAddress.updateMany({
          where: {
            tenantId,
            customerId: session.portalUser.customerId,
            isDefault: true,
            NOT: { id: address.id },
          },
          data: { isDefault: false },
        });
      }

      const updated = await db.customerAddress.update({
        where: { id: address.id },
        data: {
          ...updateData,
          isDefault: payload.isDefault ?? address.isDefault,
        },
      });

      return NextResponse.json({ address: updated });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return withPortalSession(
    request,
    async ({ db, session, tenantId }) => {
      if (!session.portalUser.customerId) {
        return NextResponse.json({ error: "Customer context required." }, { status: 400 });
      }

      const address = await db.customerAddress.findFirst({
        where: {
          id: params.id,
          tenantId,
          customerId: session.portalUser.customerId,
        },
      });

      if (!address) {
        return NextResponse.json({ error: "Address not found." }, { status: 404 });
      }

      if (address.isDefault) {
        return NextResponse.json({ error: "Cannot delete the default address." }, { status: 409 });
      }

      await db.customerAddress.delete({ where: { id: address.id } });

      return NextResponse.json({ success: true });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}
