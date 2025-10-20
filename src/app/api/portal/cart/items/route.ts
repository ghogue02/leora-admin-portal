import { NextRequest, NextResponse } from "next/server";
import { withPortalSession } from "@/lib/auth/portal";
import { getActiveCartWithItems, serializeCart } from "@/lib/cart";

type CartItemPayload = {
  skuId?: string;
  cartItemId?: string;
  quantity?: number;
};

export async function POST(request: NextRequest) {
  let payload: CartItemPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const skuId = payload.skuId?.trim();
  const quantity = Number.isFinite(payload.quantity) ? Number(payload.quantity) : 1;

  if (!skuId) {
    return NextResponse.json({ error: "skuId is required." }, { status: 400 });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be a positive integer." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const cart = await getActiveCartWithItems(db, tenantId, session.portalUserId);

      const sku = await db.sku.findFirst({
        where: {
          id: skuId,
          tenantId,
          isActive: true,
        },
      });

      if (!sku) {
        return NextResponse.json({ error: "SKU not found." }, { status: 404 });
      }

      await db.cartItem.upsert({
        where: {
          tenantId_cartId_skuId: {
            tenantId,
            cartId: cart.id,
            skuId: sku.id,
          },
        },
        update: {
          quantity: { increment: quantity },
        },
        create: {
          tenantId,
          cartId: cart.id,
          skuId: sku.id,
          quantity,
        },
      });

      const updatedCart = await getActiveCartWithItems(db, tenantId, session.portalUserId);
      return NextResponse.json(serializeCart(updatedCart));
    },
    { requiredPermissions: ["portal.cart.manage"] },
  );
}

export async function PATCH(request: NextRequest) {
  let payload: CartItemPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const quantity = payload.quantity;
  if (!Number.isInteger(quantity ?? NaN)) {
    return NextResponse.json({ error: "quantity must be provided as an integer." }, { status: 400 });
  }

  const cartItemId = payload.cartItemId?.trim();
  const skuId = payload.skuId?.trim();

  if (!cartItemId && !skuId) {
    return NextResponse.json({ error: "cartItemId or skuId is required." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const cart = await getActiveCartWithItems(db, tenantId, session.portalUserId);

      const orFilters = [] as Array<{ id?: string; skuId?: string }>;
      if (cartItemId) {
        orFilters.push({ id: cartItemId });
      }
      if (skuId) {
        orFilters.push({ skuId });
      }

      const target = await db.cartItem.findFirst({
        where: {
          cartId: cart.id,
          tenantId,
          ...(orFilters.length ? { OR: orFilters } : {}),
        },
      });

      if (!target) {
        return NextResponse.json({ error: "Cart item not found." }, { status: 404 });
      }

      if ((quantity ?? 0) <= 0) {
        await db.cartItem.delete({ where: { id: target.id } });
      } else {
        await db.cartItem.update({
          where: { id: target.id },
          data: { quantity },
        });
      }

      const updatedCart = await getActiveCartWithItems(db, tenantId, session.portalUserId);
      return NextResponse.json(serializeCart(updatedCart));
    },
    { requiredPermissions: ["portal.cart.manage"] },
  );
}
