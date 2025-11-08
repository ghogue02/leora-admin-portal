import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

type MailchimpWebhookData = {
  email?: string;
  list_id?: string;
  merges?: Record<string, string>;
  reason?: string;
  old_email?: string;
  new_email?: string;
  id?: string;
  status?: string;
  subject?: string;
};

type MailchimpWebhookPayload = {
  type: string;
  fired_at?: string;
  data?: MailchimpWebhookData;
};

const toJsonObject = (value: Prisma.JsonValue | null | undefined): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};

const mergeMailchimpMetadata = (
  metadata: Prisma.JsonValue | null | undefined,
  mailchimpData: Record<string, unknown>
): Prisma.JsonObject => {
  const base = toJsonObject(metadata);
  const existingMailchimp =
    base.mailchimp && typeof base.mailchimp === 'object' && !Array.isArray(base.mailchimp)
      ? { ...(base.mailchimp as Record<string, unknown>) }
      : {};

  return {
    ...base,
    mailchimp: {
      ...existingMailchimp,
      ...mailchimpData,
    },
  };
};

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
    const payload = JSON.parse(body) as MailchimpWebhookPayload;
    const eventType = payload.type;

    console.log(`Received Mailchimp webhook: ${eventType}`, payload);

    // Handle different event types
    switch (eventType) {
      case 'subscribe':
        await handleSubscribe(payload);
        break;

      case 'unsubscribe':
        await handleUnsubscribe(payload);
        break;

      case 'profile':
        await handleProfileUpdate(payload);
        break;

      case 'cleaned':
        await handleCleaned(payload);
        break;

      case 'upemail':
        await handleEmailChange(payload);
        break;

      case 'campaign':
        await handleCampaignEvent(payload);
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
export async function GET() {
  // Mailchimp sends a GET request to verify the webhook URL
  return NextResponse.json({ success: true });
}

// ============================================================================
// Webhook Event Handlers
// ============================================================================

async function handleSubscribe(payload: MailchimpWebhookPayload) {
  const email = payload.data?.email;
  const listId = payload.data?.list_id;

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
        metadata: mergeMailchimpMetadata(customer.metadata, {
          subscribed: true,
          listId,
          subscribedAt: new Date().toISOString(),
        }),
      },
    });

    console.log(`Customer ${email} subscribed to list ${listId}`);
  }
}

async function handleUnsubscribe(payload: MailchimpWebhookPayload) {
  const email = payload.data?.email;
  const listId = payload.data?.list_id;
  const reason = payload.data?.reason;

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
        metadata: mergeMailchimpMetadata(customer.metadata, {
          subscribed: false,
          listId,
          unsubscribedAt: new Date().toISOString(),
          unsubscribeReason: reason,
        }),
      },
    });

    console.log(`Customer ${email} unsubscribed from list ${listId}`);
  }
}

async function handleProfileUpdate(payload: MailchimpWebhookPayload) {
  const email = payload.data?.email;
  const merges = payload.data?.merges;

  if (!email || !merges) return;

  // Find customer by email
  const customer = await prisma.customer.findFirst({
    where: { billingEmail: email },
  });

  if (customer) {
    // Update customer profile with merge field changes
    const updates: Record<string, unknown> = {};

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

async function handleCleaned(payload: MailchimpWebhookPayload) {
  const email = payload.data?.email;
  const reason = payload.data?.reason;

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
        metadata: mergeMailchimpMetadata(customer.metadata, {
          cleaned: true,
          cleanedReason: reason,
          cleanedAt: new Date().toISOString(),
        }),
      },
    });

    console.log(`Email ${email} cleaned from list (${reason})`);
  }
}

async function handleEmailChange(payload: MailchimpWebhookPayload) {
  const oldEmail = payload.data?.old_email;
  const newEmail = payload.data?.new_email;

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
        metadata: mergeMailchimpMetadata(customer.metadata, {
          emailChanged: true,
          oldEmail,
          newEmail,
          changedAt: new Date().toISOString(),
        }),
      },
    });

    console.log(`Email changed from ${oldEmail} to ${newEmail}`);
  }
}

async function handleCampaignEvent(payload: MailchimpWebhookPayload) {
  const campaignId = payload.data?.id;
  const status = payload.data?.status;
  const subject = payload.data?.subject;

  if (!campaignId) return;

  // Log campaign event (could store in database for analytics)
  console.log(`Campaign ${campaignId} - ${status}:`, subject);

  // Could update campaign tracking table here
  // await prisma.emailCampaign.upsert(...)
}
