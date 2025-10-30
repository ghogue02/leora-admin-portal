import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";

type AddressPayload = {
  label?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
};

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, session, tenantId }) => {
      if (!session.portalUser.customerId) {
        return NextResponse.json({ addresses: [] });
      }

      const addresses = await db.customerAddress.findMany({
        where: {
          tenantId,
          customerId: session.portalUser.customerId,
        },
        orderBy: {
          isDefault: "desc",
        },
      });

      return NextResponse.json({
        addresses: addresses.map((address) => ({
          id: address.id,
          label: address.label,
          street1: address.street1,
          street2: address.street2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          isDefault: address.isDefault,
          createdAt: address.createdAt,
          updatedAt: address.updatedAt,
        })),
      });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

export async function POST(request: NextRequest) {
  let payload: AddressPayload;
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

      const street1 = payload.street1?.trim();
      const city = payload.city?.trim();

      if (!street1 || !city) {
        return NextResponse.json({ error: "street1 and city are required." }, { status: 400 });
      }

      const label = payload.label?.trim() || `location-${Date.now()}`;
      const isDefault = Boolean(payload.isDefault);

      if (isDefault) {
        await db.customerAddress.updateMany({
          where: {
            tenantId,
            customerId: session.portalUser.customerId,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      const address = await db.customerAddress.create({
        data: {
          tenantId,
          customerId: session.portalUser.customerId,
          label,
          street1,
          street2: payload.street2?.trim() || null,
          city,
          state: payload.state?.trim() || null,
          postalCode: payload.postalCode?.trim() || null,
          country: payload.country?.trim() || "United States",
          isDefault,
        },
      });

      return NextResponse.json(
        {
          address,
        },
        { status: 201 },
      );
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}
