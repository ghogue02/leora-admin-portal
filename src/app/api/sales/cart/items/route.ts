import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { getActiveCartWithItems, serializeCart } from "@/lib/cart";

type CartItemPayload = {
  customerId?: string;
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

  const customerId = payload.customerId?.trim();
  const skuId = payload.skuId?.trim();
  const quantity = Number.isFinite(payload.quantity) ? Number(payload.quantity) : 1;

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required." }, { status: 400 });
  }

  if (!skuId) {
    return NextResponse.json({ error: "skuId is required." }, { status: 400 });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity must be a positive integer." }, { status: 400 });
  }

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Verify customer belongs to this sales rep
      const customer = await db.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
          salesRepId: session.user.salesRep?.id,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found or not assigned to this sales rep." },
          { status: 404 },
        );
      }

      // Find or create portal user for the customer
      let portalUser = await db.portalUser.findFirst({
        where: {
          tenantId,
          customerId,
        },
      });

      if (!portalUser) {
        portalUser = await db.portalUser.create({
          data: {
            tenantId,
            customerId,
            email: customer.billingEmail ?? `${customer.accountNumber}@placeholder.local`,
            fullName: customer.name,
            status: "ACTIVE",
          },
        });
      }

      const cart = await getActiveCartWithItems(db, tenantId, portalUser.id);

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

      const updatedCart = await getActiveCartWithItems(db, tenantId, portalUser.id);
      return NextResponse.json({
        ...serializeCart(updatedCart),
        customer: {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
        },
      });
    }
  );
}

export async function PATCH(request: NextRequest) {
  let payload: CartItemPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const customerId = payload.customerId?.trim();
  const quantity = payload.quantity;
  if (!Number.isInteger(quantity ?? NaN)) {
    return NextResponse.json({ error: "quantity must be provided as an integer." }, { status: 400 });
  }

  const cartItemId = payload.cartItemId?.trim();
  const skuId = payload.skuId?.trim();

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required." }, { status: 400 });
  }

  if (!cartItemId && !skuId) {
    return NextResponse.json({ error: "cartItemId or skuId is required." }, { status: 400 });
  }

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Verify customer belongs to this sales rep
      const customer = await db.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
          salesRepId: session.user.salesRep?.id,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found or not assigned to this sales rep." },
          { status: 404 },
        );
      }

      // Find portal user for the customer
      const portalUser = await db.portalUser.findFirst({
        where: {
          tenantId,
          customerId,
        },
      });

      if (!portalUser) {
        return NextResponse.json(
          { error: "Customer has no active cart." },
          { status: 404 },
        );
      }

      const cart = await getActiveCartWithItems(db, tenantId, portalUser.id);

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

      const updatedCart = await getActiveCartWithItems(db, tenantId, portalUser.id);
      return NextResponse.json({
        ...serializeCart(updatedCart),
        customer: {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
        },
      });
    }
  );
}

export async function DELETE(request: NextRequest) {
  let payload: CartItemPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const customerId = payload.customerId?.trim();
  const cartItemId = payload.cartItemId?.trim();
  const skuId = payload.skuId?.trim();

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required." }, { status: 400 });
  }

  if (!cartItemId && !skuId) {
    return NextResponse.json({ error: "cartItemId or skuId is required." }, { status: 400 });
  }

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Verify customer belongs to this sales rep
      const customer = await db.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
          salesRepId: session.user.salesRep?.id,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found or not assigned to this sales rep." },
          { status: 404 },
        );
      }

      // Find portal user for the customer
      const portalUser = await db.portalUser.findFirst({
        where: {
          tenantId,
          customerId,
        },
      });

      if (!portalUser) {
        return NextResponse.json(
          { error: "Customer has no active cart." },
          { status: 404 },
        );
      }

      const cart = await getActiveCartWithItems(db, tenantId, portalUser.id);

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

      await db.cartItem.delete({ where: { id: target.id } });

      const updatedCart = await getActiveCartWithItems(db, tenantId, portalUser.id);
      return NextResponse.json({
        ...serializeCart(updatedCart),
        customer: {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
        },
      });
    }
  );
}
