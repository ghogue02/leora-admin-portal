/**
 * Email Auto-Logging System
 *
 * Tracks outgoing emails to customers and automatically creates activity records.
 * Supports multiple integration methods:
 * - SMTP webhook integration
 * - IMAP monitoring
 * - Manual logging via API
 */

export type EmailActivityData = {
  tenantId: string;
  userId: string;
  customerId: string;
  subject: string;
  emailBody?: string;
  sentAt: Date;
  emailProvider?: string;
  messageId?: string;
};

/**
 * Create activity from sent email
 */
export async function logEmailActivity(data: EmailActivityData): Promise<void> {
  try {
    const response = await fetch('/api/sales/activities/auto-log/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: data.customerId,
        subject: `Email: ${data.subject}`,
        notes: data.emailBody
          ? `Email sent to customer.\n\nSubject: ${data.subject}\n\nBody preview: ${data.emailBody.substring(0, 500)}...`
          : `Email sent to customer with subject: ${data.subject}`,
        occurredAt: data.sentAt.toISOString(),
        activityTypeCode: 'EMAIL_FOLLOW_UP',
        outcome: 'SUCCESS',
        metadata: {
          provider: data.emailProvider,
          messageId: data.messageId,
          autoLogged: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to auto-log email activity:', error);
    }
  } catch (error) {
    console.error('Error auto-logging email activity:', error);
  }
}

/**
 * SMTP Webhook Handler
 * Call this from your email sending service webhook
 */
export async function handleEmailWebhook(webhookData: any): Promise<void> {
  // Parse webhook data from your email provider (e.g., SendGrid, Mailgun, etc.)
  const { to, subject, html, timestamp, messageId } = webhookData;

  // Find customer by email
  const customerResponse = await fetch(`/api/sales/customers/by-email?email=${encodeURIComponent(to)}`);

  if (!customerResponse.ok) {
    console.warn('Customer not found for email:', to);
    return;
  }

  const { customer } = await customerResponse.json();

  // Log the activity
  await logEmailActivity({
    tenantId: customer.tenantId,
    userId: customer.salesRepId,
    customerId: customer.id,
    subject,
    emailBody: html || '',
    sentAt: new Date(timestamp),
    messageId,
  });
}

/**
 * IMAP Email Monitor
 * For monitoring sent emails folder (requires server-side IMAP setup)
 */
export class EmailMonitor {
  private interval: NodeJS.Timeout | null = null;

  /**
   * Start monitoring sent emails
   */
  start(checkIntervalMs: number = 60000): void {
    this.interval = setInterval(async () => {
      await this.checkSentEmails();
    }, checkIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Check sent emails folder and log new emails
   */
  private async checkSentEmails(): Promise<void> {
    // Implementation would require IMAP library like 'imap' or 'node-imap'
    // This is a placeholder for the actual implementation
    console.log('Checking sent emails folder...');

    // Example implementation outline:
    // 1. Connect to IMAP server
    // 2. Open SENT folder
    // 3. Search for emails sent in last check interval
    // 4. For each email:
    //    - Extract recipient, subject, body
    //    - Find customer by email
    //    - Call logEmailActivity()
  }
}

/**
 * Manual Email Logging Helper
 * For when automatic tracking isn't available
 */
export async function createEmailActivityManually(
  customerId: string,
  subject: string,
  notes?: string
): Promise<void> {
  await logEmailActivity({
    tenantId: '', // Will be determined server-side
    userId: '', // Will be determined server-side
    customerId,
    subject,
    emailBody: notes,
    sentAt: new Date(),
  });
}

/**
 * Gmail API Integration Helper
 * For tracking emails sent via Gmail
 */
export async function trackGmailEmail(
  gmailMessageId: string,
  customerId: string
): Promise<void> {
  // This would integrate with Gmail API to fetch message details
  // Requires OAuth setup and gmail API client

  // Example outline:
  // 1. Fetch message details from Gmail API using messageId
  // 2. Extract subject, body, timestamp
  // 3. Call logEmailActivity()

  console.log('Gmail tracking not yet implemented for message:', gmailMessageId);
}

/**
 * Outlook API Integration Helper
 * For tracking emails sent via Outlook/Office 365
 */
export async function trackOutlookEmail(
  outlookMessageId: string,
  customerId: string
): Promise<void> {
  // This would integrate with Microsoft Graph API to fetch message details
  // Requires OAuth setup and Graph API client

  console.log('Outlook tracking not yet implemented for message:', outlookMessageId);
}
