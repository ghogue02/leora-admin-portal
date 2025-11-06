import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { getInvoiceTemplateSettings } from '@/lib/invoices/template-settings';
import { buildSampleInvoiceData } from '@/lib/invoices/sample-data';
import { generateInvoicePDF } from '@/lib/invoices/pdf-generator';
import { parseFormat } from '../route';
import type { InvoiceFormatType } from '@prisma/client';

type RouteParams = {
  params: Promise<{ format: string }>;
};

function filenameForFormat(format: InvoiceFormatType) {
  switch (format) {
    case 'VA_ABC_INSTATE':
      return 'sample-va-instate-invoice.pdf';
    case 'VA_ABC_TAX_EXEMPT':
      return 'sample-va-tax-exempt-invoice.pdf';
    default:
      return 'sample-invoice.pdf';
  }
}

export async function GET(request: NextRequest, props: RouteParams) {
  const { format } = await props.params;
  const formatType = parseFormat(format);

  if (!formatType) {
    return NextResponse.json(
      { error: `Unsupported invoice format "${format}"` },
      { status: 400 }
    );
  }

  return withAdminSession(request, async ({ db, tenantId }) => {
    try {
      const templateSettings = await getInvoiceTemplateSettings(db, tenantId, formatType);
      const sampleData = buildSampleInvoiceData(formatType, templateSettings);
      const pdfBuffer = await generateInvoicePDF(sampleData, templateSettings);

      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filenameForFormat(formatType)}"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (error) {
      console.error('Failed to generate sample invoice PDF', error);
      return NextResponse.json(
        { error: 'Failed to generate sample invoice PDF' },
        { status: 500 }
      );
    }
  });
}
