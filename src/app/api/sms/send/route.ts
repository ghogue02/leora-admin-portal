/**
 * SMS Sending API Endpoint
 *
 * Send SMS messages to customers via Twilio.
 * Supports templates and automatic activity logging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/services/twilio/client';
import { renderTemplate } from '@/lib/services/twilio/templates';
import { createClient } from '@/lib/supabase/server';

export interface SendSMSRequest {
  customerId: string;           // Customer ID to send to
  message?: string;             // Custom message
  templateId?: string;          // Or use template
  templateVariables?: Record<string, string>; // Template variables
  salesRepId?: string;          // Sales rep sending (for activity log)
}

/**
 * POST /api/sms/send
 *
 * Send SMS to customer
 */
export async function POST(request: NextRequest) {
  try {
    const body: SendSMSRequest = await request.json();
    const { customerId, message, templateId, templateVariables, salesRepId } = body;

    // Validate request
    if (!customerId) {
      return NextResponse.json(
        { error: 'customerId is required' },
        { status: 400 }
      );
    }

    if (!message && !templateId) {
      return NextResponse.json(
        { error: 'Either message or templateId is required' },
        { status: 400 }
      );
    }

    // Get customer details
    const supabase = await createClient();
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, phone, email, sms_opt_in')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check phone number
    if (!customer.phone) {
      return NextResponse.json(
        { error: 'Customer has no phone number' },
        { status: 400 }
      );
    }

    // Check opt-in status
    if (customer.sms_opt_in === false) {
      return NextResponse.json(
        { error: 'Customer has opted out of SMS messages' },
        { status: 403 }
      );
    }

    // Prepare message
    let messageBody: string;

    if (templateId) {
      // Use template
      const rendered = renderTemplate(templateId, templateVariables || {});

      if (!rendered.success) {
        return NextResponse.json(
          { error: `Template error: ${rendered.error}` },
          { status: 400 }
        );
      }

      messageBody = rendered.message!;
    } else {
      // Use custom message
      messageBody = message!;
    }

    // Send SMS
    const statusCallbackUrl = `${process.env.TWILIO_WEBHOOK_BASE_URL || request.nextUrl.origin}/api/sms/webhooks/status`;

    const result = await sendSMS({
      to: customer.phone,
      body: messageBody,
      statusCallback: statusCallbackUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // Log activity
    await logSMSActivity({
      customerId: customer.id,
      salesRepId,
      direction: 'outbound',
      from: result.from!,
      to: result.to!,
      body: messageBody,
      messageSid: result.messageSid!,
      status: result.status!,
      templateId,
    });

    return NextResponse.json({
      success: true,
      messageSid: result.messageSid,
      status: result.status,
      to: result.to,
      message: 'SMS sent successfully',
    });

  } catch (error) {
    console.error('Error sending SMS:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Log sent SMS as activity
 */
async function logSMSActivity(params: {
  customerId: string;
  salesRepId?: string;
  direction: 'outbound';
  from: string;
  to: string;
  body: string;
  messageSid: string;
  status: string;
  templateId?: string;
}) {
  try {
    const supabase = await createClient();

    // Get SMS activity type
    const { data: activityType } = await supabase
      .from('activity_types')
      .select('id')
      .eq('code', 'sms')
      .single();

    if (!activityType) {
      console.error('SMS activity type not found');
      return;
    }

    // Create activity
    const { error } = await supabase
      .from('activities')
      .insert({
        customer_id: params.customerId,
        sales_rep_id: params.salesRepId,
        activity_type_id: activityType.id,
        subject: `Sent SMS to ${params.to}`,
        description: params.body,
        direction: params.direction,
        status: 'completed',
        metadata: {
          messageSid: params.messageSid,
          from: params.from,
          to: params.to,
          smsStatus: params.status,
          templateId: params.templateId,
          source: 'twilio',
        },
        activity_date: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log SMS activity:', error);
    }
  } catch (error) {
    console.error('Error logging SMS activity:', error);
  }
}
