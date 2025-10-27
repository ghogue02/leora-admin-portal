/**
 * Twilio SMS Client Service
 *
 * Core service for interacting with Twilio SMS API.
 * Handles authentication, message sending, and webhook validation.
 */

import twilio from 'twilio';

// Twilio configuration from environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

// Validate required environment variables
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.warn('⚠️  Twilio credentials not configured. SMS features will be disabled.');
}

/**
 * Initialize Twilio client
 * Returns null if credentials are not configured
 */
export function getTwilioClient() {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return null;
  }

  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

/**
 * Send SMS message
 */
export interface SendSMSParams {
  to: string;           // Recipient phone number (E.164 format: +1234567890)
  body: string;         // Message content (max 1600 characters)
  from?: string;        // Override default phone number
  messagingServiceSid?: string; // Override default messaging service
  statusCallback?: string; // URL for delivery status updates
}

export interface SendSMSResult {
  success: boolean;
  messageSid?: string;  // Twilio message ID
  status?: string;      // Message status (queued, sent, delivered, etc.)
  error?: string;       // Error message if failed
  to?: string;          // Recipient number
  from?: string;        // Sender number
  dateCreated?: Date;   // When message was created
}

export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const client = getTwilioClient();

  if (!client) {
    return {
      success: false,
      error: 'Twilio not configured. Please add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to environment variables.',
    };
  }

  // Validate phone number format
  if (!params.to.match(/^\+[1-9]\d{1,14}$/)) {
    return {
      success: false,
      error: `Invalid phone number format: ${params.to}. Use E.164 format (e.g., +1234567890)`,
    };
  }

  // Validate message length (single SMS = 160 chars, concatenated up to 1600)
  if (params.body.length > 1600) {
    return {
      success: false,
      error: `Message too long: ${params.body.length} characters. Maximum is 1600.`,
    };
  }

  try {
    // Prepare message parameters
    const messageParams: any = {
      to: params.to,
      body: params.body,
    };

    // Use messaging service SID if available (recommended for production)
    if (params.messagingServiceSid || TWILIO_MESSAGING_SERVICE_SID) {
      messageParams.messagingServiceSid = params.messagingServiceSid || TWILIO_MESSAGING_SERVICE_SID;
    } else {
      // Fall back to direct phone number
      messageParams.from = params.from || TWILIO_PHONE_NUMBER;

      if (!messageParams.from) {
        return {
          success: false,
          error: 'No sender phone number configured. Set TWILIO_PHONE_NUMBER or TWILIO_MESSAGING_SERVICE_SID.',
        };
      }
    }

    // Add status callback if provided
    if (params.statusCallback) {
      messageParams.statusCallback = params.statusCallback;
    }

    // Send the message
    const message = await client.messages.create(messageParams);

    return {
      success: true,
      messageSid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      dateCreated: message.dateCreated,
    };
  } catch (error: any) {
    console.error('Failed to send SMS:', error);

    return {
      success: false,
      error: error.message || 'Unknown error occurred while sending SMS',
    };
  }
}

/**
 * Validate Twilio webhook signature
 * Ensures webhook requests are actually from Twilio
 */
export interface ValidateWebhookParams {
  signature: string;    // X-Twilio-Signature header
  url: string;          // Full webhook URL
  params: Record<string, any>; // Request body parameters
}

export function validateWebhookSignature(params: ValidateWebhookParams): boolean {
  if (!TWILIO_AUTH_TOKEN) {
    console.warn('Cannot validate webhook signature: TWILIO_AUTH_TOKEN not configured');
    return false;
  }

  try {
    return twilio.validateRequest(
      TWILIO_AUTH_TOKEN,
      params.signature,
      params.url,
      params.params
    );
  } catch (error) {
    console.error('Webhook signature validation failed:', error);
    return false;
  }
}

/**
 * Get message status
 */
export async function getMessageStatus(messageSid: string): Promise<{
  success: boolean;
  status?: string;
  error?: string;
}> {
  const client = getTwilioClient();

  if (!client) {
    return {
      success: false,
      error: 'Twilio not configured',
    };
  }

  try {
    const message = await client.messages(messageSid).fetch();

    return {
      success: true,
      status: message.status,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * List recent messages for a phone number
 */
export async function getMessagesForNumber(
  phoneNumber: string,
  limit: number = 50
): Promise<{
  success: boolean;
  messages?: Array<{
    sid: string;
    from: string;
    to: string;
    body: string;
    status: string;
    direction: 'inbound' | 'outbound-api' | 'outbound-call' | 'outbound-reply';
    dateCreated: Date;
  }>;
  error?: string;
}> {
  const client = getTwilioClient();

  if (!client) {
    return {
      success: false,
      error: 'Twilio not configured',
    };
  }

  try {
    const messages = await client.messages.list({
      to: phoneNumber,
      limit,
    });

    return {
      success: true,
      messages: messages.map(msg => ({
        sid: msg.sid,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        status: msg.status,
        direction: msg.direction as any,
        dateCreated: msg.dateCreated,
      })),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if Twilio is properly configured
 */
export function isTwilioConfigured(): boolean {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_PHONE_NUMBER || TWILIO_MESSAGING_SERVICE_SID));
}

/**
 * Get Twilio configuration status
 */
export function getTwilioStatus() {
  return {
    configured: isTwilioConfigured(),
    hasAccountSid: !!TWILIO_ACCOUNT_SID,
    hasAuthToken: !!TWILIO_AUTH_TOKEN,
    hasPhoneNumber: !!TWILIO_PHONE_NUMBER,
    hasMessagingService: !!TWILIO_MESSAGING_SERVICE_SID,
  };
}
