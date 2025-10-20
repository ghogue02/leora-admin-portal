import { NextRequest, NextResponse } from "next/server";
import { CartStatus, OrderStatus, Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";
import { runWithTransaction } from "@/lib/prisma";
import {
  type CartWithItems,
  calculateCartPricing,
  getActiveCartWithItems,
  serializeCart,
} from "@/lib/cart";
import {
  OrderFlowError,
  allocateInventory,
  ensureInventoryAvailability,
  fetchInventorySnapshots,
  recordPortalOrderActivity,
} from "@/lib/orders";

export async function POST(request: NextRequest) {
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
        const { order, newCart } = await runWithTransaction(db, async (tx) => {
          const cart = await getActiveCartWithItems(tx, tenantId, session.portalUserId);

          if (cart.items.length === 0) {
            throw new OrderFlowError("Your cart is empty.");
          }

          const pricing = calculateCartPricing(cart);
          const quantityDescriptors = cart.items.map((item) => ({
            skuId: item.skuId,
            quantity: item.quantity,
          }));

          const inventoryMap = await fetchInventorySnapshots(
            tx,
            tenantId,
            quantityDescriptors.map((item) => item.skuId),
          );
          ensureInventoryAvailability(inventoryMap, quantityDescriptors);
          await validateSampleAllowance(tx, tenantId, session.portalUserId, pricing, cart);

          const allocationsBySku = await allocateInventory(tx, inventoryMap, quantityDescriptors);

          const orderRecord = await tx.order.create({
            data: {
              tenantId,
              customerId,
              portalUserId: session.portalUserId,
              status: OrderStatus.SUBMITTED,
              orderedAt: new Date(),
              currency: pricing.currency,
              total: new Prisma.Decimal(pricing.total.toFixed(2)),
              lines: {
                create: cart.items.map((item) => {
                  const itemPricing = pricing.perItem[item.id];
                  const isSample = Boolean(itemPricing && itemPricing.unitPrice === 0);
                  const pricingRules = itemPricing
                    ? {
                        source: itemPricing.source,
                        priceListId: itemPricing.priceListId,
                        priceListName: itemPricing.priceListName,
                        minQuantity: itemPricing.minQuantity,
                        maxQuantity: itemPricing.maxQuantity,
                      }
                    : {
                        source: "unknown",
                      };
                  const allocations = allocationsBySku.get(item.skuId) ?? [];
                  return {
                    tenantId,
                    skuId: item.skuId,
                    quantity: item.quantity,
                    unitPrice: new Prisma.Decimal(
                      (itemPricing?.unitPrice ?? 0).toFixed(2),
                    ),
                    appliedPricingRules: {
                      ...pricingRules,
                      resolvedAt: new Date().toISOString(),
                      allocations,
                    },
                    isSample,
                  };
                }),
              },
            },
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          await tx.cart.update({
            where: { id: cart.id },
            data: {
              status: CartStatus.SUBMITTED,
            },
          });

          await recordPortalOrderActivity(
            tx,
            tenantId,
            "ORDER_SUBMITTED",
            orderRecord.id,
            session.portalUserId,
            "Portal order submitted",
            "Order created via portal checkout.",
          );

          const freshCart = await getActiveCartWithItems(tx, tenantId, session.portalUserId);

          return { order: orderRecord, newCart: freshCart };
        });

        const serialized = serializeCart(newCart);

        return NextResponse.json({
          order: {
            orderId: order.id,
            status: order.status,
            total: Number(order.total ?? 0),
            currency: order.currency,
            orderedAt: order.orderedAt?.toISOString() ?? new Date().toISOString(),
            customerName: order.customer?.name ?? null,
          },
          cart: serialized.cart,
        });
      } catch (error) {
        if (error instanceof OrderFlowError) {
          return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Cart checkout failed:", error);
        return NextResponse.json({ error: "Unable to submit order." }, { status: 500 });
      }
    },
    { requiredPermissions: ["portal.cart.manage", "portal.orders.write"] },
  );
}

async function validateSampleAllowance(
  tx: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  portalUserId: string,
  pricing: ReturnType<typeof calculateCartPricing>,
  cart: CartWithItems,
) {
  const sampleQuantity = cart.items.reduce((sum, item) => {
    const itemPricing = pricing.perItem[item.id];
    if (!itemPricing) return sum;
    return itemPricing.unitPrice === 0 ? sum + item.quantity : sum;
  }, 0);

  if (sampleQuantity === 0) {
    return;
  }

  const tenantSettings = await tx.tenantSettings.findUnique({
    where: { tenantId },
  });

  const allowance = tenantSettings?.sampleAllowancePerMonth ?? 60;
  if (allowance <= 0) {
    return;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const aggregate = await tx.orderLine.aggregate({
    _sum: {
      quantity: true,
    },
    where: {
      tenantId,
      isSample: true,
      order: {
        portalUserId,
        status: {
          not: OrderStatus.CANCELLED,
        },
        orderedAt: {
          gte: monthStart,
        },
      },
    },
  });

  const used = aggregate._sum.quantity ?? 0;
  if (used + sampleQuantity > allowance) {
    throw new OrderFlowError(
      `Sample allowance exceeded. ${allowance - used} remaining for this month.`,
      409,
    );
  }
}
