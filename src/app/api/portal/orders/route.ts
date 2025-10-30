import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus, Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const CUSTOMER_SCOPED_ROLES = new Set(["portal.viewer", "portal.buyer"]);

function hasTenantWideScope(roles: string[]) {
  return roles.some((role) => !CUSTOMER_SCOPED_ROLES.has(role));
}

const DEFAULT_LIMIT = 25;
const OPEN_STATUSES: OrderStatus[] = ["SUBMITTED", "PARTIALLY_FULFILLED"];

type OrdersSummary = {
  totalCount: number;
  openTotal: number;
  byStatus: Partial<Record<OrderStatus, { count: number; total: number }>>;
};

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || DEFAULT_LIMIT, 100) : DEFAULT_LIMIT;

  return withPortalSession(
    request,
    async ({ db, tenantId, session, roles }) => {
      const where = buildOrderWhere(tenantId, session.portalUserId, session.portalUser.customerId, roles);

      const [orders, grouped, totalCount] = await Promise.all([
        db.order.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            invoices: {
              select: {
                id: true,
                status: true,
                total: true,
              },
            },
          },
          orderBy: {
            orderedAt: "desc",
          },
          take: limit,
        }),
        db.order.groupBy({
          by: ["status"],
          where,
          _sum: {
            total: true,
          },
          _count: {
            _all: true,
          },
        }),
        db.order.count({ where }),
      ]);

      const summary = grouped.reduce<OrdersSummary>(
        (acc, group) => {
          acc.byStatus[group.status as OrderStatus] = {
            count: group._count._all,
            total: Number(group._sum.total ?? 0),
          };

          if (OPEN_STATUSES.includes(group.status as OrderStatus)) {
            acc.openTotal += Number(group._sum.total ?? 0);
          }

          return acc;
        },
        {
          totalCount,
          openTotal: 0,
          byStatus: {},
        },
      );

      return NextResponse.json({
        summary,
        orders: orders.map(serializeOrder),
      });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

function buildOrderWhere(tenantId: string, portalUserId: string, customerId: string | null, roles: string[]) {
  const base: Prisma.OrderWhereInput = {
    tenantId,
  };

  if (hasTenantWideScope(roles)) {
    return base satisfies Prisma.OrderWhereInput;
  }

  if (customerId) {
    return {
      ...base,
      customerId,
    } satisfies Prisma.OrderWhereInput;
  }

  return {
    ...base,
    portalUserId,
  } satisfies Prisma.OrderWhereInput;
}

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    customer: {
      select: {
        id: true;
        name: true;
      };
    };
    invoices: {
      select: {
        id: true;
        status: true;
        total: true;
      };
    };
  };
}>;

function serializeOrder(order: OrderWithRelations) {
  const total = order.total ? Number(order.total) : null;
  const invoiceTotals = order.invoices.reduce(
    (acc, invoice) => {
      const value = invoice.total ? Number(invoice.total) : 0;
      acc.byStatus[invoice.status] = (acc.byStatus[invoice.status] ?? 0) + value;
      acc.total += value;
      return acc;
    },
    {
      total: 0,
      byStatus: {} as Record<string, number>,
    },
  );

  return {
    id: order.id,
    status: order.status,
    orderedAt: order.orderedAt,
    fulfilledAt: order.fulfilledAt,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
        }
      : null,
    total,
    currency: order.currency,
    invoiceTotals,
  };
}
