import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const ORDER_INCLUDE = {
  customer: {
    select: {
      id: true,
      name: true,
    },
  },
  portalUser: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  lines: {
    include: {
      sku: {
        include: {
          product: true,
        },
      },
    },
  },
  invoices: true,
  payments: true,
} satisfies Prisma.OrderInclude;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const scope = buildOrderScope(tenantId, session.portalUserId, session.portalUser.customerId);

      const order = await db.order.findFirst({
        where: {
          id: params.id,
          ...scope,
        },
        include: ORDER_INCLUDE,
      });

      if (!order) {
        return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }

      const activities = await db.activity.findMany({
        where: {
          tenantId,
          orderId: order.id,
        },
        include: {
          activityType: true,
        },
        orderBy: {
          occurredAt: "desc",
        },
      });

      return NextResponse.json({
        order: serializeOrder(order),
        activities: activities.map((activity) => ({
          id: activity.id,
          occurredAt: activity.occurredAt,
          outcome: activity.outcomes?.[0] ?? null,
          outcomes: activity.outcomes ?? [],
          subject: activity.subject,
          notes: activity.notes,
          type: {
            code: activity.activityType.code,
            name: activity.activityType.name,
          },
        })),
      });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

function buildOrderScope(tenantId: string, portalUserId: string, customerId: string | null) {
  const base: Prisma.OrderWhereInput = {
    tenantId,
  };

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

function serializeOrder(order: Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>) {
  return {
    id: order.id,
    status: order.status,
    orderedAt: order.orderedAt,
    fulfilledAt: order.fulfilledAt,
    currency: order.currency,
    total: order.total ? Number(order.total) : null,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
        }
      : null,
    portalUser: order.portalUser
      ? {
          id: order.portalUser.id,
          email: order.portalUser.email,
          fullName: order.portalUser.fullName,
        }
      : null,
    lines: order.lines.map((line) => ({
      id: line.id,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
      isSample: line.isSample,
      sku: {
        id: line.sku.id,
        code: line.sku.code,
        name: line.sku.product?.name ?? null,
        brand: line.sku.product?.brand ?? null,
      },
    })),
    invoices: order.invoices.map((invoice) => ({
      id: invoice.id,
      status: invoice.status,
      total: invoice.total ? Number(invoice.total) : null,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
    })),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      method: payment.method,
      receivedAt: payment.receivedAt,
    })),
  };
}
