/**
 * Invoice Regeneration API
 * POST /api/invoices/[invoiceId]/regenerate
 *
 * Phase 3 Sprint 1: Feature #4 - Edit Order After Invoice
 *
 * Regenerates an existing invoice PDF with updated order data.
 * Maintains the original invoice number while updating content.
 * Creates audit log entry for regeneration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';
import { createAuditLog } from '@/lib/audit-log';
import { buildInvoiceData } from '@/lib/invoices/invoice-data-builder';
import { generateInvoicePDF } from '@/lib/invoices/pdf-generator';
import { hasSalesManagerPrivileges } from '@/lib/sales/role-helpers';

type RouteParams = {
  params: Promise<{ invoiceId: string }>;
};

export async function POST(request: NextRequest, props: RouteParams) {
  const params = await props.params;
  const invoiceId = params.invoiceId;

  return withSalesSession(request, async ({ db, tenantId, session, roles }) => {
    // 1. Validate sales rep exists
    const salesRepId = session.user.salesRep?.id;
    const managerScope = hasSalesManagerPrivileges(roles);
    if (!salesRepId && !managerScope) {
      return NextResponse.json(
        { error: 'Sales rep profile required' },
        { status: 403 }
      );
    }

    // 2. Get invoice with order and customer data
    const invoice = await db.invoice.findUnique({
      where: {
        id: invoiceId,
        tenantId,
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                salesRepId: true,
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
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // 3. SECURITY: Verify customer is assigned to this sales rep
    if (!managerScope && invoice.order?.customer?.salesRepId !== salesRepId) {
      return NextResponse.json(
        { error: 'You can only regenerate invoices for your assigned customers' },
        { status: 403 }
      );
    }

    // 4. Verify invoice has an order
    if (!invoice.order) {
      return NextResponse.json(
        { error: 'Invoice must have an associated order to regenerate' },
        { status: 400 }
      );
    }

    try {
      // 5. Build invoice data from current order state
      const invoiceData = await buildInvoiceData({
        orderId: invoice.orderId,
        tenantId,
        customerId: invoice.customerId || invoice.order.customerId!,
        formatOverride: invoice.invoiceFormatType || undefined,
        specialInstructions: invoice.specialInstructions || undefined,
        poNumber: invoice.poNumber || undefined,
        shippingMethod: invoice.shippingMethod || undefined,
      });

      // 6. Generate new PDF with updated data
      const pdfBuffer = await generateInvoicePDF(invoiceData);

      // 7. Update invoice record
      const updatedInvoice = await db.invoice.update({
        where: { id: invoiceId },
        data: {
          updatedAt: new Date(),
          // Subtotal and total are updated from order changes
          subtotal: invoice.order.total,
          total: invoice.order.total,
        },
      });

      // 8. Create audit log entry
      await createAuditLog(db, {
        tenantId,
        userId: session.user.id,
        entityType: 'Invoice',
        entityId: invoiceId,
        action: 'INVOICE_REGENERATED',
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          orderId: invoice.orderId,
          customerName: invoice.order.customer?.name,
          regeneratedBy: session.user.fullName,
          salesRepId,
          reason: 'Order edited after invoice creation',
          previousTotal: Number(invoice.total || 0),
          newTotal: Number(invoice.order.total || 0),
        },
        changes: {
          total: {
            before: Number(invoice.total || 0),
            after: Number(invoice.order.total || 0),
          },
          pdfRegenerated: true,
        },
      });

      // 9. Return success response
      return NextResponse.json({
        success: true,
        invoice: {
          ...updatedInvoice,
          subtotal: Number(updatedInvoice.subtotal || 0),
          total: Number(updatedInvoice.total || 0),
        },
        pdfGenerated: true,
        pdfSize: pdfBuffer.length,
        message: 'Invoice regenerated successfully',
      });
    } catch (error) {
      console.error('Invoice regeneration failed:', error);

      // Log failed regeneration attempt
      await createAuditLog(db, {
        tenantId,
        userId: session.user.id,
        entityType: 'Invoice',
        entityId: invoiceId,
        action: 'INVOICE_REGENERATION_FAILED',
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          attemptedBy: session.user.fullName,
          salesRepId,
        },
      });

      return NextResponse.json(
        {
          error: 'Failed to regenerate invoice',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
