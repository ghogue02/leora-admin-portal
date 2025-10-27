import mailchimp from '@mailchimp/mailchimp_marketing';
import type { Customer } from '@prisma/client';

// Initialize Mailchimp SDK
mailchimp.setConfig({
  apiKey: process.env.MAILCHIMP_API_KEY || '',
  server: process.env.MAILCHIMP_SERVER_PREFIX || 'us1',
});

export interface MailchimpList {
  id: string;
  name: string;
  stats: {
    member_count: number;
    unsubscribe_count: number;
    cleaned_count: number;
  };
}

export interface MailchimpSubscriber {
  email_address: string;
  status: 'subscribed' | 'unsubscribed' | 'cleaned' | 'pending';
  merge_fields: {
    FNAME: string;
    LNAME?: string;
    COMPANY?: string;
    PHONE?: string;
    CITY?: string;
    STATE?: string;
  };
  tags: string[];
}

export interface SyncResult {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{ email: string; error: string }>;
}

export interface CampaignData {
  listId: string;
  subject: string;
  fromName: string;
  replyTo: string;
  html: string;
  segmentId?: string;
  scheduledAt?: Date;
}

/**
 * Get all Mailchimp lists/audiences for the configured account
 */
export async function getMailchimpLists(): Promise<MailchimpList[]> {
  try {
    const response = await mailchimp.lists.getAllLists({ count: 100 });

    return response.lists.map((list) => ({
      id: list.id,
      name: list.name,
      stats: {
        member_count: list.stats.member_count,
        unsubscribe_count: list.stats.unsubscribe_count,
        cleaned_count: list.stats.cleaned_count,
      },
    }));
  } catch (error) {
    console.error('Failed to fetch Mailchimp lists:', error);
    throw new Error('Failed to fetch Mailchimp lists');
  }
}

/**
 * Sync customers to a Mailchimp list
 */
