/**
 * Twilio Status Callback Handler
 *
 * Receives delivery status updates for sent SMS messages.
 * Updates activity records with delivery status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookSignature } from '@/lib/services/twilio/client';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/sales/marketing/webhooks/twilio/status
 *
 * Handle SMS delivery status updates from Twilio
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const params: Record<string, any> = {};

    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // Validate webhook signature
    const signature = request.headers.get('X-Twilio-Signature') || '';
    const url = request.url;

    const isValid = validateWebhookSignature({
      signature,
      url,
      params,
    });

    if (!isValid) {
      console.error('Invalid Twilio status callback signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Extract status details
    const {
      MessageSid,
      MessageStatus,
      To,
      ErrorCode,
      ErrorMessage,
    } = params;

    console.log('Received Twilio status update:', {
      messageSid: MessageSid,
      status: MessageStatus,
      to: To,
      errorCode: ErrorCode,
      errorMessage: ErrorMessage,
    });

    // Update activity record with status
    await updateActivityStatus({
      messageSid: MessageSid,
      status: MessageStatus,
      errorCode: ErrorCode,
      errorMessage: ErrorMessage,
    });

    return NextResponse.json({
      message: 'Status update processed',
    });

  } catch (error) {
    console.error('Error processing status callback:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update activity record with delivery status
 */
async function updateActivityStatus(params: {
  messageSid: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}) {
  try {
    const supabase = createClient();

    // Find activity by message SID
    const { data: activity } = await supabase
      .from('activities')
      .select('id, metadata')
      .eq('metadata->messageSid', params.messageSid)
      .single();

    if (!activity) {
      console.warn(`Activity not found for message SID: ${params.messageSid}`);
      return;
    }

    // Update metadata with new status
    const updatedMetadata = {
      ...activity.metadata,
      smsStatus: params.status,
      lastStatusUpdate: new Date().toISOString(),
    };

    // Add error information if present
    if (params.errorCode) {
      updatedMetadata.errorCode = params.errorCode;
      updatedMetadata.errorMessage = params.errorMessage;
    }

    // Map Twilio status to activity status
    let activityStatus = 'completed';
    if (['failed', 'undelivered'].includes(params.status)) {
      activityStatus = 'failed';
    } else if (['queued', 'sending'].includes(params.status)) {
      activityStatus = 'pending';
    }

    // Update activity
    const { error } = await supabase
      .from('activities')
      .update({
        status: activityStatus,
        metadata: updatedMetadata,
      })
      .eq('id', activity.id);

    if (error) {
      console.error('Failed to update activity status:', error);
    }

  } catch (error) {
    console.error('Error updating activity status:', error);
  }
}
