/**
 * SMS/Text Auto-Logging System
 *
 * Tracks text messages to customers and automatically creates activity records.
 * Supports multiple integration methods:
 * - Twilio SMS webhooks
 * - SMS gateway integrations
 * - Manual text logging
 */

export type SMSActivityData = {
  tenantId: string;
  userId: string;
  customerId: string;
  phoneNumber: string;
  messageBody: string;
  sentAt: Date;
  direction: 'inbound' | 'outbound';
  messageId?: string;
  mediaUrls?: string[];
};

/**
 * Create activity from SMS message
 */
export async function logSMSActivity(data: SMSActivityData): Promise<void> {
  try {
    const notes = [
      `${data.direction === 'inbound' ? 'Received' : 'Sent'} text message`,
      `Phone: ${data.phoneNumber}`,
      `\nMessage:\n${data.messageBody}`,
      data.mediaUrls && data.mediaUrls.length > 0
        ? `\n\nAttachments: ${data.mediaUrls.join(', ')}`
        : '',
    ].filter(Boolean).join('\n');

    const response = await fetch('/api/sales/activities/auto-log/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: data.customerId,
        subject: `Text Message - ${data.direction === 'inbound' ? 'Received' : 'Sent'}`,
        notes,
        occurredAt: data.sentAt.toISOString(),
        activityTypeCode: 'TEXT_MESSAGE',
        outcome: 'SUCCESS',
        metadata: {
          phoneNumber: data.phoneNumber,
          direction: data.direction,
          messageId: data.messageId,
          hasMedia: data.mediaUrls && data.mediaUrls.length > 0,
          autoLogged: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to auto-log SMS activity:', error);
    }
  } catch (error) {
    console.error('Error auto-logging SMS activity:', error);
  }
}

/**
 * Twilio SMS Webhook Handler
 * Call this from your Twilio SMS webhook endpoint
 */
export async function handleTwilioSMSWebhook(webhookData: any): Promise<void> {
  const {
    From,
    To,
    Body,
    MessageSid,
    Direction,
    MediaUrl0, // Twilio sends media URLs as MediaUrl0, MediaUrl1, etc.
    NumMedia,
  } = webhookData;

  // Collect all media URLs
  const mediaUrls: string[] = [];
  if (NumMedia && parseInt(NumMedia, 10) > 0) {
    for (let i = 0; i < parseInt(NumMedia, 10); i++) {
      const url = webhookData[`MediaUrl${i}`];
      if (url) mediaUrls.push(url);
    }
  }

  // Determine which number is the customer's
  const customerPhone = Direction === 'inbound' ? From : To;

  // Find customer by phone number
  const customerResponse = await fetch(
    `/api/sales/customers/by-phone?phone=${encodeURIComponent(customerPhone)}`
  );

  if (!customerResponse.ok) {
    console.warn('Customer not found for phone:', customerPhone);
    return;
  }

  const { customer } = await customerResponse.json();

  // Log the activity
  await logSMSActivity({
    tenantId: customer.tenantId,
    userId: customer.salesRepId,
    customerId: customer.id,
    phoneNumber: customerPhone,
    messageBody: Body,
    sentAt: new Date(),
    direction: Direction === 'inbound' ? 'inbound' : 'outbound',
    messageId: MessageSid,
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
  });
}

/**
 * Manual SMS Logging Helper
 * For when automatic tracking isn't available
 */
export async function createSMSActivityManually(
  customerId: string,
  messageBody: string,
  direction: 'inbound' | 'outbound'
): Promise<void> {
  await logSMSActivity({
    tenantId: '', // Will be determined server-side
    userId: '', // Will be determined server-side
    customerId,
    phoneNumber: 'Manual Entry',
    messageBody,
    sentAt: new Date(),
    direction,
  });
}

/**
 * Thread-based SMS Logging
 * Groups SMS messages into conversation threads
 */
export async function logSMSThread(
  customerId: string,
  messages: Array<{
    body: string;
    direction: 'inbound' | 'outbound';
    timestamp: Date;
  }>
): Promise<void> {
  // Create a summary of the conversation
  const threadSummary = messages
    .map((msg) => {
      const time = msg.timestamp.toLocaleTimeString();
      const direction = msg.direction === 'inbound' ? '⬅️' : '➡️';
      return `${time} ${direction} ${msg.body}`;
    })
    .join('\n');

  const response = await fetch('/api/sales/activities/auto-log/sms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId,
      subject: `Text Conversation - ${messages.length} messages`,
      notes: `Text message thread:\n\n${threadSummary}`,
      occurredAt: messages[messages.length - 1].timestamp.toISOString(),
      activityTypeCode: 'TEXT_MESSAGE',
      outcome: 'SUCCESS',
      metadata: {
        messageCount: messages.length,
        isThread: true,
        autoLogged: true,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Failed to auto-log SMS thread:', error);
  }
}

/**
 * SMS Gateway Integration Helper
 * Generic webhook handler for SMS gateways
 */
export async function handleSMSGatewayWebhook(webhookData: any): Promise<void> {
  // Parse webhook data from your SMS gateway provider
  // This is a generic template - adjust based on your provider's webhook format

  const {
    customerPhone,
    message,
    direction,
    timestamp,
    messageId,
    attachments,
  } = webhookData;

  // Find customer by phone number
  const customerResponse = await fetch(
    `/api/sales/customers/by-phone?phone=${encodeURIComponent(customerPhone)}`
  );

  if (!customerResponse.ok) {
    console.warn('Customer not found for phone:', customerPhone);
    return;
  }

  const { customer } = await customerResponse.json();

  // Log the activity
  await logSMSActivity({
    tenantId: customer.tenantId,
    userId: customer.salesRepId,
    customerId: customer.id,
    phoneNumber: customerPhone,
    messageBody: message,
    sentAt: new Date(timestamp),
    direction: direction === 'received' ? 'inbound' : 'outbound',
    messageId,
    mediaUrls: attachments,
  });
}
