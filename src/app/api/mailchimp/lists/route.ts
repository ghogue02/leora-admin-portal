import { NextRequest, NextResponse } from 'next/server';
import { getMailchimpLists, createSegment } from '@/lib/mailchimp';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mailchimp/lists
 * List all Mailchimp audiences/lists
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const lists = await getMailchimpLists();

    // Get sync status for each list
    const listsWithStatus = await Promise.all(
      lists.map(async (list) => {
        const sync = await prisma.mailchimpSync.findUnique({
          where: {
            tenantId_listId: {
              tenantId: user.tenantId,
              listId: list.id,
            },
          },
        });

        return {
          ...list,
          lastSyncAt: sync?.lastSyncAt,
          isActive: sync?.isActive ?? false,
        };
      })
    );

    return NextResponse.json({ lists: listsWithStatus });
  } catch (error) {
    console.error('Failed to fetch Mailchimp lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lists' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mailchimp/lists
 * Create a new Mailchimp list (audience)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const { name, permissionReminder, contactInfo } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      );
    }

    // Note: Actual list creation via Mailchimp API
    // This is simplified - in production you'd use mailchimp.lists.create()

    return NextResponse.json({
      message: 'List creation not yet implemented',
      note: 'Use Mailchimp dashboard to create lists',
    });
  } catch (error) {
    console.error('Failed to create Mailchimp list:', error);
    return NextResponse.json(
      { error: 'Failed to create list' },
      { status: 500 }
    );
  }
}