export async function syncCustomersToMailchimp(
  customers: Customer[],
  listId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Batch operations for efficiency (Mailchimp allows up to 500 per batch)
  const batchSize = 500;
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);

    const operations = batch.map((customer) => {
      if (!customer.billingEmail) {
        result.skipped++;
        return null;
      }

      const [firstName, ...lastNameParts] = (customer.name || '').split(' ');
      const lastName = lastNameParts.join(' ');

      return {
        method: 'PUT' as const,
        path: `/lists/${listId}/members/${hashEmail(customer.billingEmail)}`,
        body: JSON.stringify({
          email_address: customer.billingEmail,
          status_if_new: 'subscribed',
          merge_fields: {
            FNAME: firstName || customer.name || '',
            LNAME: lastName || '',
            COMPANY: customer.name || '',
            PHONE: customer.phone || '',
            CITY: customer.city || '',
            STATE: customer.state || '',
          },
          tags: buildCustomerTags(customer),
        }),
      };
    }).filter(Boolean);

    try {
      const response = await mailchimp.batches.start({
        operations: operations as any[],
      });

      // Wait for batch to complete (with timeout)
      const batchId = response.id;
      const batchResult = await waitForBatch(batchId, 30000);

      result.success += batchResult.finished_operations;
      result.failed += batchResult.errored_operations;
    } catch (error) {
      console.error('Batch sync failed:', error);
      result.failed += operations.length;
      result.errors.push({
        email: 'batch',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return result;
}

/**
 * Create a segment in Mailchimp based on customer selection
 */
export async function createSegment(
  listId: string,
  segmentName: string,
  customerEmails: string[]
): Promise<string> {
  try {
    // Create static segment
    const segment = await mailchimp.lists.createSegment(listId, {
      name: segmentName,
      static_segment: customerEmails,
    });

    return segment.id.toString();
  } catch (error) {
    console.error('Failed to create segment:', error);
    throw new Error('Failed to create Mailchimp segment');
  }
}

/**
 * Create and optionally schedule a campaign
 */
export async function createCampaign(
  campaignData: CampaignData
): Promise<string> {
  try {
    // Create campaign
    const campaign = await mailchimp.campaigns.create({
      type: 'regular',
      recipients: {
        list_id: campaignData.listId,
        segment_opts: campaignData.segmentId
          ? {
              saved_segment_id: parseInt(campaignData.segmentId),
            }
          : undefined,
      },
      settings: {
        subject_line: campaignData.subject,
        from_name: campaignData.fromName,
        reply_to: campaignData.replyTo,
      },
    });

    // Set campaign content
    await mailchimp.campaigns.setContent(campaign.id, {
      html: campaignData.html,
    });

    // Schedule if requested
    if (campaignData.scheduledAt) {
      await mailchimp.campaigns.schedule(campaign.id, {
        schedule_time: campaignData.scheduledAt.toISOString(),
      });
    }

    return campaign.id;
  } catch (error) {
    console.error('Failed to create campaign:', error);
    throw new Error('Failed to create Mailchimp campaign');
  }
}

/**
 * Update subscriber status (subscribe/unsubscribe)
 */
export async function updateSubscriberStatus(
  listId: string,
  email: string,
  status: 'subscribed' | 'unsubscribed'
): Promise<void> {
  try {
    await mailchimp.lists.setListMember(listId, hashEmail(email), {
      email_address: email,
      status,
    });
  } catch (error) {
    console.error('Failed to update subscriber status:', error);
    throw new Error('Failed to update subscriber status');
  }
}

/**
 * Update subscriber tags
 */
export async function updateSubscriberTags(
  listId: string,
  email: string,
  tags: string[]
): Promise<void> {
  try {
    // Remove all existing tags, then add new ones
    const member = await mailchimp.lists.getListMember(listId, hashEmail(email));

    const existingTags = member.tags.map((t: any) => ({
      name: t.name,
      status: 'inactive' as const,
    }));

    const newTags = tags.map((tag) => ({
      name: tag,
      status: 'active' as const,
    }));

    await mailchimp.lists.updateListMemberTags(listId, hashEmail(email), {
      tags: [...existingTags, ...newTags],
    });
  } catch (error) {
    console.error('Failed to update tags:', error);
    throw new Error('Failed to update subscriber tags');
  }
}

/**
 * Send a campaign immediately
 */
export async function sendCampaign(campaignId: string): Promise<void> {
  try {
    await mailchimp.campaigns.send(campaignId);
  } catch (error) {
    console.error('Failed to send campaign:', error);
    throw new Error('Failed to send campaign');
  }
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(campaignId: string) {
  try {
    const report = await mailchimp.reports.getCampaignReport(campaignId);

    return {
      emailsSent: report.emails_sent,
      opensTotal: report.opens.opens_total,
      uniqueOpens: report.opens.unique_opens,
      clicksTotal: report.clicks.clicks_total,
      uniqueClicks: report.clicks.unique_clicks,
      openRate: report.opens.open_rate,
      clickRate: report.clicks.click_rate,
    };
  } catch (error) {
    console.error('Failed to get campaign stats:', error);
    throw new Error('Failed to get campaign statistics');
  }
}

// Helper functions

/**
 * Build tags for a customer based on their data
 */
function buildCustomerTags(customer: Customer): string[] {
  const tags: string[] = [];

  // Account type tag
  if (customer.accountType) {
    tags.push(`Type: ${customer.accountType}`);
  }

  // Territory tag
  if (customer.territory) {
    tags.push(`Territory: ${customer.territory}`);
  }

  // State tag
  if (customer.state) {
    tags.push(`State: ${customer.state}`);
  }

  // Last order recency
  if (customer.lastOrderDate) {
    const daysSinceOrder = Math.floor(
      (Date.now() - customer.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceOrder < 30) {
      tags.push('Recent Customer');
    } else if (daysSinceOrder < 90) {
      tags.push('Active Customer');
    } else {
      tags.push('Inactive Customer');
    }
  }

  // Risk status
  if (customer.riskStatus && customer.riskStatus !== 'HEALTHY') {
    tags.push(`Risk: ${customer.riskStatus}`);
  }

  return tags;
}

/**
 * Hash email for Mailchimp subscriber ID (MD5)
 */
function hashEmail(email: string): string {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
}

/**
 * Wait for a batch operation to complete
 */
async function waitForBatch(
  batchId: string,
  timeoutMs: number
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const batch = await mailchimp.batches.status(batchId);

    if (batch.status === 'finished') {
      return batch;
    }

    // Wait 2 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error('Batch operation timed out');
}

/**
 * Validate Mailchimp connection
 */
export async function validateMailchimpConnection(): Promise<boolean> {
  try {
    await mailchimp.ping.get();
    return true;
  } catch {
    return false;
  }
}
