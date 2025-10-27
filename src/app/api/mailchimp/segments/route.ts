import { NextRequest, NextResponse } from 'next/server';
import { createSegment } from '@/lib/mailchimp';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/mailchimp/segments
 * Create a Mailchimp segment from customer selection
 *
 * Body:
 * {
 *   listId: string;
 *   segmentName: string;
 *   customerIds: string[];
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { listId, segmentName, customerIds } = body;

    // Validate required fields
    if (!listId || !segmentName || !customerIds) {
      return NextResponse.json(
        { error: 'listId, segmentName, and customerIds are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: 'customerIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Get customer emails
    const customers = await prisma.customer.findMany({
      where: {
        tenantId: user.tenantId,
        id: { in: customerIds },
        billingEmail: { not: null },
      },
      select: { billingEmail: true },
    });

    const emails = customers
      .map((c) => c.billingEmail)
      .filter((email): email is string => email !== null);

    if (emails.length === 0) {
      return NextResponse.json(
        { error: 'No valid customer emails found' },
        { status: 400 }
      );
    }

    // Create segment in Mailchimp
    const segmentId = await createSegment(listId, segmentName, emails);

    return NextResponse.json({
      success: true,
      segmentId,
      emailCount: emails.length,
    });
  } catch (error) {
    console.error('Failed to create segment:', error);
    return NextResponse.json(
      {
        error: 'Failed to create segment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
