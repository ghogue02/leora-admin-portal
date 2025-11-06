import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';
import { listInvoiceTemplateSettings } from '@/lib/invoices/template-settings';

export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    try {
      const templates = await listInvoiceTemplateSettings(db, tenantId);
      return NextResponse.json({ templates });
    } catch (error) {
      console.error('Failed to load invoice template settings', error);
      return NextResponse.json(
        { error: 'Failed to load invoice template settings' },
        { status: 500 }
      );
    }
  });
}
