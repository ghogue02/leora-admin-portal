/**
 * Mailchimp Integration Service
 * Handles OAuth and sync with Mailchimp
 */

import { prisma } from '@/lib/prisma';

const mailchimp = require('@mailchimp/mailchimp_marketing');

export interface MailchimpConfig {
  apiKey: string;
  server: string;
}

/**
 * Initialize Mailchimp client
 */
function getMailchimpClient(config: MailchimpConfig) {
  mailchimp.setConfig({
    apiKey: config.apiKey,
    server: config.server,
  });
  return mailchimp;
}

/**
 * Connect Mailchimp account
 */
export async function connectMailchimp(
  tenantId: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract server prefix from API key (last part after dash)
    const serverPrefix = apiKey.split('-').pop() || '';

    // Test connection
    const client = getMailchimpClient({ apiKey, server: serverPrefix });
    const response = await client.ping.get();

    if (response.health_status !== 'Everything\'s Chimpy!') {
      throw new Error('Failed to connect to Mailchimp');
    }

    // Save connection
    await prisma.mailchimpConnection.upsert({
      where: { tenantId },
      create: {
        tenantId,
        accessToken: apiKey,
        serverPrefix,
        isActive: true,
      },
      update: {
        accessToken: apiKey,
        serverPrefix,
        isActive: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Mailchimp connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Mailchimp audiences (lists)
 */
export async function getMailchimpAudiences(tenantId: string) {
  const connection = await prisma.mailchimpConnection.findUnique({
    where: { tenantId },
  });

  if (!connection) {
    throw new Error('Mailchimp not connected');
  }

  const client = getMailchimpClient({
    apiKey: connection.accessToken,
    server: connection.serverPrefix,
  });

  const response = await client.lists.getAllLists();
  return response.lists;
}

/**
 * Sync email list to Mailchimp
 */
export async function syncListToMailchimp(
  tenantId: string,
  listId: string,
  mailchimpAudienceId: string
): Promise<{ synced: number; errors: number }> {
  const connection = await prisma.mailchimpConnection.findUnique({
    where: { tenantId },
  });

  if (!connection) {
    throw new Error('Mailchimp not connected');
  }

  const client = getMailchimpClient({
    apiKey: connection.accessToken,
    server: connection.serverPrefix,
  });

  // Get list members
  const members = await prisma.emailListMember.findMany({
    where: { listId, tenantId },
  });

  let synced = 0;
  let errors = 0;

  // Batch add members to Mailchimp
  for (const member of members) {
    try {
      // TODO: Get customer email from Customer table
      const email = 'customer@example.com'; // Placeholder

      await client.lists.addListMember(mailchimpAudienceId, {
        email_address: email,
        status: 'subscribed',
      });

      synced++;
    } catch (error) {
      console.error('Error syncing member:', error);
      errors++;
    }
  }

  // Update sync timestamp
  await prisma.mailchimpConnection.update({
    where: { tenantId },
    data: {
      lastSyncAt: new Date(),
      audienceId: mailchimpAudienceId,
    },
  });

  return { synced, errors };
}

/**
 * Create Mailchimp campaign
 */
export async function createMailchimpCampaign(
  tenantId: string,
  options: {
    listId: string;
    subject: string;
    previewText?: string;
    fromName: string;
    replyTo: string;
    htmlContent: string;
  }
) {
  const connection = await prisma.mailchimpConnection.findUnique({
    where: { tenantId },
  });

  if (!connection || !connection.audienceId) {
    throw new Error('Mailchimp not connected or no audience selected');
  }

  const client = getMailchimpClient({
    apiKey: connection.accessToken,
    server: connection.serverPrefix,
  });

  // Create campaign
  const campaign = await client.campaigns.create({
    type: 'regular',
    recipients: {
      list_id: connection.audienceId,
    },
    settings: {
      subject_line: options.subject,
      preview_text: options.previewText,
      from_name: options.fromName,
      reply_to: options.replyTo,
    },
  });

  // Set campaign content
  await client.campaigns.setContent(campaign.id, {
    html: options.htmlContent,
  });

  return campaign;
}

/**
 * Get Mailchimp campaign analytics
 */
export async function getMailchimpCampaignStats(
  tenantId: string,
  campaignId: string
) {
  const connection = await prisma.mailchimpConnection.findUnique({
    where: { tenantId },
  });

  if (!connection) {
    throw new Error('Mailchimp not connected');
  }

  const client = getMailchimpClient({
    apiKey: connection.accessToken,
    server: connection.serverPrefix,
  });

  const report = await client.reports.getCampaignReport(campaignId);

  return {
    emailsSent: report.emails_sent,
    openRate: report.open_rate,
    clickRate: report.click_rate,
    unsubscribed: report.unsubscribed,
  };
}

/**
 * Import Mailchimp audience to CRM
 */
export async function importMailchimpAudience(
  tenantId: string,
  audienceId: string,
  listName: string
): Promise<{ imported: number; skipped: number }> {
  const connection = await prisma.mailchimpConnection.findUnique({
    where: { tenantId },
  });

  if (!connection) {
    throw new Error('Mailchimp not connected');
  }

  const client = getMailchimpClient({
    apiKey: connection.accessToken,
    server: connection.serverPrefix,
  });

  // Create email list
  const emailList = await prisma.emailList.create({
    data: {
      tenantId,
      name: listName,
      description: `Imported from Mailchimp audience ${audienceId}`,
    },
  });

  // Get all members from Mailchimp
  const response = await client.lists.getListMembersInfo(audienceId, {
    count: 1000, // TODO: Handle pagination for larger lists
  });

  let imported = 0;
  let skipped = 0;

  for (const member of response.members) {
    // TODO: Match email to customer in database
    // For now, skip
    skipped++;
  }

  return { imported, skipped };
}
