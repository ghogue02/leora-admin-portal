/**
 * SMS Service
 * Handles SMS messaging via Twilio
 */

import { prisma } from '@/lib/prisma';

export interface SendSMSOptions {
  to: string;
  from: string;
  body: string;
  customerId?: string;
  metadata?: Record<string, any>;
}

/**
 * Send SMS via Twilio
 */
export async function sendSMS(
  tenantId: string,
  options: SendSMSOptions
): Promise<{ success: boolean; externalId?: string; error?: string }> {
  try {
    // Find or create conversation
    let conversation = await prisma.sMSConversation.findFirst({
      where: {
        tenantId,
        phoneNumber: options.to,
      },
    });

    if (!conversation && options.customerId) {
      conversation = await prisma.sMSConversation.create({
        data: {
          tenantId,
          customerId: options.customerId,
          phoneNumber: options.to,
        },
      });
    }

    if (!conversation) {
      throw new Error('Cannot create SMS conversation without customer ID');
    }

    // Create SMS message record
    const smsMessage = await prisma.sMSMessage.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        fromNumber: options.from,
        toNumber: options.to,
        body: options.body,
        direction: 'OUTBOUND',
        status: 'PENDING',
      },
    });

    // Send via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      // Development mode
      console.log('SMS (dev mode):', options);

      await prisma.sMSMessage.update({
        where: { id: smsMessage.id },
        data: {
          status: 'SENT',
          deliveredAt: new Date(),
          externalId: `dev-${Date.now()}`,
        },
      });

      return { success: true, externalId: `dev-${Date.now()}` };
    }

    // TODO: Implement Twilio integration
    // const twilio = require('twilio');
    // const client = twilio(accountSid, authToken);
    // const message = await client.messages.create({
    //   body: options.body,
    //   from: options.from,
    //   to: options.to
    // });

    const externalId = `twilio-${Date.now()}`; // Placeholder

    // Update SMS status
    await prisma.sMSMessage.update({
      where: { id: smsMessage.id },
      data: {
        status: 'SENT',
        externalId,
      },
    });

    // Update conversation
    await prisma.sMSConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
      },
    });

    return { success: true, externalId };
  } catch (error) {
    console.error('SMS send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle incoming SMS webhook from Twilio
 */
export async function handleIncomingSMS(data: {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  tenantId: string;
  customerId?: string;
}): Promise<void> {
  try {
    // Find or create conversation
    let conversation = await prisma.sMSConversation.findFirst({
      where: {
        tenantId: data.tenantId,
        phoneNumber: data.From,
      },
    });

    if (!conversation && data.customerId) {
      conversation = await prisma.sMSConversation.create({
        data: {
          tenantId: data.tenantId,
          customerId: data.customerId,
          phoneNumber: data.From,
        },
      });
    }

    if (!conversation) {
      console.error('Cannot create SMS - no customer found for:', data.From);
      return;
    }

    // Create incoming message
    await prisma.sMSMessage.create({
      data: {
        tenantId: data.tenantId,
        conversationId: conversation.id,
        fromNumber: data.From,
        toNumber: data.To,
        body: data.Body,
        direction: 'INBOUND',
        status: 'RECEIVED',
        externalId: data.MessageSid,
        deliveredAt: new Date(),
      },
    });

    // Update conversation
    await prisma.sMSConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
      },
    });

    // TODO: Auto-log as activity
  } catch (error) {
    console.error('Error handling incoming SMS:', error);
  }
}

/**
 * Get SMS conversation history
 */
export async function getSMSConversation(
  tenantId: string,
  customerId: string,
  phoneNumber: string
) {
  const conversation = await prisma.sMSConversation.findUnique({
    where: {
      tenantId_customerId_phoneNumber: {
        tenantId,
        customerId,
        phoneNumber,
      },
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  return conversation;
}

/**
 * Check opt-in status for SMS
 */
export async function checkSMSOptIn(
  tenantId: string,
  customerId: string
): Promise<boolean> {
  const prefs = await prisma.communicationPreference.findUnique({
    where: {
      tenantId_customerId: {
        tenantId,
        customerId,
      },
    },
  });

  return prefs?.smsOptIn ?? false;
}

/**
 * Update SMS opt-in status
 */
export async function updateSMSOptIn(
  tenantId: string,
  customerId: string,
  optIn: boolean
): Promise<void> {
  await prisma.communicationPreference.upsert({
    where: {
      tenantId_customerId: {
        tenantId,
        customerId,
      },
    },
    create: {
      tenantId,
      customerId,
      smsOptIn: optIn,
    },
    update: {
      smsOptIn: optIn,
    },
  });
}
