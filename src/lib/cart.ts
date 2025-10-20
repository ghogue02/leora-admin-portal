import { CartStatus, Prisma, type PrismaClient } from "@prisma/client";

export async function getActiveCartWithItems(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  portalUserId: string,
) {
  let cart = await db.cart.findFirst({
    where: {
      tenantId,
      portalUserId,
      status: CartStatus.ACTIVE,
    },
    include: cartItemIncludes,
  });

  if (!cart) {
    const created = await db.cart.create({
      data: {
        tenantId,
        portalUserId,
      },
    });

    cart = await db.cart.findUnique({
      where: { id: created.id },
      include: cartItemIncludes,
    });
  }

  if (!cart) {
    throw new Error("Failed to initialize active cart.");
  }

  return cart;
}

export type CartWithItems = Awaited<ReturnType<typeof getActiveCartWithItems>>;

export function serializeCart(cart: CartWithItems) {
  const pricing = calculateCartPricing(cart);

  return {
    cart: {
      id: cart.id,
      status: cart.status,
      portalUserId: cart.portalUserId,
      updatedAt: cart.updatedAt,
      currency: pricing.currency,
      subtotal: pricing.total,
      items: cart.items.map((item) => {
        const itemPricing = pricing.perItem[item.id];

        return {
          id: item.id,
          skuId: item.skuId,
          quantity: item.quantity,
          sku: {
            id: item.sku.id,
            code: item.sku.code,
            size: item.sku.size,
            unitOfMeasure: item.sku.unitOfMeasure,
            product: {
              id: item.sku.product.id,
              name: item.sku.product.name,
              brand: item.sku.product.brand,
              category: item.sku.product.category,
            },
            priceLists: item.sku.priceListItems.map((price) => ({
              id: price.id,
              priceListId: price.priceListId,
              priceListName: price.priceList.name,
              price: Number(price.price),
              currency: price.priceList.currency,
              minQuantity: price.minQuantity,
              maxQuantity: price.maxQuantity,
            })),
          },
          pricing: {
            unitPrice: itemPricing?.unitPrice ?? 0,
            lineTotal: itemPricing?.lineTotal ?? 0,
            currency: itemPricing?.currency ?? pricing.currency,
            source: itemPricing?.source ?? "unknown",
            priceListId: itemPricing?.priceListId ?? null,
            priceListName: itemPricing?.priceListName ?? null,
            minQuantity: itemPricing?.minQuantity ?? null,
            maxQuantity: itemPricing?.maxQuantity ?? null,
          },
        };
      }),
    },
  };
}

export type CartPricing = ReturnType<typeof calculateCartPricing>;

export function calculateCartPricing(cart: CartWithItems) {
  let currency = "USD";
  let total = new Prisma.Decimal(0);
  const perItem: Record<
    string,
    {
      unitPrice: number;
      lineTotal: number;
      currency: string;
      source: "price_list" | "fallback" | "unknown";
      priceListId: string | null;
      priceListName: string | null;
      minQuantity: number | null;
      maxQuantity: number | null;
    }
  > = {};

  cart.items.forEach((item) => {
    const resolved = resolveUnitPrice(item, item.quantity);
    if (resolved.currency) {
      currency = resolved.currency;
    }
    const lineTotal = resolved.unitPrice.mul(item.quantity);
    total = total.plus(lineTotal);

    perItem[item.id] = {
      unitPrice: Number(resolved.unitPrice.toFixed(2)),
      lineTotal: Number(lineTotal.toFixed(2)),
      currency: resolved.currency ?? currency,
      source: resolved.source,
      priceListId: resolved.priceListId ?? null,
      priceListName: resolved.priceListName ?? null,
      minQuantity: resolved.minQuantity ?? null,
      maxQuantity: resolved.maxQuantity ?? null,
    };
  });

  return {
    currency,
    total: Number(total.toFixed(2)),
    perItem,
  };
}

type ResolvedPrice = {
  unitPrice: Prisma.Decimal;
  currency: string | null;
  source: "price_list" | "fallback";
  priceListId?: string | null;
  priceListName?: string | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
};

function resolveUnitPrice(item: CartWithItems["items"][number], quantity: number): ResolvedPrice {
  const priceListItems = item.sku.priceListItems.map((price) => ({
    id: price.id,
    priceListId: price.priceListId,
    priceListName: price.priceList.name,
    minQuantity: price.minQuantity ?? 1,
    maxQuantity: price.maxQuantity ?? null,
    unitPrice: new Prisma.Decimal(price.price),
    currency: price.priceList.currency,
  }));

  const eligible = priceListItems.filter((price) => {
    const meetsMin = quantity >= price.minQuantity;
    const meetsMax =
      price.maxQuantity === null || price.maxQuantity === undefined
        ? true
        : quantity <= price.maxQuantity;
    return meetsMin && meetsMax;
  });

  const candidate =
    (eligible.length ? eligible : priceListItems).sort(
      (a, b) => (b.minQuantity ?? 0) - (a.minQuantity ?? 0),
    )[0] ?? null;

  if (candidate) {
    return {
      unitPrice: candidate.unitPrice,
      currency: candidate.currency,
      source: "price_list",
      priceListId: candidate.priceListId,
      priceListName: candidate.priceListName,
      minQuantity: candidate.minQuantity,
      maxQuantity: candidate.maxQuantity,
    };
  }

  const pricePerUnit = item.sku.pricePerUnit
    ? new Prisma.Decimal(item.sku.pricePerUnit)
    : new Prisma.Decimal(0);

  return {
    unitPrice: pricePerUnit,
    currency: "USD",
    source: "fallback",
    priceListId: null,
    priceListName: null,
    minQuantity: null,
    maxQuantity: null,
  };
}

const cartItemIncludes = {
  items: {
    include: {
      sku: {
        include: {
          product: true,
          priceListItems: {
            include: {
              priceList: true,
            },
          },
          inventories: true,
        },
      },
    },
  },
};
