/**
 * Twilio SMS Webhook Handler
 * POST /api/sales/marketing/webhooks/twilio - Handle incoming SMS
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingSMS } from '@/lib/marketing/sms-service';
import { logSMSActivity } from '@/lib/marketing/activity-logger';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await request.formData();
    const From = formData.get('From') as string;
    const To = formData.get('To') as string;
    const Body = formData.get('Body') as string;
    const MessageSid = formData.get('MessageSid') as string;

    // TODO: Verify Twilio signature for security
    // const twilioSignature = request.headers.get('x-twilio-signature');

    // TODO: Determine tenantId from phone number or other means
    const tenantId = 'default-tenant-id';

    // Try to find customer by phone number
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        phone: From,
      },
    });

    if (!customer) {
      console.log('Received SMS from unknown number:', From);
      return NextResponse.json({ status: 'ignored' });
    }

    // Handle incoming SMS
    await handleIncomingSMS({
      From,
      To,
      Body,
      MessageSid,
      tenantId,
      customerId: customer.id,
    });

    // Log as activity
    await logSMSActivity(tenantId, {
      customerId: customer.id,
      body: Body,
      direction: 'received',
      phoneNumber: From,
    });

    // Respond to Twilio
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`,
      {
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error) {
    console.error('Error handling incoming SMS:', error);
    return NextResponse.json(
      { error: 'Failed to process SMS' },
      { status: 500 }
    );
  }
}
