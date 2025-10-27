/**
 * Phone Call Auto-Logging System
 *
 * Tracks phone calls to customers and automatically creates activity records.
 * Supports multiple integration methods:
 * - Twilio integration
 * - VoIP system webhooks
 * - Manual call logging
 */

export type CallActivityData = {
  tenantId: string;
  userId: string;
  customerId: string;
  phoneNumber: string;
  duration: number; // in seconds
  callStartTime: Date;
  callType: 'inbound' | 'outbound';
  recordingUrl?: string;
  transcription?: string;
};

/**
 * Create activity from phone call
 */
export async function logCallActivity(data: CallActivityData): Promise<void> {
  try {
    const durationMinutes = Math.round(data.duration / 60);
    const durationText = durationMinutes > 0
      ? `${durationMinutes} minute${durationMinutes !== 1 ? 's' : ''}`
      : `${data.duration} seconds`;

    const notes = [
      `${data.callType === 'inbound' ? 'Incoming' : 'Outgoing'} call`,
      `Duration: ${durationText}`,
      `Phone: ${data.phoneNumber}`,
      data.transcription ? `\n\nTranscription:\n${data.transcription}` : '',
      data.recordingUrl ? `\n\nRecording: ${data.recordingUrl}` : '',
    ].filter(Boolean).join('\n');

    const response = await fetch('/api/sales/activities/auto-log/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId: data.customerId,
        subject: `Phone Call - ${data.callType === 'inbound' ? 'Incoming' : 'Outgoing'}`,
        notes,
        occurredAt: data.callStartTime.toISOString(),
        activityTypeCode: 'PHONE_CALL',
        outcome: data.duration > 30 ? 'SUCCESS' : 'NO_RESPONSE', // Assume success if call > 30 seconds
        metadata: {
          duration: data.duration,
          phoneNumber: data.phoneNumber,
          callType: data.callType,
          recordingUrl: data.recordingUrl,
          autoLogged: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to auto-log call activity:', error);
    }
  } catch (error) {
    console.error('Error auto-logging call activity:', error);
  }
}

/**
 * Twilio Webhook Handler
 * Call this from your Twilio webhook endpoint
 */
export async function handleTwilioCallWebhook(webhookData: any): Promise<void> {
  const {
    From,
    To,
    CallDuration,
    CallStatus,
    Direction,
    RecordingUrl,
    TranscriptionText,
    CallSid,
  } = webhookData;

  // Only log completed calls
  if (CallStatus !== 'completed') {
    return;
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
  await logCallActivity({
    tenantId: customer.tenantId,
    userId: customer.salesRepId,
    customerId: customer.id,
    phoneNumber: customerPhone,
    duration: parseInt(CallDuration, 10),
    callStartTime: new Date(),
    callType: Direction === 'inbound' ? 'inbound' : 'outbound',
    recordingUrl: RecordingUrl,
    transcription: TranscriptionText,
  });
}

/**
 * Manual Call Logging Helper
 * For when automatic tracking isn't available
 */
export async function createCallActivityManually(
  customerId: string,
  duration: number,
  callType: 'inbound' | 'outbound',
  notes?: string
): Promise<void> {
  await logCallActivity({
    tenantId: '', // Will be determined server-side
    userId: '', // Will be determined server-side
    customerId,
    phoneNumber: 'Manual Entry',
    duration,
    callStartTime: new Date(),
    callType,
    transcription: notes,
  });
}

/**
 * VoIP System Integration Helper
 * Generic webhook handler for VoIP systems
 */
export async function handleVoIPWebhook(webhookData: any): Promise<void> {
  // Parse webhook data from your VoIP provider
  // This is a generic template - adjust based on your provider's webhook format

  const {
    customerPhone,
    duration,
    direction,
    timestamp,
    recording,
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
  await logCallActivity({
    tenantId: customer.tenantId,
    userId: customer.salesRepId,
    customerId: customer.id,
    phoneNumber: customerPhone,
    duration,
    callStartTime: new Date(timestamp),
    callType: direction === 'incoming' ? 'inbound' : 'outbound',
    recordingUrl: recording,
  });
}

/**
 * RingCentral Integration Helper
 */
export async function trackRingCentralCall(
  callData: any,
  customerId: string
): Promise<void> {
  // Integration with RingCentral API
  console.log('RingCentral tracking not yet implemented for call:', callData);
}

/**
 * Dialpad Integration Helper
 */
export async function trackDialpadCall(
  callData: any,
  customerId: string
): Promise<void> {
  // Integration with Dialpad API
  console.log('Dialpad tracking not yet implemented for call:', callData);
}
