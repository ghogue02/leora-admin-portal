/**
 * Email Service
 * Handles email sending with SendGrid/Resend/SES
 */

import { prisma } from '@/lib/prisma';

export interface SendEmailOptions {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  metadata?: Record<string, any>;
}

export interface EmailServiceConfig {
  provider: 'sendgrid' | 'resend' | 'ses';
  apiKey?: string;
  region?: string; // For SES
}

/**
 * Replace personalization tokens in email content
 */
export function replacePersonalizationTokens(
  content: string,
  data: Record<string, any>
): string {
  let result = content;

  // Replace {{token}} style placeholders
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(value || ''));
  }

  return result;
}

/**
 * Send email via configured provider
 */
export async function sendEmail(
  tenantId: string,
  options: SendEmailOptions
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    // Log email to database
    const emailMessage = await prisma.emailMessage.create({
      data: {
        tenantId,
        fromAddress: options.from,
        toAddress: options.to,
        subject: options.subject,
        body: options.html,
        templateId: options.templateId,
        metadata: options.metadata,
        status: 'SENDING',
      },
    });

    // TODO: Integrate with actual email provider
    // For now, mark as sent
    const provider = process.env.EMAIL_PROVIDER || 'sendgrid';

    let externalId: string | undefined;

    if (provider === 'sendgrid') {
      externalId = await sendViaSendGrid(options);
    } else if (provider === 'resend') {
      externalId = await sendViaResend(options);
    } else if (provider === 'ses') {
      externalId = await sendViaSES(options);
    } else {
      // Development mode - just log
      console.log('Email (dev mode):', options);
      externalId = `dev-${Date.now()}`;
    }

    // Update email status
    await prisma.emailMessage.update({
      where: { id: emailMessage.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        externalId,
      },
    });

    return { success: true, externalId };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send via SendGrid
 */
async function sendViaSendGrid(
  options: SendEmailOptions
): Promise<string | undefined> {
  const { sendEmailViaSendGrid } = await import('./email-providers/sendgrid-provider');

  const result = await sendEmailViaSendGrid({
    to: options.to,
    from: options.from,
    subject: options.subject,
    html: options.html,
    text: options.text,
    customArgs: options.metadata,
  });

  if (!result.success) {
    throw new Error(result.error || 'Failed to send email via SendGrid');
  }

  return result.messageId;
}

/**
 * Send via Resend
 */
async function sendViaResend(
  options: SendEmailOptions
): Promise<string | undefined> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('Resend API key not configured');
  }

  // TODO: Implement Resend integration
  // const { Resend } = require('resend');
  // const resend = new Resend(apiKey);
  // const data = await resend.emails.send({...options});
  // return data.id;

  return undefined;
}

/**
 * Send via AWS SES
 */
async function sendViaSES(
  options: SendEmailOptions
): Promise<string | undefined> {
  // TODO: Implement SES integration
  // const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
  // const client = new SESClient({ region: process.env.AWS_REGION });
  // const command = new SendEmailCommand({...});
  // const response = await client.send(command);
  // return response.MessageId;

  return undefined;
}

/**
 * Track email open
 */
export async function trackEmailOpen(externalId: string): Promise<void> {
  await prisma.emailMessage.updateMany({
    where: { externalId },
    data: {
      status: 'OPENED',
      openedAt: new Date(),
    },
  });
}

/**
 * Track email click
 */
export async function trackEmailClick(externalId: string): Promise<void> {
  await prisma.emailMessage.updateMany({
    where: { externalId },
    data: {
      status: 'CLICKED',
      clickedAt: new Date(),
    },
  });
}

/**
 * Send bulk emails to a list
 */
export async function sendBulkEmails(
  tenantId: string,
  listId: string,
  options: Omit<SendEmailOptions, 'to'>
): Promise<{ sent: number; failed: number }> {
  // Get list members
  const members = await prisma.emailListMember.findMany({
    where: { listId, tenantId },
    include: {
      // We would join with Customer here but it's not in the schema relation yet
    },
  });

  let sent = 0;
  let failed = 0;

  // Send to each member
  // TODO: Implement batch sending and rate limiting
  for (const member of members) {
    // TODO: Get customer email from Customer table
    const customerEmail = 'customer@example.com'; // Placeholder

    const result = await sendEmail(tenantId, {
      ...options,
      to: customerEmail,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}
