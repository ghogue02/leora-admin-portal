/**
 * Mailchimp Sync API
 * POST /api/sales/marketing/mailchimp/sync - Sync email list to Mailchimp
 */

import { NextRequest, NextResponse } from 'next/server';
import { syncListToMailchimp, getMailchimpAudiences } from '@/lib/marketing/mailchimp-service';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';

    const audiences = await getMailchimpAudiences(tenantId);

    return NextResponse.json(audiences);
  } catch (error) {
    console.error('Error fetching Mailchimp audiences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audiences' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const body = await request.json();
    const { listId, audienceId } = body;

    const result = await syncListToMailchimp(tenantId, listId, audienceId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error syncing to Mailchimp:', error);
    return NextResponse.json(
      { error: 'Failed to sync list' },
      { status: 500 }
    );
  }
}
