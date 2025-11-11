/**
 * Invoice PDF Generation API
 *
 * GET /api/invoices/[invoiceId]/pdf
 *
 * Generates PDF invoice in the appropriate format based on invoice type
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { buildInvoiceData } from '@/lib/invoices/invoice-data-builder';
import {
  getInvoiceTemplateSettings,
  resolveBaseTemplateComponent,
} from '@/lib/invoices/template-settings';
import { invokeSupabaseFunction } from '@/lib/supabase/functions';

const prisma = new PrismaClient();

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;

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

    const templateSettings = await getInvoiceTemplateSettings(
      prisma,
      invoice.tenantId,
      invoiceData.invoiceFormatType
    );

    // Select appropriate template based on format type + tenant preference
    const baseTemplateChoice = resolveBaseTemplateComponent(
      invoiceData.invoiceFormatType,
      templateSettings.baseTemplate
    );

    let filename = `invoice-${invoice.invoiceNumber}.pdf`;

    switch (baseTemplateChoice) {
      case 'VA_ABC_INSTATE_CONDENSED':
        filename = `invoice-va-instate-${invoice.invoiceNumber}.pdf`;
        break;
      case 'VA_ABC_INSTATE_FULL':
        filename = `invoice-va-instate-${invoice.invoiceNumber}.pdf`;
        break;
      case 'VA_ABC_TAX_EXEMPT':
        filename = `invoice-va-taxexempt-${invoice.invoiceNumber}.pdf`;
        break;
    }

    // Ensure existing invoice metadata is used in the PDF
    const pdfData = {
      ...invoiceData,
      invoiceNumber: invoice.invoiceNumber,
      issuedAt: invoice.issuedAt,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      total: invoice.total,
      templateSettings,
    };

    const response = await invokeSupabaseFunction<{ pdfBase64: string }>("invoice-pdf", {
      pdfData,
    });

    if (!response?.pdfBase64) {
      throw new Error("Invoice PDF edge function returned no data");
    }

    const pdfBuffer = Buffer.from(response.pdfBase64, "base64");

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
 * POST /api/invoices/[invoiceId]/pdf
 *
 * Generate and save PDF (for future email/storage features)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const { invoiceId } = await params;
  void invoiceId;

  // TODO: Implement PDF storage to S3/Vercel Blob
  return NextResponse.json(
    { message: 'PDF storage not yet implemented' },
    { status: 501 }
  );
}
