import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";
import { runWithTransaction } from "@/lib/prisma";
import {
  OrderFlowError,
  releaseAllocationsForOrder,
  recordPortalOrderActivity,
  orderStatusAllowsCancellation,
} from "@/lib/orders";

const CUSTOMER_SCOPED_ROLES = new Set(["portal.viewer", "portal.buyer"]);

function hasTenantWideScope(roles: string[]) {
  return roles.some((role) => !CUSTOMER_SCOPED_ROLES.has(role));
}

function extractOrderId(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments[segments.length - 2] ?? null;
}

export async function POST(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session, roles }) => {
      const orderId = extractOrderId(request.nextUrl.pathname);

      if (!orderId) {
        return NextResponse.json({ error: "Order ID missing in path." }, { status: 400 });
      }

      try {
        const result = await runWithTransaction(db, async (tx) => {
          const order = await tx.order.findFirst({
            where: buildOrderWhere(tenantId, session.portalUser.customerId, session.portalUserId, orderId, roles),
            include: {
              lines: {
                select: {
                  id: true,
                  skuId: true,
                  quantity: true,
                  appliedPricingRules: true,
                },
              },
            },
          });

          if (!order) {
            throw new OrderFlowError("Order not found.", 404);
          }

          if (!orderStatusAllowsCancellation(order.status)) {
            throw new OrderFlowError("Order cannot be cancelled in its current status.", 409);
          }

          const quantityDescriptors = order.lines.map((line) => ({
            skuId: line.skuId,
            quantity: line.quantity,
          }));

          if (quantityDescriptors.length === 0) {
            throw new OrderFlowError("Order has no lines to cancel.", 400);
          }

          await releaseAllocationsForOrder(tx, tenantId, order.lines);

          const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: {
              status: OrderStatus.CANCELLED,
            },
            select: {
              id: true,
              status: true,
            },
          });

          await recordPortalOrderActivity(
            tx,
            tenantId,
            "ORDER_CANCELLED",
            order.id,
            session.portalUserId,
            "Portal order cancelled",
            "Order cancelled via portal.",
          );

          return updatedOrder;
        });

        return NextResponse.json({ order: result });
      } catch (error) {
        if (error instanceof OrderFlowError) {
          return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Order cancellation failed:", error);
        return NextResponse.json({ error: "Unable to cancel order." }, { status: 500 });
      }
    },
    { requiredPermissions: ["portal.orders.write"] },
  );
}

function buildOrderWhere(
  tenantId: string,
  customerId: string | null,
  portalUserId: string,
  orderId: string,
  roles: string[],
) {
  const base = {
    tenantId,
    id: orderId,
  } as const;

  if (hasTenantWideScope(roles)) {
    return base;
  }

  if (customerId) {
    return {
      ...base,
      customerId,
    };
  }

  return {
    ...base,
    portalUserId,
  };
}
