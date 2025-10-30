/**
 * Sales Rep Invoice Creation API
 * POST /api/sales/orders/[orderId]/create-invoice
 *
 * Allows sales reps to create invoices for their assigned customers.
 * Uses SAFE pattern with withSalesSession wrapper.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';
import { createAuditLog } from '@/lib/audit-log';
import { InvoiceFormatType } from '@prisma/client';

type RouteParams = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: NextRequest, props: RouteParams) {
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
    const order = await db.order.findUnique({
      where: { id: orderId, tenantId },
      include: {
        customer: {
          select: {
            id: true,
            salesRepId: true,
            name: true,
            state: true,
            licenseType: true,
            paymentTerms: true
          }
        },
        invoices: true,
        lines: {
          include: {
            sku: {
              include: {
                product: {
                  select: { name: true, category: true }
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 3. SECURITY: Verify customer is assigned to this sales rep
    if (order.customer?.salesRepId !== salesRepId) {
      return NextResponse.json(
        { error: 'You can only create invoices for your assigned customers' },
        { status: 403 }
      );
    }

    // 4. Validate order state
    if (order.invoices.length > 0) {
      return NextResponse.json(
        { error: 'Invoice already exists for this order' },
        { status: 400 }
      );
    }

    if (!order.total || Number(order.total) <= 0) {
      return NextResponse.json(
        { error: 'Order must have a total amount' },
        { status: 400 }
      );
    }

    // 5. Get request body
    const body = await request.json();
    const {
      poNumber,
      specialInstructions,
      shippingMethod,
      dueDate,
      formatType, // Optional: 'VA_ABC_INSTATE', 'VA_ABC_TAX_EXEMPT', 'STANDARD'
    } = body;

    // 6. Calculate due date (default 30 days)
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);
    const invoiceDueDate = dueDate ? new Date(dueDate) : defaultDueDate;

    // 7. Generate invoice number
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `INV-${yearMonth}-`;

    const latestInvoice = await db.invoice.findFirst({
      where: { tenantId, invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    });

    let sequence = 1;
    if (latestInvoice?.invoiceNumber) {
      const match = latestInvoice.invoiceNumber.match(/-(\d{4})$/);
      if (match) sequence = parseInt(match[1], 10) + 1;
    }

    const invoiceNumber = `${prefix}${String(sequence).padStart(4, '0')}`;

    // 8. Determine invoice format type
    let finalFormatType: InvoiceFormatType = formatType || 'STANDARD';

    // Auto-detect VA ABC format if not specified
    if (!formatType && order.customer?.state === 'VA') {
      // Check if customer has a license type that indicates tax-exempt
      if (order.customer.licenseType &&
          ['TAX_EXEMPT', 'OUT_OF_STATE'].includes(order.customer.licenseType)) {
        finalFormatType = 'VA_ABC_TAX_EXEMPT';
      } else {
        finalFormatType = 'VA_ABC_INSTATE';
      }
    }

    // 9. Create invoice in transaction
    const invoice = await db.$transaction(async (tx) => {
      // Create invoice
      const newInvoice = await tx.invoice.create({
        data: {
          tenantId,
          orderId,
          customerId: order.customerId!,
          invoiceNumber,
          status: 'DRAFT',
          subtotal: order.total,
          total: order.total,
          dueDate: invoiceDueDate,
          issuedAt: new Date(),

          // VA-specific fields
          invoiceFormatType: finalFormatType,
          salesperson: session.user.fullName,
          paymentTermsText: order.customer?.paymentTerms || 'Net 30',
          shippingMethod: shippingMethod || 'Hand deliver',
          shipDate: new Date(),
          specialInstructions,
          poNumber,
        },
      });

      // Create audit logs
      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: 'Invoice',
        entityId: newInvoice.id,
        action: 'CREATE',
        metadata: {
          orderId,
          invoiceNumber,
          formatType: finalFormatType,
          total: Number(order.total),
          customerName: order.customer?.name,
          createdBy: 'SALES_REP',
          salesRepId,
        },
      });

      await createAuditLog(tx, {
        tenantId,
        userId: session.user.id,
        entityType: 'Order',
        entityId: orderId,
        action: 'UPDATE',
        changes: {
          invoice: {
            action: 'CREATE',
            invoiceId: newInvoice.id,
            invoiceNumber,
          },
        },
      });

      return newInvoice;
    });

    // 10. Return response
    return NextResponse.json({
      invoice: {
        ...invoice,
        subtotal: Number(invoice.subtotal || 0),
        total: Number(invoice.total || 0),
      },
    });
  });
}
