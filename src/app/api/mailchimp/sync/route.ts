import { NextRequest, NextResponse } from 'next/server';
import { batchSyncCustomers } from '@/lib/mailchimp-sync';
import { requireAuth } from '@/lib/auth-utils';
import { AccountType } from '@prisma/client';

/**
 * POST /api/mailchimp/sync
 * Sync customers to Mailchimp list
 *
 * Body:
 * {
 *   listId: string;
 *   customerIds?: string[];  // Specific customers
 *   segment?: "ACTIVE" | "TARGET" | "PROSPECT";  // Or sync segment
 *   includeInactive?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { listId, customerIds, segment, includeInactive = false } = body;

    if (!listId) {
      return NextResponse.json(
        { error: 'listId is required' },
        { status: 400 }
      );
    }

    // Validate segment if provided
    if (segment && !['ACTIVE', 'TARGET', 'PROSPECT'].includes(segment)) {
      return NextResponse.json(
        { error: 'Invalid segment. Must be ACTIVE, TARGET, or PROSPECT' },
        { status: 400 }
      );
    }

    // If specific customer IDs provided, sync those
    if (customerIds && Array.isArray(customerIds)) {
      // TODO: Implement specific customer sync
      return NextResponse.json(
        { error: 'Specific customer sync not yet implemented' },
        { status: 400 }
      );
    }

    // Batch sync by segment
    const results = await batchSyncCustomers(user.tenantId, listId, {
      segment: segment as AccountType | undefined,
      includeInactive,
      batchSize: 100,
    });

    return NextResponse.json({
      success: true,
      results: {
        totalProcessed: results.totalProcessed,
        successful: results.successful,
        failed: results.failed,
        skipped: results.skipped,
        errors: results.errors.slice(0, 10), // Limit error details
      },
    });
  } catch (error) {
    console.error('Mailchimp sync failed:', error);
    return NextResponse.json(
      {
        error: 'Sync failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
