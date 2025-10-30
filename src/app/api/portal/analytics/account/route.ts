import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const WINDOW_DAYS = 90;
const PREVIOUS_WINDOW_DAYS = 90;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const customerId = searchParams.get("customerId");

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const resolvedCustomerId = customerId ?? session.portalUser.customerId;

      if (!resolvedCustomerId) {
        return NextResponse.json(
          { error: "Customer context is required." },
          { status: 400 },
        );
      }

      const windowEnd = new Date();
      const windowStart = new Date(windowEnd.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const previousWindowEnd = new Date(windowStart.getTime());
      const previousWindowStart = new Date(previousWindowEnd.getTime() - PREVIOUS_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      const orderScope: Prisma.OrderWhereInput = {
        tenantId,
        customerId: resolvedCustomerId,
      };

      const [currentOrders, previousOrders, productCounts, paceOrders, outstandingInvoices] = await Promise.all([
        db.order.findMany({
          where: {
            ...orderScope,
            orderedAt: {
              gte: windowStart,
              lte: windowEnd,
            },
            status: {
              in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
            },
          },
          select: {
            orderedAt: true,
            total: true,
          },
        }),
        db.order.findMany({
          where: {
            ...orderScope,
            orderedAt: {
              gte: previousWindowStart,
              lte: previousWindowEnd,
            },
            status: {
              in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
            },
          },
          select: {
            orderedAt: true,
            total: true,
          },
        }),
        db.orderLine.groupBy({
          by: ["skuId"],
          where: {
            order: {
              ...orderScope,
              orderedAt: {
                gte: windowStart,
                lte: windowEnd,
              },
              status: {
                in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
              },
            },
          },
          _sum: {
            quantity: true,
          },
          orderBy: {
            _sum: {
              quantity: "desc",
            },
          },
          take: 10,
        }),
        db.order.findMany({
          where: {
            ...orderScope,
            status: "FULFILLED",
            fulfilledAt: {
              not: null,
            },
          },
          select: {
            fulfilledAt: true,
          },
          orderBy: {
            fulfilledAt: "desc",
          },
          take: 6,
        }),
        db.invoice.findMany({
          where: {
            tenantId,
            customerId: resolvedCustomerId,
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

      const revenueCurrent = sumOrderTotals(currentOrders);
      const revenuePrevious = sumOrderTotals(previousOrders);

      const paceDays = calculateCadenceDays(paceOrders.map((order) => order.fulfilledAt));
      const avgOrderValue = currentOrders.length ? revenueCurrent / currentOrders.length : null;

      const topProducts = await db.sku.findMany({
        where: {
          id: {
            in: productCounts.map((product) => product.skuId),
          },
        },
        include: {
          product: true,
        },
      });

      const productMap = new Map(topProducts.map((sku) => [sku.id, sku]));

      const paymentAging = calculatePaymentAging(outstandingInvoices);

      return NextResponse.json({
        revenue: {
          current: revenueCurrent,
          previous: revenuePrevious,
          delta: revenuePrevious > 0 ? Number(((revenueCurrent - revenuePrevious) / revenuePrevious).toFixed(4)) : null,
          orderCount: currentOrders.length,
          averageOrderValue: avgOrderValue ? Number(avgOrderValue.toFixed(2)) : null,
        },
        cadence: {
          paceDays,
          lastFulfilledAt: paceOrders.length ? paceOrders[0].fulfilledAt : null,
        },
        topProducts: productCounts.map((product) => {
          const sku = productMap.get(product.skuId);
          return {
            skuId: product.skuId,
            quantity: product._sum.quantity ?? 0,
            code: sku?.code ?? null,
            name: sku?.product?.name ?? null,
            brand: sku?.product?.brand ?? null,
          };
        }),
        paymentAging,
      });
    },
    { requiredPermissions: ["portal.dashboard.view"] },
  );
}

function sumOrderTotals(orders: Array<{ total: Prisma.Decimal | null }>) {
  return orders.reduce((acc, order) => acc + Number(order.total ?? 0), 0);
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
