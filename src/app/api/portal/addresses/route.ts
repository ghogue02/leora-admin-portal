import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";
import { runWithTransaction } from "@/lib/prisma";
import { serializeAddress } from "./serializer";
import { coerceBoolean, coerceString } from "@/lib/api/parsers";

const VIEW_PERMISSION = ["portal.addresses.view"] as const;
const MANAGE_PERMISSION = ["portal.addresses.manage"] as const;

type AddressPayload = {
  label?: unknown;
  street1?: unknown;
  street2?: unknown;
  city?: unknown;
  state?: unknown;
  postalCode?: unknown;
  country?: unknown;
  isDefault?: unknown;
};

type UpdateAddressPayload = AddressPayload & {
  addressId?: unknown;
};

type DeleteAddressPayload = {
  addressId?: unknown;
};

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const customerId = session.portalUser.customerId;
      if (!customerId) {
        return NextResponse.json(
          { error: "Portal user is not linked to a customer." },
          { status: 409 },
        );
      }

      const addresses = await db.customerAddress.findMany({
        where: {
          tenantId,
          customerId,
        },
        orderBy: [
          {
            isDefault: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
      });

      return NextResponse.json({
        addresses: addresses.map(serializeAddress),
      });
    },
    { requiredPermissions: [...VIEW_PERMISSION] },
  );
}

export async function POST(request: NextRequest) {
  let payload: AddressPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const label = coerceString(payload.label) || "primary";
  const street1 = coerceString(payload.street1);
  const street2 = coerceString(payload.street2);
  const city = coerceString(payload.city);
  const state = coerceString(payload.state);
  const postalCode = coerceString(payload.postalCode);
  const country = coerceString(payload.country) || "United States";
  const isDefault = coerceBoolean(payload.isDefault);

  if (!street1 || !city || !state || !postalCode) {
    return NextResponse.json(
      { error: "street1, city, state, and postalCode are required." },
      { status: 400 },
    );
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const customerId = session.portalUser.customerId;
      if (!customerId) {
        return NextResponse.json(
          { error: "Portal user is not linked to a customer." },
          { status: 409 },
        );
      }

      try {
        const created = await runWithTransaction(db, async (tx) => {
          const existingDefault = await tx.customerAddress.findFirst({
            where: {
              tenantId,
              customerId,
              isDefault: true,
            },
          });

          const address = await tx.customerAddress.create({
            data: {
              tenantId,
              customerId,
              label,
              street1,
              street2: street2 || null,
              city,
              state,
              postalCode,
              country,
              isDefault: isDefault || !existingDefault,
            },
          });

          if (isDefault || !existingDefault) {
            await tx.customerAddress.updateMany({
              where: {
                tenantId,
                customerId,
                NOT: { id: address.id },
              },
              data: { isDefault: false },
            });
          }

          return tx.customerAddress.findUniqueOrThrow({
            where: { id: address.id },
          });
        });

        return NextResponse.json({ address: serializeAddress(created) }, { status: 201 });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return NextResponse.json(
            { error: "Address label must be unique for this customer." },
            { status: 409 },
          );
        }

        console.error("Failed to create address:", error);
        return NextResponse.json({ error: "Unable to create address." }, { status: 500 });
      }
    },
    { requiredPermissions: [...MANAGE_PERMISSION] },
  );
}

export async function PATCH(request: NextRequest) {
  let payload: UpdateAddressPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = coerceString(payload.addressId);
  if (!id) {
    return NextResponse.json({ error: "addressId is required." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (payload.label !== undefined) {
    const label = coerceString(payload.label);
    if (!label) {
      return NextResponse.json({ error: "label cannot be empty." }, { status: 400 });
    }
    updates.label = label;
  }

  if (payload.street1 !== undefined) {
    const street1 = coerceString(payload.street1);
    if (!street1) {
      return NextResponse.json({ error: "street1 cannot be empty." }, { status: 400 });
    }
    updates.street1 = street1;
  }

  if (payload.street2 !== undefined) {
    const street2 = coerceString(payload.street2);
    updates.street2 = street2 || null;
  }

  if (payload.city !== undefined) {
    const city = coerceString(payload.city);
    if (!city) {
      return NextResponse.json({ error: "city cannot be empty." }, { status: 400 });
    }
    updates.city = city;
  }

  if (payload.state !== undefined) {
    const state = coerceString(payload.state);
    if (!state) {
      return NextResponse.json({ error: "state cannot be empty." }, { status: 400 });
    }
    updates.state = state;
  }

  if (payload.postalCode !== undefined) {
    const postalCode = coerceString(payload.postalCode);
    if (!postalCode) {
      return NextResponse.json({ error: "postalCode cannot be empty." }, { status: 400 });
    }
    updates.postalCode = postalCode;
  }

  if (payload.country !== undefined) {
    const country = coerceString(payload.country);
    if (!country) {
      return NextResponse.json({ error: "country cannot be empty." }, { status: 400 });
    }
    updates.country = country;
  }

  const markDefault = coerceBoolean(payload.isDefault);

  if (!markDefault && Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const customerId = session.portalUser.customerId;
      if (!customerId) {
        return NextResponse.json(
          { error: "Portal user is not linked to a customer." },
          { status: 409 },
        );
      }

      const address = await db.customerAddress.findFirst({
        where: {
          id,
          tenantId,
          customerId,
        },
      });

      if (!address) {
        return NextResponse.json({ error: "Address not found." }, { status: 404 });
      }

      try {
        const updated = await runWithTransaction(db, async (tx) => {
          if (Object.keys(updates).length > 0) {
            await tx.customerAddress.update({
              where: { id: address.id },
              data: updates,
            });
          }

          if (markDefault) {
            await tx.customerAddress.update({
              where: { id: address.id },
              data: { isDefault: true },
            });
            await tx.customerAddress.updateMany({
              where: {
                tenantId,
                customerId,
                NOT: { id: address.id },
              },
              data: { isDefault: false },
            });
          }

          return tx.customerAddress.findUniqueOrThrow({
            where: { id: address.id },
          });
        });

        return NextResponse.json({ address: serializeAddress(updated) });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return NextResponse.json(
            { error: "Another address already uses this label." },
            { status: 409 },
          );
        }

        console.error("Failed to update address:", error);
        return NextResponse.json({ error: "Unable to update address." }, { status: 500 });
      }
    },
    { requiredPermissions: [...MANAGE_PERMISSION] },
  );
}

export async function DELETE(request: NextRequest) {
  let payload: DeleteAddressPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = coerceString(payload.addressId);
  if (!id) {
    return NextResponse.json({ error: "addressId is required." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const customerId = session.portalUser.customerId;
      if (!customerId) {
        return NextResponse.json(
          { error: "Portal user is not linked to a customer." },
          { status: 409 },
        );
      }

      const address = await db.customerAddress.findFirst({
        where: {
          id,
          tenantId,
          customerId,
        },
      });

      if (!address) {
        return NextResponse.json({ error: "Address not found." }, { status: 404 });
      }

      await runWithTransaction(db, async (tx) => {
        await tx.customerAddress.delete({ where: { id: address.id } });

        if (address.isDefault) {
          const nextDefault = await tx.customerAddress.findFirst({
            where: {
              tenantId,
              customerId,
            },
            orderBy: {
              createdAt: "asc",
            },
          });

          if (nextDefault) {
            await tx.customerAddress.update({
              where: { id: nextDefault.id },
              data: { isDefault: true },
            });
          }
        }
      });

      return NextResponse.json({ success: true });
    },
    { requiredPermissions: [...MANAGE_PERMISSION] },
  );
}
