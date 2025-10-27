import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

/**
 * POST /api/mailchimp/webhooks
 * Handle Mailchimp webhook events
 *
 * Webhook events include:
 * - subscribe: New subscriber added
 * - unsubscribe: Subscriber opted out
 * - profile: Profile updated
 * - cleaned: Email address cleaned
 * - upemail: Email address changed
 * - campaign: Campaign sending status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-mailchimp-signature');

    // Verify webhook signature if configured
    if (process.env.MAILCHIMP_WEBHOOK_SECRET && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.MAILCHIMP_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Parse webhook data
    const data = JSON.parse(body);
    const eventType = data.type;

    console.log(`Received Mailchimp webhook: ${eventType}`, data);

    // Handle different event types
    switch (eventType) {
      case 'subscribe':
        await handleSubscribe(data);
        break;

      case 'unsubscribe':
        await handleUnsubscribe(data);
        break;

      case 'profile':
        await handleProfileUpdate(data);
        break;

      case 'cleaned':
        await handleCleaned(data);
        break;

      case 'upemail':
        await handleEmailChange(data);
        break;

      case 'campaign':
        await handleCampaignEvent(data);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing Mailchimp webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mailchimp/webhooks
 * Webhook verification endpoint for Mailchimp
 */
export async function GET(request: NextRequest) {
  // Mailchimp sends a GET request to verify the webhook URL
  return NextResponse.json({ success: true });
}

// ============================================================================
// Webhook Event Handlers
// ============================================================================

async function handleSubscribe(data: any) {
  const email = data.data?.email;
  const listId = data.data?.list_id;
  const merges = data.data?.merges;

  if (!email) return;

  // Find customer by email
  const customer = await prisma.customer.findFirst({
    where: { billingEmail: email },
  });

  if (customer) {
    // Update customer subscription status
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailOptOut: false,
        metadata: {
          ...(customer.metadata as any),
          mailchimp: {
            subscribed: true,
            listId,
            subscribedAt: new Date().toISOString(),
          },
        },
      },
    });

    console.log(`Customer ${email} subscribed to list ${listId}`);
  }
}

async function handleUnsubscribe(data: any) {
  const email = data.data?.email;
  const listId = data.data?.list_id;
  const reason = data.data?.reason;

  if (!email) return;

  // Find customer by email
  const customer = await prisma.customer.findFirst({
    where: { billingEmail: email },
  });

  if (customer) {
    // Update customer opt-out status
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailOptOut: true,
        metadata: {
          ...(customer.metadata as any),
          mailchimp: {
            subscribed: false,
            listId,
            unsubscribedAt: new Date().toISOString(),
            unsubscribeReason: reason,
          },
        },
      },
    });

    console.log(`Customer ${email} unsubscribed from list ${listId}`);
  }
}

async function handleProfileUpdate(data: any) {
  const email = data.data?.email;
  const merges = data.data?.merges;

  if (!email || !merges) return;

  // Find customer by email
  const customer = await prisma.customer.findFirst({
    where: { billingEmail: email },
  });

  if (customer) {
    // Update customer profile with merge field changes
    const updates: any = {};

    if (merges.FNAME) {
      const nameParts = customer.name?.split(' ') || [];
      updates.name = `${merges.FNAME} ${nameParts.slice(1).join(' ')}`.trim();
    }

    if (merges.PHONE) {
      updates.phone = merges.PHONE;
    }

    if (merges.CITY) {
      updates.city = merges.CITY;
    }

    if (merges.STATE) {
      updates.state = merges.STATE;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: updates,
      });

      console.log(`Updated profile for ${email}:`, updates);
    }
  }
}

async function handleCleaned(data: any) {
  const email = data.data?.email;
  const reason = data.data?.reason;

  if (!email) return;

  // Mark email as bounced/invalid
  const customer = await prisma.customer.findFirst({
    where: { billingEmail: email },
  });

  if (customer) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        emailOptOut: true,
        metadata: {
          ...(customer.metadata as any),
          mailchimp: {
            cleaned: true,
            cleanedReason: reason,
            cleanedAt: new Date().toISOString(),
          },
        },
      },
    });

    console.log(`Email ${email} cleaned from list (${reason})`);
  }
}

async function handleEmailChange(data: any) {
  const oldEmail = data.data?.old_email;
  const newEmail = data.data?.new_email;

  if (!oldEmail || !newEmail) return;

  // Update customer email
  const customer = await prisma.customer.findFirst({
    where: { billingEmail: oldEmail },
  });

  if (customer) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        billingEmail: newEmail,
        metadata: {
          ...(customer.metadata as any),
          mailchimp: {
            emailChanged: true,
            oldEmail,
            newEmail,
            changedAt: new Date().toISOString(),
          },
        },
      },
    });

    console.log(`Email changed from ${oldEmail} to ${newEmail}`);
  }
}

async function handleCampaignEvent(data: any) {
  const campaignId = data.data?.id;
  const status = data.data?.status;
  const subject = data.data?.subject;

  if (!campaignId) return;

  // Log campaign event (could store in database for analytics)
  console.log(`Campaign ${campaignId} - ${status}:`, subject);

  // Could update campaign tracking table here
  // await prisma.emailCampaign.upsert(...)
}
