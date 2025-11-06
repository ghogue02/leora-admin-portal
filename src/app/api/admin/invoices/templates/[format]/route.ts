import { NextRequest, NextResponse } from 'next/server';
import { InvoiceFormatType } from '@prisma/client';
import { withAdminSession } from '@/lib/auth/admin';
import {
  getInvoiceTemplateSettings,
  saveInvoiceTemplateSettings,
} from '@/lib/invoices/template-settings';

const SUPPORTED_FORMATS: InvoiceFormatType[] = [
  'STANDARD',
  'VA_ABC_INSTATE',
  'VA_ABC_TAX_EXEMPT',
];

export function parseFormat(value: string | undefined): InvoiceFormatType | null {
  if (!value) {
    return null;
  }

  const normalized = value.toUpperCase();
  return SUPPORTED_FORMATS.includes(normalized as InvoiceFormatType)
    ? (normalized as InvoiceFormatType)
    : null;
}

type RouteParams = {
  params: Promise<{ format: string }>;
};

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
      const settings = await getInvoiceTemplateSettings(db, tenantId, formatType);
      return NextResponse.json({ settings });
    } catch (error) {
      console.error('Failed to load invoice template settings', error);
      return NextResponse.json(
        { error: 'Failed to load invoice template settings' },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: NextRequest, props: RouteParams) {
  const { format } = await props.params;
  const formatType = parseFormat(format);

  if (!formatType) {
    return NextResponse.json(
      { error: `Unsupported invoice format "${format}"` },
      { status: 400 }
    );
  }

  return withAdminSession(request, async ({ db, tenantId, session }) => {
    try {
      const payload = await request.json();

      const settings = await saveInvoiceTemplateSettings(
        db,
        tenantId,
        formatType,
        payload
      );

      return NextResponse.json({
        settings,
        updatedBy: session?.user
          ? {
              id: session.user.id,
              name: session.user.fullName,
            }
          : undefined,
      });
    } catch (error) {
      console.error('Failed to update invoice template settings', error);
      return NextResponse.json(
        { error: 'Failed to update invoice template settings' },
        { status: 500 }
      );
    }
  });
}
