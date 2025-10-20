import { describe, expect, test } from "vitest";
import { Prisma } from "@prisma/client";
import type { CartWithItems } from "./cart";
import { calculateCartPricing, serializeCart } from "./cart";

type CartFixture = {
  id: string;
  tenantId: string;
  portalUserId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    tenantId: string;
    cartId: string;
    skuId: string;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
    sku: {
      id: string;
      code: string;
      size: string | null;
      unitOfMeasure: string | null;
      pricePerUnit: Prisma.Decimal;
      product: {
        id: string;
        name: string;
        brand: string | null;
        category: string | null;
      };
      priceListItems: Array<{
        id: string;
        priceListId: string;
        priceList: { id: string; name: string; currency: string };
        price: Prisma.Decimal;
        minQuantity: number;
        maxQuantity: number | null;
      }>;
    };
  }>;
};

function buildCart(overrides: Partial<CartFixture> = {}): CartFixture {
  const base: CartFixture = {
    id: "cart-1",
    tenantId: "tenant-1",
    portalUserId: "portal-user-1",
    status: "ACTIVE",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    items: [
      {
        id: "item-1",
        tenantId: "tenant-1",
        cartId: "cart-1",
        skuId: "sku-1",
        quantity: 12,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        sku: {
          id: "sku-1",
          code: "SKU-1",
          size: "750ml",
          unitOfMeasure: "bottle",
          pricePerUnit: new Prisma.Decimal("15.00"),
          product: {
            id: "product-1",
            name: "Reserve Chardonnay",
            brand: "Well Crafted",
            category: "White Wine",
          },
          priceListItems: [
            {
              id: "pli-1",
              priceListId: "pl-1",
              priceList: { id: "pl-1", name: "General", currency: "USD" },
              price: new Prisma.Decimal("15.00"),
              minQuantity: 1,
              maxQuantity: null,
            },
            {
              id: "pli-2",
              priceListId: "pl-2",
              priceList: { id: "pl-2", name: "Case Break", currency: "USD" },
              price: new Prisma.Decimal("12.50"),
              minQuantity: 12,
              maxQuantity: null,
            },
          ],
        },
      },
      {
        id: "item-2",
        tenantId: "tenant-1",
        cartId: "cart-1",
        skuId: "sku-2",
        quantity: 4,
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-01T00:00:00Z"),
        sku: {
          id: "sku-2",
          code: "SKU-2",
          size: "16oz",
          unitOfMeasure: "can",
          pricePerUnit: new Prisma.Decimal("4.25"),
          product: {
            id: "product-2",
            name: "Citrus Spritz",
            brand: "Well Crafted",
            category: "RTD",
          },
          priceListItems: [],
        },
      },
    ],
  };

  return { ...base, ...overrides };
}

describe("calculateCartPricing", () => {
  test("selects the best tiered price and sums totals", () => {
    const cart = buildCart();
    const pricing = calculateCartPricing(cart as unknown as CartWithItems);

    expect(pricing.currency).toBe("USD");
    expect(pricing.total).toBeCloseTo(12.5 * 12 + 4.25 * 4, 2);
    expect(pricing.perItem["item-1"]).toEqual({
      unitPrice: 12.5,
      lineTotal: 150,
      currency: "USD",
      source: "price_list",
      priceListId: "pl-2",
      priceListName: "Case Break",
      minQuantity: 12,
      maxQuantity: null,
    });
    expect(pricing.perItem["item-2"]).toEqual({
      unitPrice: 4.25,
      lineTotal: 17,
      currency: "USD",
      source: "fallback",
      priceListId: null,
      priceListName: null,
      minQuantity: null,
      maxQuantity: null,
    });
  });

  test("falls back to pricePerUnit when no price list entries exist", () => {
    const cart = buildCart({
      items: [
        {
          id: "item-1",
          tenantId: "tenant-1",
          cartId: "cart-1",
          skuId: "sku-1",
          quantity: 2,
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:00:00Z"),
          sku: {
            id: "sku-1",
            code: "SKU-1",
            size: "750ml",
            unitOfMeasure: "bottle",
            pricePerUnit: new Prisma.Decimal("9.99"),
            product: {
              id: "product-1",
              name: "Table Red",
              brand: "Well Crafted",
              category: "Red Wine",
            },
            priceListItems: [],
          },
        },
      ],
    });

    const pricing = calculateCartPricing(cart as unknown as CartWithItems);
    expect(pricing.total).toBeCloseTo(19.98, 2);
    expect(pricing.perItem["item-1"].unitPrice).toBeCloseTo(9.99, 2);
    expect(pricing.perItem["item-1"].source).toBe("fallback");
  });
});

describe("serializeCart", () => {
  test("includes pricing metadata on each item", () => {
    const serialized = serializeCart(buildCart() as unknown as CartWithItems);
    const { cart } = serialized;

    expect(cart.currency).toBe("USD");
    expect(cart.subtotal).toBeCloseTo(12.5 * 12 + 4.25 * 4, 2);
    const item = cart.items.find((line) => line.id === "item-1");
    expect(item?.pricing).toEqual({
      unitPrice: 12.5,
      lineTotal: 150,
      currency: "USD",
      source: "price_list",
      priceListId: "pl-2",
      priceListName: "Case Break",
      minQuantity: 12,
      maxQuantity: null,
    });
  });
});
