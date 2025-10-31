/**
 * Invoice PDF Generation API
 *
 * GET /api/invoices/[id]/pdf
 *
 * Generates PDF invoice in the appropriate format based on invoice type
 */

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { PrismaClient } from '@prisma/client';
import { buildInvoiceData } from '@/lib/invoices/invoice-data-builder';
import {
  VAAbcInstateInvoice,
  VAAbcTaxExemptInvoice,
  StandardInvoice,
} from '@/lib/invoices/templates';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;

    // Fetch invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        order: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Build complete invoice data with all calculations
    const invoiceData = await buildInvoiceData({
      orderId: invoice.orderId,
      tenantId: invoice.tenantId,
      customerId: invoice.customerId!,
      formatOverride: invoice.invoiceFormatType || undefined,
      specialInstructions: invoice.specialInstructions || undefined,
      poNumber: invoice.poNumber || undefined,
      shippingMethod: invoice.shippingMethod || undefined,
    });

    // Select appropriate template based on format type
    let PDFComponent;
    let filename = `invoice-${invoice.invoiceNumber}.pdf`;

    switch (invoiceData.invoiceFormatType) {
      case 'VA_ABC_INSTATE':
        PDFComponent = VAAbcInstateInvoice;
        filename = `invoice-va-instate-${invoice.invoiceNumber}.pdf`;
        break;

      case 'VA_ABC_TAX_EXEMPT':
        PDFComponent = VAAbcTaxExemptInvoice;
        filename = `invoice-va-taxexempt-${invoice.invoiceNumber}.pdf`;
        break;

      case 'STANDARD':
      default:
        PDFComponent = StandardInvoice;
        break;
    }

    // Generate PDF stream using createElement
    const PDFDocument = createElement(PDFComponent, { data: invoiceData });
    const pdfBuffer = await renderToBuffer(PDFDocument);

    // Return PDF as download
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/invoices/[id]/pdf
 *
 * Generate and save PDF (for future email/storage features)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Implement PDF storage to S3/Vercel Blob
  return NextResponse.json(
    { message: 'PDF storage not yet implemented' },
    { status: 501 }
  );
}
