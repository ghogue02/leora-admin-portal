/**
 * Sales Rep Invoice Creation API
 *
 * POST /api/sales/orders/[id]/create-invoice
 *
 * Allows sales reps to create invoices for orders of their assigned customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';
import { createAuditLog } from '@/lib/audit-log';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return withSalesSession(request, async ({ db, session, salesRep }) => {
    try {
      const orderId = params.id;
      const tenantId = session.user.tenantId;
      const userId = session.user.id;
      const salesRepId = salesRep.id;

      // Get order and validate access
      const order = await db.order.findUnique({
        where: {
          id: orderId,
          tenantId,
        },
        include: {
          customer: true,
          invoices: true,
          orderLines: {
            include: {
              sku: {
                include: {
                  product: {
                    select: {
                      name: true,
                      category: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Security check: Order customer must be assigned to this sales rep
      if (order.customer.salesRepId !== salesRepId) {
        return NextResponse.json(
          { error: 'You can only create invoices for your assigned customers' },
          { status: 403 }
        );
      }

      // Check if invoice already exists
      if (order.invoices.length > 0) {
        return NextResponse.json(
          { error: 'Invoice already exists for this order' },
          { status: 400 }
        );
      }

      // Validate order has a total
      if (!order.total || Number(order.total) <= 0) {
        return NextResponse.json(
          { error: 'Order must have a total amount' },
          { status: 400 }
        );
      }

      // Get request body
      const body = await request.json();
      const { poNumber, specialInstructions, shippingMethod, dueDate } = body;

      // Calculate due date
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);
      const invoiceDueDate = dueDate ? new Date(dueDate) : defaultDueDate;

      // Get tenant info
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
      });

      // Use the inline invoice creation logic (avoiding the broken import)
      const { determineInvoiceFormat } = await import('@/lib/invoices/format-selector');
      const { calculateInvoiceTotalLiters, calculateLineItemLiters } = await import('@/lib/invoices/liter-calculator');
      const { bottlesToCases } = await import('@/lib/invoices/case-converter');
      const { getVACollectionTerms, getVAComplianceNotice, VA_INTEREST_RATE } = await import('@/lib/invoices/interest-calculator');

      // Determine format
      const invoiceFormatType = determineInvoiceFormat({
        customerState: order.customer.state,
        distributorState: 'VA',
      });

      // Calculate enriched order lines
      const enrichedOrderLines = order.orderLines.map((line) => {
        const totalLiters = calculateLineItemLiters(line.quantity, line.sku.size);
        const casesQuantity = bottlesToCases(line.quantity, line.sku.itemsPerCase);
        return { ...line, totalLiters, casesQuantity };
      });

      // Calculate totals
      const invoiceTotalLiters = calculateInvoiceTotalLiters(
        enrichedOrderLines.map(line => ({
          quantity: line.quantity,
          bottleSize: line.sku.size,
          totalLiters: line.totalLiters,
        }))
      );

      // Generate invoice number
      const now = new Date();
      const yearMonth = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0');
      const prefix = `INV-${yearMonth}-`;

      const latestInvoice = await db.invoice.findFirst({
        where: {
          tenantId,
          invoiceNumber: { startsWith: prefix },
        },
        orderBy: { invoiceNumber: 'desc' },
      });

      let sequence = 1;
      if (latestInvoice?.invoiceNumber) {
        const match = latestInvoice.invoiceNumber.match(/-(\d{4})$/);
        if (match) {
          sequence = parseInt(match[1], 10) + 1;
        }
      }

      const invoiceNumber = `${prefix}${sequence.toString().padStart(4, '0')}`;

      // Get compliance text
      const collectionTerms = getVACollectionTerms(VA_INTEREST_RATE);
      const complianceNotice = getVAComplianceNotice(invoiceFormatType === 'VA_ABC_TAX_EXEMPT');

      // Create invoice in transaction
      const invoice = await db.$transaction(async (tx) => {
        // Update order lines with calculated values
        await Promise.all(
          enrichedOrderLines.map((line) =>
            tx.orderLine.update({
              where: { id: line.id },
              data: {
                casesQuantity: line.casesQuantity,
                totalLiters: line.totalLiters,
              },
            })
          )
        );

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
            invoiceFormatType,
            salesperson: salesRep.user.fullName || 'Sales Rep',
            paymentTermsText: order.customer.paymentTerms || 'Net 30',
            shippingMethod: shippingMethod || 'Hand deliver',
            shipDate: new Date(),
            specialInstructions,
            poNumber,
            totalLiters: invoiceTotalLiters,
            interestRate: VA_INTEREST_RATE,
            collectionTerms,
            complianceNotice,
          },
        });

        // Create audit log
        await createAuditLog(tx, {
          tenantId,
          userId,
          entityType: 'Invoice',
          entityId: newInvoice.id,
          action: 'CREATE',
          metadata: {
            orderId,
            invoiceNumber,
            formatType: invoiceFormatType,
            total: Number(order.total),
            customerName: order.customer.name,
            createdBy: 'SALES_REP',
          },
        });

        return newInvoice;
      });

      return NextResponse.json({
        invoice: {
          ...invoice,
          subtotal: Number(invoice.subtotal || 0),
          total: Number(invoice.total || 0),
        },
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      return NextResponse.json(
        {
          error: 'Failed to create invoice',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  });
}
