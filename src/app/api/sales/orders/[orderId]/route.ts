/**
 * Sales Rep Order Detail API
 * GET /api/sales/orders/[orderId]
 *
 * Allows sales reps to view order details for their assigned customers.
 * Uses SAFE pattern with withSalesSession wrapper.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';

type RouteParams = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  const orderId = params.orderId;

  return withSalesSession(request, async ({ db, tenantId, session }) => {
    // 1. Validate sales rep exists
    const salesRepId = session.user.salesRep?.id;
    if (!salesRepId) {
      return NextResponse.json(
        { error: 'Sales rep profile required' },
        { status: 403 }
      );
    }

    // 2. Get order with customer validation
    // SECURITY: Only return orders where the customer is assigned to this sales rep
    const order = await db.order.findFirst({
      where: {
        id: orderId,
        tenantId,
        customer: {
          salesRepId, // ✅ This ensures the sales rep owns the customer
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            state: true,
            city: true,
            street1: true,
            street2: true,
            postalCode: true,
            phone: true,
            billingEmail: true,
            paymentTerms: true,
            licenseNumber: true,
            licenseType: true,
          },
        },
        lines: {
          include: {
            sku: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    brand: true,
                    category: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            total: true,
            dueDate: true,
            issuedAt: true,
            invoiceFormatType: true,
          },
        },
      },
    });

    // 3. If order not found or not owned by sales rep, return 404
    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or you don\'t have access to this order.' },
        { status: 404 }
      );
    }

    // 4. Return order with serialized decimals
    return NextResponse.json({
      order: {
        ...order,
        total: order.total ? Number(order.total) : null,
        lines: order.lines.map((line) => ({
          ...line,
          unitPrice: Number(line.unitPrice),
          total: Number(line.unitPrice) * line.quantity,
          casesQuantity: line.casesQuantity ? Number(line.casesQuantity) : null,
          totalLiters: line.totalLiters ? Number(line.totalLiters) : null,
        })),
        invoices: order.invoices.map((invoice) => ({
          ...invoice,
          total: invoice.total ? Number(invoice.total) : null,
        })),
      },
    });
  });
}
