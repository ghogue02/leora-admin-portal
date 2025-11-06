import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import type { Decimal } from '@prisma/client/runtime/library';

type RouteParams = {
  params: Promise<{ id: string }>;
};

const decimalToNumber = (value: Decimal | null | undefined): number =>
  value ? value.toNumber() : 0;

/**
 * GET /api/admin/orders/[id]
 *
 * Returns detailed order information for admin order management page.
 */
export async function GET(request: NextRequest, props: RouteParams) {
  const { id } = await props.params;

  return withAdminSession(request, async ({ db, tenantId }) => {
    const order = await db.order.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            salesRep: {
              select: {
                id: true,
                territoryName: true,
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        portalUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        lines: {
          include: {
            sku: {
              select: {
                id: true,
                code: true,
                size: true,
                unitOfMeasure: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    brand: true,
                  },
                },
              },
            },
          },
        },
        invoices: {
          include: {
            payments: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const auditLogs = await db.auditLog.findMany({
      where: {
        tenantId,
        entityType: 'Order',
        entityId: order.id,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    const primaryInvoice = order.invoices[0] ?? null;
    const invoicePayments = primaryInvoice?.payments ?? [];
    const paidAmount = invoicePayments.reduce(
      (sum, payment) => sum + decimalToNumber(payment.amount),
      0
    );
    const invoiceTotal = primaryInvoice ? decimalToNumber(primaryInvoice.total) : 0;

    const responsePayload = {
      id: order.id,
      customerId: order.customerId,
      status: order.status,
      orderedAt: order.orderedAt?.toISOString() ?? null,
      fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      deliveryWeek: order.deliveryWeek,
      isFirstOrder: order.isFirstOrder,
      total: decimalToNumber(order.total),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      customer: {
        id: order.customer.id,
        name: order.customer.name,
      },
      salesRep: order.customer.salesRep
        ? {
            id: order.customer.salesRep.id,
            name: order.customer.salesRep.user.fullName,
            territory: order.customer.salesRep.territoryName,
          }
        : null,
      lines: order.lines.map((line) => ({
        id: line.id,
        skuId: line.skuId,
        quantity: line.quantity,
        unitPrice: decimalToNumber(line.unitPrice),
        isSample: line.isSample,
        total: decimalToNumber(line.unitPrice) * line.quantity,
        sku: {
          id: line.sku.id,
          code: line.sku.code,
          size: line.sku.size,
          unitOfMeasure: line.sku.unitOfMeasure,
          product: {
            id: line.sku.product.id,
            name: line.sku.product.name,
            brand: line.sku.product.brand,
          },
        },
      })),
      invoice: primaryInvoice
        ? {
            id: primaryInvoice.id,
            invoiceNumber: primaryInvoice.invoiceNumber,
            status: primaryInvoice.status,
            subtotal: decimalToNumber(primaryInvoice.subtotal),
            total: invoiceTotal,
            dueDate: primaryInvoice.dueDate?.toISOString() ?? null,
            issuedAt: primaryInvoice.issuedAt?.toISOString() ?? null,
            payments: invoicePayments.map((payment) => ({
              id: payment.id,
              amount: decimalToNumber(payment.amount),
              receivedAt: payment.receivedAt.toISOString(),
              method: payment.method,
              reference: payment.reference,
            })),
            paidAmount,
            outstandingAmount: Math.max(invoiceTotal - paidAmount, 0),
          }
        : null,
      portalUser: order.portalUser
        ? {
            id: order.portalUser.id,
            fullName: order.portalUser.fullName,
            email: order.portalUser.email,
          }
        : null,
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        changes: log.changes,
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
        user: log.user
          ? {
              fullName: log.user.fullName,
              email: log.user.email,
            }
          : null,
      })),
    };

    return NextResponse.json({ order: responsePayload });
  });
}
