/**
 * Activity Auto-Logger
 * Automatically log emails and SMS as activities
 */

import { prisma } from '@/lib/prisma';

/**
 * Create activity from email
 */
export async function logEmailActivity(
  tenantId: string,
  data: {
    customerId: string;
    userId?: string;
    subject: string;
    body: string;
    direction: 'sent' | 'received';
  }
): Promise<string> {
  // Get or create "Email" activity type
  let activityType = await prisma.activityType.findFirst({
    where: {
      tenantId,
      code: 'EMAIL',
    },
  });

  if (!activityType) {
    activityType = await prisma.activityType.create({
      data: {
        tenantId,
        code: 'EMAIL',
        name: 'Email',
        description: 'Email communication',
      },
    });
  }

  // Create activity
  const activity = await prisma.activity.create({
    data: {
      tenantId,
      activityTypeId: activityType.id,
      customerId: data.customerId,
      userId: data.userId,
      subject: data.subject,
      notes: `${data.direction === 'sent' ? 'Sent' : 'Received'}: ${data.body}`,
      occurredAt: new Date(),
      outcome: 'SUCCESS',
    },
  });

  return activity.id;
}

/**
 * Create activity from SMS
 */
export async function logSMSActivity(
  tenantId: string,
  data: {
    customerId: string;
    userId?: string;
    body: string;
    direction: 'sent' | 'received';
    phoneNumber: string;
  }
): Promise<string> {
  // Get or create "SMS" activity type
  let activityType = await prisma.activityType.findFirst({
    where: {
      tenantId,
      code: 'SMS',
    },
  });

  if (!activityType) {
    activityType = await prisma.activityType.create({
      data: {
        tenantId,
        code: 'SMS',
        name: 'Text Message',
        description: 'SMS communication',
      },
    });
  }

  // Create activity
  const activity = await prisma.activity.create({
    data: {
      tenantId,
      activityTypeId: activityType.id,
      customerId: data.customerId,
      userId: data.userId,
      subject: `SMS ${data.direction === 'sent' ? 'to' : 'from'} ${data.phoneNumber}`,
      notes: data.body,
      occurredAt: new Date(),
      outcome: 'SUCCESS',
    },
  });

  return activity.id;
}

/**
 * Batch log activities for email campaign
 */
export async function logCampaignActivities(
  tenantId: string,
  campaignId: string,
  customerIds: string[],
  subject: string
): Promise<number> {
  // Get Email activity type
  let activityType = await prisma.activityType.findFirst({
    where: {
      tenantId,
      code: 'EMAIL_CAMPAIGN',
    },
  });

  if (!activityType) {
    activityType = await prisma.activityType.create({
      data: {
        tenantId,
        code: 'EMAIL_CAMPAIGN',
        name: 'Email Campaign',
        description: 'Email marketing campaign',
      },
    });
  }

  // Batch create activities
  const result = await prisma.activity.createMany({
    data: customerIds.map((customerId) => ({
      tenantId,
      activityTypeId: activityType!.id,
      customerId,
      subject: `Campaign: ${subject}`,
      notes: `Sent email campaign ${campaignId}`,
      occurredAt: new Date(),
      outcome: 'SUCCESS' as const,
    })),
  });

  return result.count;
}

/**
 * Update activity when email is opened
 */
export async function updateActivityOnEmailOpen(
  activityId: string
): Promise<void> {
  await prisma.activity.update({
    where: { id: activityId },
    data: {
      notes: {
        concat: '\n[Email opened]',
      },
    },
  });
}

/**
 * Update activity when email link is clicked
 */
export async function updateActivityOnEmailClick(
  activityId: string
): Promise<void> {
  await prisma.activity.update({
    where: { id: activityId },
    data: {
      notes: {
        concat: '\n[Email link clicked]',
      },
    },
  });
}
