import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus, Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

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

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Sales rep must be present (enforced by withSalesSession by default)
      const salesRepId = session.user.salesRep?.id;
      if (!salesRepId) {
        return NextResponse.json(
          { error: "Sales rep profile required." },
          { status: 403 },
        );
      }

      // Build where clause to filter orders by sales rep's assigned customers
      const where: Prisma.OrderWhereInput = {
        tenantId,
        customer: {
          salesRepId,
        },
      };

      const [orders, grouped, totalCount, openOrdersWithLines] = await Promise.all([
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
        // Fetch open orders with lines to calculate totals if needed
        db.order.findMany({
          where: {
            ...where,
            status: {
              in: OPEN_STATUSES,
            },
          },
          include: {
            lines: {
              select: {
                quantity: true,
                unitPrice: true,
              },
            },
          },
        }),
      ]);

      // Calculate open total from order lines if order.total is null
      console.log("📊 [Orders] Open orders (SUBMITTED/PARTIALLY_FULFILLED) count:", openOrdersWithLines.length);
      console.log("📊 [Orders] Total orders count:", totalCount);
      console.log("📊 [Orders] Status breakdown:", JSON.stringify(grouped.map(g => ({ status: g.status, count: g._count._all }))));

      const openTotalFromLines = openOrdersWithLines.reduce((sum, order) => {
        if (order.total && Number(order.total) > 0) {
          console.log("📊 [Orders] Order", order.id.substring(0, 8), "has total:", Number(order.total));
          return sum + Number(order.total);
        }
        // Calculate from order lines if total is null
        const lineTotal = order.lines.reduce(
          (lineSum, line) => lineSum + (line.quantity * Number(line.unitPrice)),
          0
        );
        console.log("📊 [Orders] Order", order.id.substring(0, 8), "has null total, calculated from lines:", lineTotal, `(${order.lines.length} lines)`);
        return sum + lineTotal;
      }, 0);
      console.log("📊 [Orders] ===== Final open total:", openTotalFromLines, "=====");

      const summary = grouped.reduce<OrdersSummary>(
        (acc, group) => {
          acc.byStatus[group.status as OrderStatus] = {
            count: group._count._all,
            total: Number(group._sum.total ?? 0),
          };

          return acc;
        },
        {
          totalCount,
          openTotal: openTotalFromLines,
          byStatus: {},
        },
      );

      return NextResponse.json({
        summary,
        orders: orders.map(serializeOrder),
      });
    }
  );
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
