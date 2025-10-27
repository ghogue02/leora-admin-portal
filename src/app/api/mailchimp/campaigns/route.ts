import { NextRequest, NextResponse } from 'next/server';
import { createCampaign } from '@/lib/mailchimp';
import { buildProductCampaign, getCampaignTemplate } from '@/lib/campaign-builder';
import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mailchimp/campaigns
 * List email campaigns
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const campaigns = await prisma.emailCampaign.findMany({
      where: { tenantId: user.tenantId },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mailchimp/campaigns
 * Create a new email campaign
 *
 * Body:
 * {
 *   name: string;
 *   listId: string;
 *   productIds: string[];
 *   templateId: string;
 *   targetSegment?: string;
 *   scheduledAt?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();

    const {
      name,
      listId,
      productIds,
      templateId,
      targetSegment,
      scheduledAt,
    } = body;

    // Validate required fields
    if (!name || !listId || !productIds || !templateId) {
      return NextResponse.json(
        { error: 'name, listId, productIds, and templateId are required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate template
    const template = getCampaignTemplate(templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Invalid templateId' },
        { status: 400 }
      );
    }

    // Get tenant info for branding
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    // Build campaign HTML
    const campaignHTML = await buildProductCampaign(
      user.tenantId,
      productIds,
      templateId,
      {
        companyName: tenant?.name,
        contactEmail: user.email,
      }
    );

    // Create campaign in Mailchimp
    const mailchimpCampaignId = await createCampaign({
      listId,
      subject: campaignHTML.subject,
      fromName: tenant?.name || 'Our Company',
      replyTo: user.email,
      html: campaignHTML.html,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
    });

    // Save campaign to database
    const campaign = await prisma.emailCampaign.create({
      data: {
        tenantId: user.tenantId,
        name,
        mailchimpId: mailchimpCampaignId,
        productIds,
        targetSegment,
        status: scheduledAt ? 'scheduled' : 'draft',
        createdById: user.id,
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
      campaign,
    });
  } catch (error) {
    console.error('Failed to create campaign:', error);
    return NextResponse.json(
      {
        error: 'Failed to create campaign',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
