import { NextRequest, NextResponse } from "next/server";
import { CartStatus, OrderStatus, Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";
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
} from "@/lib/orders";

export async function POST(request: NextRequest) {
  let payload: { customerId?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const customerId = payload.customerId?.trim();

  if (!customerId) {
    return NextResponse.json({ error: "customerId is required." }, { status: 400 });
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

      try {
        const { order, newCart } = await runWithTransaction(db, async (tx) => {
          const cart = await getActiveCartWithItems(tx, tenantId, portalUser.id);

          if (cart.items.length === 0) {
            throw new OrderFlowError("Cart is empty.");
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

          // Sales portal does not enforce sample allowance - sales reps can create any orders
          // No need to call validateSampleAllowance

          const allocationsBySku = await allocateInventory(tx, inventoryMap, quantityDescriptors);

          const orderRecord = await tx.order.create({
            data: {
              tenantId,
              customerId,
              portalUserId: portalUser.id,
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

          // Record activity - created by sales rep (User) on behalf of customer
          await recordSalesOrderActivity(
            tx,
            tenantId,
            "ORDER_SUBMITTED",
            orderRecord.id,
            session.user.id,
            customerId,
            "Sales order submitted",
            `Order created by ${session.user.fullName} on behalf of ${customer.name}`,
          );

          const freshCart = await getActiveCartWithItems(tx, tenantId, portalUser.id);

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
    }
  );
}

async function recordSalesOrderActivity(
  tx: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  activityCode: string,
  orderId: string,
  userId: string,
  customerId: string,
  subject: string,
  notes: string,
) {
  const activityType = await tx.activityType.findFirst({
    where: {
      tenantId,
      code: activityCode,
    },
    select: {
      id: true,
    },
  });

  if (!activityType) return;

  await tx.activity.create({
    data: {
      tenantId,
      activityTypeId: activityType.id,
      userId,
      customerId,
      orderId,
      subject,
      occurredAt: new Date(),
      notes,
    },
  });
}
