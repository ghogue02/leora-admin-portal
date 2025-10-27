/**
 * Mailchimp Connection API
 * POST /api/sales/marketing/mailchimp/connect - Connect Mailchimp account
 * GET /api/sales/marketing/mailchimp/connect - Get connection status
 * DELETE /api/sales/marketing/mailchimp/connect - Disconnect Mailchimp
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectMailchimp } from '@/lib/marketing/mailchimp-service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';

    const connection = await prisma.mailchimpConnection.findUnique({
      where: { tenantId },
      select: {
        id: true,
        isActive: true,
        lastSyncAt: true,
        audienceId: true,
        serverPrefix: true,
        createdAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      ...connection,
    });
  } catch (error) {
    console.error('Error fetching Mailchimp connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connection status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    const result = await connectMailchimp(tenantId, apiKey);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error connecting Mailchimp:', error);
    return NextResponse.json(
      { error: 'Failed to connect Mailchimp' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';

    await prisma.mailchimpConnection.delete({
      where: { tenantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Mailchimp:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Mailchimp' },
      { status: 500 }
    );
  }
}
