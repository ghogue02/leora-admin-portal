import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus, Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const DEFAULT_RECENT_LIMIT = 5;
const OPEN_ORDER_STATUSES: OrderStatus[] = ["SUBMITTED", "PARTIALLY_FULFILLED"];
const REVENUE_ORDER_STATUSES: OrderStatus[] = ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"];

type OrdersSummary = {
  totalCount: number;
  openTotal: number;
  byStatus: Partial<Record<OrderStatus, { count: number; total: number }>>;
};

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("recentLimit");
  const recentLimit = limitParam
    ? Math.min(Math.max(parseInt(limitParam, 10) || DEFAULT_RECENT_LIMIT, 1), 20)
    : DEFAULT_RECENT_LIMIT;

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const scope = buildOrderScope(tenantId, session.portalUserId, session.portalUser.customerId);

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const [revenueCurrentAggregate, revenuePreviousAggregate, fulfilledOrders, openOrdersAggregate, recentOrders, groupedStatus, totalCount, outstandingInvoices] =
        await Promise.all([
          db.order.aggregate({
            where: {
              ...scope,
              status: { in: REVENUE_ORDER_STATUSES },
              orderedAt: { gte: thirtyDaysAgo, lte: now },
            },
            _sum: { total: true },
          }),
          db.order.aggregate({
            where: {
              ...scope,
              status: { in: REVENUE_ORDER_STATUSES },
              orderedAt: { lt: thirtyDaysAgo, gte: sixtyDaysAgo },
            },
            _sum: { total: true },
          }),
          db.order.findMany({
            where: {
              ...scope,
              fulfilledAt: { not: null },
            },
            select: {
              fulfilledAt: true,
            },
            orderBy: {
              fulfilledAt: "desc",
            },
            take: 6,
          }),
          db.order.aggregate({
            where: {
              ...scope,
              status: { in: OPEN_ORDER_STATUSES },
            },
            _count: { _all: true },
            _sum: { total: true },
          }),
          db.order.findMany({
            where: scope,
            orderBy: {
              orderedAt: "desc",
            },
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: recentLimit,
          }),
          db.order.groupBy({
            by: ["status"],
            where: {
              ...scope,
              status: { in: REVENUE_ORDER_STATUSES },
            },
            _sum: {
              total: true,
            },
            _count: {
              _all: true,
            },
          }),
        db.order.count({
          where: {
            ...scope,
            status: { in: REVENUE_ORDER_STATUSES },
          },
        }),
        db.invoice.findMany({
          where: {
            tenantId,
            customerId: session.portalUser.customerId ?? undefined,
            status: {
              in: ["SENT", "OVERDUE"],
            },
          },
          include: {
            payments: {
              select: {
                amount: true,
              },
            },
          },
        }),
      ]);

      const revenueCurrent = Number(revenueCurrentAggregate._sum.total ?? 0);
      const revenuePrevious = Number(revenuePreviousAggregate._sum.total ?? 0);

      const cadenceDays = calculateCadenceDays(fulfilledOrders.map((order) => order.fulfilledAt));

      const summary = groupedStatus.reduce<OrdersSummary>(
        (acc, group) => {
          const total = Number(group._sum.total ?? 0);
          acc.byStatus[group.status as OrderStatus] = {
            count: group._count._all,
            total,
          };
          return acc;
        },
        {
          totalCount,
          openTotal: 0,
          byStatus: {},
        },
      );
      summary.openTotal = Number(openOrdersAggregate._sum.total ?? 0);

      const paymentAging = calculatePaymentAging(outstandingInvoices);

      const response = {
        metrics: {
          cadenceDays,
          lastFulfilledAt: fulfilledOrders.length ? fulfilledOrders[0].fulfilledAt : null,
          revenue: {
            current30Days: revenueCurrent,
            previous30Days: revenuePrevious,
            delta:
              revenuePrevious > 0 ? Number(((revenueCurrent - revenuePrevious) / revenuePrevious).toFixed(4)) : null,
          },
          openOrders: {
            count: openOrdersAggregate._count._all,
            total: Number(openOrdersAggregate._sum.total ?? 0),
          },
          paymentAging,
        },
        summary,
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          status: order.status,
          orderedAt: order.orderedAt,
          fulfilledAt: order.fulfilledAt,
          total: order.total ? Number(order.total) : null,
          currency: order.currency,
          customer: order.customer
            ? {
                id: order.customer.id,
                name: order.customer.name,
              }
            : null,
        })),
      };

      return NextResponse.json(response);
    },
    { requiredPermissions: ["portal.dashboard.view"] },
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
    } satisfies Prisma.OrderWhereInput;
  }

  return {
    ...base,
    portalUserId,
  } satisfies Prisma.OrderWhereInput;
}

function calculateCadenceDays(dates: Array<Date | null>) {
  const filtered = dates.filter((date): date is Date => Boolean(date));
  if (filtered.length < 2) {
    return null;
  }

  const sorted = filtered.sort((a, b) => b.getTime() - a.getTime());
  const differences: number[] = [];
  for (let index = 0; index < sorted.length - 1; index += 1) {
    const current = sorted[index];
    const next = sorted[index + 1];
    const diffMs = Math.abs(current.getTime() - next.getTime());
    differences.push(diffMs / (1000 * 60 * 60 * 24));
  }

  if (!differences.length) {
    return null;
  }

  const average = differences.reduce((acc, value) => acc + value, 0) / differences.length;
  return Number(average.toFixed(2));
}

function calculatePaymentAging(
  invoices: Array<
    Prisma.InvoiceGetPayload<{
      include: {
        payments: {
          select: {
            amount: true;
          };
        };
      };
    }>
  >,
) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const buckets = {
    current: 0,
    pastDue30: 0,
    pastDue60: 0,
    pastDue90: 0,
    pastDue90Plus: 0,
  };

  for (const invoice of invoices) {
    const total = Number(invoice.total ?? 0);
    const paymentsTotal = invoice.payments.reduce((acc, payment) => acc + Number(payment.amount), 0);
    const outstanding = Math.max(total - paymentsTotal, 0);
    if (outstanding <= 0) {
      continue;
    }

    const dueDate = invoice.dueDate ?? invoice.issuedAt ?? new Date();
    const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / msPerDay);

    if (daysPastDue <= 0) {
      buckets.current += outstanding;
    } else if (daysPastDue <= 30) {
      buckets.pastDue30 += outstanding;
    } else if (daysPastDue <= 60) {
      buckets.pastDue60 += outstanding;
    } else if (daysPastDue <= 90) {
      buckets.pastDue90 += outstanding;
    } else {
      buckets.pastDue90Plus += outstanding;
    }
  }

  const outstandingTotal =
    buckets.current + buckets.pastDue30 + buckets.pastDue60 + buckets.pastDue90 + buckets.pastDue90Plus;

  return {
    ...buckets,
    outstandingTotal,
  };
}
