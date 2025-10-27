import { NextRequest, NextResponse } from 'next/server';
import { sendCampaign } from '@/lib/mailchimp';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/mailchimp/campaigns/[id]/send
 * Send a campaign immediately
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request);
    const campaignId = params.id;

    // Get campaign
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (campaign.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if already sent
    if (campaign.status === 'sent') {
      return NextResponse.json(
        { error: 'Campaign already sent' },
        { status: 400 }
      );
    }

    if (!campaign.mailchimpId) {
      return NextResponse.json(
        { error: 'Campaign has no Mailchimp ID' },
        { status: 400 }
      );
    }

    // Send via Mailchimp
    await sendCampaign(campaign.mailchimpId);

    // Update status
    const updatedCampaign = await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
    });
  } catch (error) {
    console.error('Failed to send campaign:', error);
    return NextResponse.json(
      {
        error: 'Failed to send campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
