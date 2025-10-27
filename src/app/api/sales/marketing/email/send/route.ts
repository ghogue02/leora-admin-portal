/**
 * Send Email API
 * POST /api/sales/marketing/email/send - Send individual or bulk email
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, sendBulkEmails, replacePersonalizationTokens } from '@/lib/marketing/email-service';
import { logEmailActivity } from '@/lib/marketing/activity-logger';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const userId = request.headers.get('x-user-id') || '';

    const body = await request.json();
    const {
      to,
      listId,
      subject,
      html,
      templateId,
      customerId,
      personalization,
    } = body;

    // Single email
    if (to && !listId) {
      // Load template if specified
      let emailSubject = subject;
      let emailHtml = html;

      if (templateId) {
        const template = await prisma.emailTemplate.findUnique({
          where: { id: templateId },
        });

        if (template) {
          emailSubject = replacePersonalizationTokens(
            template.subject,
            personalization || {}
          );
          emailHtml = replacePersonalizationTokens(
            template.body,
            personalization || {}
          );
        }
      }

      // Send email
      const result = await sendEmail(tenantId, {
        to,
        from: process.env.FROM_EMAIL || 'noreply@example.com',
        subject: emailSubject,
        html: emailHtml,
        templateId,
      });

      // Log activity
      if (result.success && customerId) {
        await logEmailActivity(tenantId, {
          customerId,
          userId,
          subject: emailSubject,
          body: emailHtml,
          direction: 'sent',
        });
      }

      return NextResponse.json(result);
    }

    // Bulk email to list
    if (listId) {
      const result = await sendBulkEmails(tenantId, listId, {
        from: process.env.FROM_EMAIL || 'noreply@example.com',
        subject,
        html,
        templateId,
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Either "to" or "listId" is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
