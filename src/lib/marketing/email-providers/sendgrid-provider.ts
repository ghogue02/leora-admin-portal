/**
 * SendGrid Email Provider
 * Full implementation for sending emails via SendGrid API
 */

import sgMail from '@sendgrid/mail';

export interface SendGridEmailOptions {
  to: string | string[];
  from: string;
  fromName?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
  trackingSettings?: {
    clickTracking?: { enable: boolean };
    openTracking?: { enable: boolean };
  };
  customArgs?: Record<string, string>;
}

export interface SendGridResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Initialize SendGrid with API key
 */
export function initializeSendGrid(apiKey: string): void {
  if (!apiKey) {
    throw new Error('SendGrid API key is required');
  }
  sgMail.setApiKey(apiKey);
}

/**
 * Send single email via SendGrid
 */
export async function sendEmailViaSendGrid(
  options: SendGridEmailOptions
): Promise<SendGridResponse> {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set');
    }

    // Initialize SendGrid
    initializeSendGrid(apiKey);

    // Prepare email message
    const msg: any = {
      to: options.to,
      from: {
        email: options.from,
        name: options.fromName || process.env.FROM_NAME || 'Well Crafted Wine & Beverage',
      },
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
      trackingSettings: options.trackingSettings || {
        clickTracking: { enable: true },
        openTracking: { enable: true },
      },
    };

    // Add optional fields
    if (options.replyTo) {
      msg.replyTo = options.replyTo;
    }

    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments;
    }

    if (options.customArgs) {
      msg.customArgs = options.customArgs;
    }

    // Send email
    const response = await sgMail.send(msg);

    // Extract message ID from response headers
    const messageId = response[0]?.headers?.['x-message-id'] || `sg-${Date.now()}`;

    return {
      success: true,
      messageId,
      statusCode: response[0]?.statusCode,
    };
  } catch (error: any) {
    console.error('SendGrid send error:', error);

    return {
      success: false,
      error: error.message || 'Failed to send email',
      statusCode: error.code,
    };
  }
}

/**
 * Send bulk emails via SendGrid (batch)
 */
export async function sendBulkEmailsViaSendGrid(
  emails: SendGridEmailOptions[]
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY environment variable is not set');
  }

  initializeSendGrid(apiKey);

  // SendGrid allows batch sending up to 1000 emails at once
  // For safety, we'll do batches of 100
  const batchSize = 100;

  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);

    try {
      const messages = batch.map(email => ({
        to: email.to,
        from: {
          email: email.from,
          name: email.fromName || process.env.FROM_NAME || 'Well Crafted Wine & Beverage',
        },
        subject: email.subject,
        html: email.html,
        text: email.text || stripHtml(email.html),
        trackingSettings: email.trackingSettings || {
          clickTracking: { enable: true },
          openTracking: { enable: true },
        },
        customArgs: email.customArgs,
      }));

      await sgMail.send(messages as any);
      results.sent += batch.length;
    } catch (error: any) {
      console.error('Batch send error:', error);
      results.failed += batch.length;
      results.errors.push(`Batch ${i / batchSize + 1}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Validate SendGrid API key
 */
export async function validateSendGridApiKey(apiKey: string): Promise<boolean> {
  try {
    initializeSendGrid(apiKey);

    // Test by attempting to send to a verification email
    // This won't actually send but will validate the API key
    const testMsg = {
      to: 'test@test.com',
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
      mailSettings: {
        sandboxMode: { enable: true }, // Sandbox mode - won't actually send
      },
    };

    await sgMail.send(testMsg as any);
    return true;
  } catch (error) {
    console.error('SendGrid API key validation failed:', error);
    return false;
  }
}

/**
 * Strip HTML tags for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Get SendGrid email statistics
 */
export async function getSendGridStats(
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set');
    }

    // Note: This requires the SendGrid Web API v3
    // You would need to make HTTP requests to the stats endpoint
    // For now, return placeholder
    return {
      stats: [],
      message: 'Stats API not yet implemented',
    };
  } catch (error) {
    console.error('Error fetching SendGrid stats:', error);
    throw error;
  }
}
