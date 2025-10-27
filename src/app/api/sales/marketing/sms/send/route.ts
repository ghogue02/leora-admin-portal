/**
 * Send SMS API
 * POST /api/sales/marketing/sms/send - Send SMS message
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendSMS } from '@/lib/marketing/sms-service';
import { logSMSActivity } from '@/lib/marketing/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id') || '';
    const userId = request.headers.get('x-user-id') || '';

    const body = await request.json();
    const { to, body: messageBody, customerId, templateId } = body;

    // Send SMS
    const result = await sendSMS(tenantId, {
      to,
      from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
      body: messageBody,
      customerId,
    });

    // Log activity
    if (result.success && customerId) {
      await logSMSActivity(tenantId, {
        customerId,
        userId,
        body: messageBody,
        direction: 'sent',
        phoneNumber: to,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error sending SMS:', error);
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}
