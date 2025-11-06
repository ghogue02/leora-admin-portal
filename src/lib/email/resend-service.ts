/**
 * Resend Email Service
 * Handles email sending using Resend API with React Email templates
 */

import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { emailTemplates, type EmailTemplateName } from '@/emails/templates';
import { render } from '@react-email/components';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  templateName: EmailTemplateName;
  templateData: Record<string, any>;
  tenantId: string;
  customerId?: string;
  activityId?: string;
  from?: string;
}

/**
 * Send email using Resend with React Email template
 */
export async function sendEmailWithResend({
  to,
  subject,
  templateName,
  templateData,
  tenantId,
  customerId,
  activityId,
  from = 'Leora CRM <noreply@leora.com>',
}: SendEmailOptions): Promise<{
  success: boolean;
  externalId?: string;
  error?: string;
}> {
  try {
    // Get template component
    const TemplateComponent = emailTemplates[templateName];
    if (!TemplateComponent) {
      throw new Error(`Unknown email template: ${templateName}`);
    }

    // Render template to HTML
    const html = await render(TemplateComponent(templateData));

    // Create email record in database BEFORE sending
    const emailMessage = await prisma.emailMessage.create({
      data: {
        tenantId,
        customerId,
        activityId,
        fromAddress: from,
        toAddress: to,
        subject,
        body: html,
        templateId: templateName,
        status: 'SENDING',
        metadata: {
          templateName,
          templateData,
        },
      },
    });

    const resend = getResendClient();
    if (!resend) {
      console.error('Resend API key is not configured. Email cannot be sent.');
      await prisma.emailMessage.update({
        where: { id: emailMessage.id },
        data: {
          status: 'FAILED',
          metadata: {
            templateName,
            templateData,
            error: 'RESEND_API_KEY not configured',
          },
        },
      });

      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      // Update email record with failure
      await prisma.emailMessage.update({
        where: { id: emailMessage.id },
        data: {
          status: 'FAILED',
          metadata: {
            templateName,
            templateData,
            error: error.message || 'Unknown error',
          },
        },
      });

      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    // Update email record with success
    await prisma.emailMessage.update({
      where: { id: emailMessage.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        externalId: data?.id,
      },
    });

    return {
      success: true,
      externalId: data?.id,
    };
  } catch (error) {
    console.error('Resend email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Queue email for later sending (adds to EmailMessage with PENDING status)
 */
export async function queueEmail({
  to,
  subject,
  templateName,
  templateData,
  tenantId,
  customerId,
  activityId,
  from = 'Leora CRM <noreply@leora.com>',
  scheduledFor,
}: SendEmailOptions & {
  scheduledFor?: Date;
}): Promise<{ success: boolean; emailId?: string; error?: string }> {
  try {
    // Get template component
    const TemplateComponent = emailTemplates[templateName];
    if (!TemplateComponent) {
      throw new Error(`Unknown email template: ${templateName}`);
    }

    // Pre-render template to HTML
    const html = await render(TemplateComponent(templateData));

    // Create email record with PENDING status
    const emailMessage = await prisma.emailMessage.create({
      data: {
        tenantId,
        customerId,
        activityId,
        fromAddress: from,
        toAddress: to,
        subject,
        body: html,
        templateId: templateName,
        status: 'PENDING',
        metadata: {
          templateName,
          templateData,
          scheduledFor: scheduledFor?.toISOString(),
        },
      },
    });

    return {
      success: true,
      emailId: emailMessage.id,
    };
  } catch (error) {
    console.error('Email queue error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process pending emails from the queue
 */
export async function processPendingEmails(
  tenantId?: string
): Promise<{
  processed: number;
  sent: number;
  failed: number;
  results: Array<{ id: string; status: 'sent' | 'failed'; error?: string }>;
}> {
  const resend = getResendClient();
  if (!resend) {
    console.error('Resend API key is not configured. Email queue processing skipped.');
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      results: [],
    };
  }

  const whereClause: any = {
    status: 'PENDING',
  };

  if (tenantId) {
    whereClause.tenantId = tenantId;
  }

  // Get pending emails (check metadata.scheduledFor if it exists)
  const pendingEmails = await prisma.emailMessage.findMany({
    where: whereClause,
    take: 100, // Process in batches of 100
    orderBy: {
      createdAt: 'asc',
    },
  });

  let sent = 0;
  let failed = 0;
  const results: Array<{ id: string; status: 'sent' | 'failed'; error?: string }> = [];

  for (const email of pendingEmails) {
    // Check if scheduled for future
    const metadata = email.metadata as any;
    if (metadata?.scheduledFor) {
      const scheduledDate = new Date(metadata.scheduledFor);
      if (scheduledDate > new Date()) {
        continue; // Skip future scheduled emails
      }
    }

    try {
      // Update status to SENDING
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: { status: 'SENDING' },
      });

      // Send via Resend
      const { data, error } = await resend.emails.send({
        from: email.fromAddress,
        to: email.toAddress,
        subject: email.subject,
        html: email.body,
      });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      // Update status to SENT
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          externalId: data?.id,
        },
      });

      sent++;
      results.push({ id: email.id, status: 'sent' });
    } catch (error) {
      // Update status to FAILED
      await prisma.emailMessage.update({
        where: { id: email.id },
        data: {
          status: 'FAILED',
          metadata: {
            ...(email.metadata as object),
            error: error instanceof Error ? error.message : 'Unknown error',
            failedAt: new Date().toISOString(),
          },
        },
      });

      failed++;
      results.push({
        id: email.id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    processed: sent + failed,
    sent,
    failed,
    results,
  };
}

/**
 * Get email statistics
 */
export async function getEmailStats(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  total: number;
  sent: number;
  pending: number;
  failed: number;
  opened: number;
  clicked: number;
}> {
  const whereClause: any = { tenantId };

  if (startDate || endDate) {
    whereClause.createdAt = {};
    if (startDate) {
      whereClause.createdAt.gte = startDate;
    }
    if (endDate) {
      whereClause.createdAt.lte = endDate;
    }
  }

  const [total, sent, pending, failed, opened, clicked] = await Promise.all([
    prisma.emailMessage.count({ where: whereClause }),
    prisma.emailMessage.count({ where: { ...whereClause, status: 'SENT' } }),
    prisma.emailMessage.count({ where: { ...whereClause, status: 'PENDING' } }),
    prisma.emailMessage.count({ where: { ...whereClause, status: 'FAILED' } }),
    prisma.emailMessage.count({ where: { ...whereClause, status: 'OPENED' } }),
    prisma.emailMessage.count({ where: { ...whereClause, status: 'CLICKED' } }),
  ]);

  return {
    total,
    sent,
    pending,
    failed,
    opened,
    clicked,
  };
}
