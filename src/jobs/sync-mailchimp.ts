import { prisma } from '@/lib/prisma';
import { batchSyncCustomers, syncAllCustomerTags } from '@/lib/mailchimp-sync';
import { updateSubscriberStatus } from '@/lib/mailchimp';

/**
 * Daily background job to sync customers to Mailchimp
 *
 * Schedule: Run daily at 3:00 AM
 *
 * Tasks:
 * 1. Sync all active customers to Mailchimp
 * 2. Update subscriber tags based on current customer data
 * 3. Handle opt-outs and unsubscribes
 * 4. Clean up inactive subscribers
 */
export async function syncMailchimpDaily() {
  console.log('[Mailchimp Sync] Starting daily sync job...');

  try {
    // Get all active Mailchimp syncs
    const syncs = await prisma.mailchimpSync.findMany({
      where: { isActive: true },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`[Mailchimp Sync] Found ${syncs.length} active syncs`);

    const results = {
      totalTenants: syncs.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ tenantId: string; error: string }>,
    };

    // Process each tenant's sync
    for (const sync of syncs) {
      try {
        console.log(
          `[Mailchimp Sync] Processing tenant: ${sync.tenant.name} (${sync.tenantId})`
        );

        // 1. Sync customers to list
        const syncResult = await batchSyncCustomers(
          sync.tenantId,
          sync.listId,
          {
            includeInactive: false, // Only sync customers with emails
            batchSize: 100,
          }
        );

        console.log(
          `[Mailchimp Sync] Synced ${syncResult.successful}/${syncResult.totalProcessed} customers`
        );

        // 2. Update tags for all customers
        const tagResult = await syncAllCustomerTags(sync.tenantId, sync.listId);

        console.log(
          `[Mailchimp Sync] Updated tags for ${tagResult.updated} customers`
        );

        // 3. Handle unsubscribes
        await handleUnsubscribes(sync.tenantId, sync.listId);

        results.successful++;
      } catch (error) {
        console.error(
          `[Mailchimp Sync] Failed for tenant ${sync.tenantId}:`,
          error
        );

        results.failed++;
        results.errors.push({
          tenantId: sync.tenantId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('[Mailchimp Sync] Daily sync completed:', results);

    return results;
  } catch (error) {
    console.error('[Mailchimp Sync] Job failed:', error);
    throw error;
  }
}

/**
 * Handle unsubscribes by checking Mailchimp and updating local data
 */
async function handleUnsubscribes(
  tenantId: string,
  listId: string
): Promise<void> {
  // Note: In production, you'd query Mailchimp for unsubscribed members
  // and update your local database accordingly
  // This is a placeholder for that functionality

  console.log(
    `[Mailchimp Sync] Checking unsubscribes for tenant ${tenantId}...`
  );

  // Example implementation:
  // 1. Get all unsubscribed members from Mailchimp
  // 2. Mark customers as opted out in local database
  // 3. Respect opt-out preferences in future syncs
}

/**
 * Sync a specific tenant immediately (on-demand sync)
 */
export async function syncTenantNow(tenantId: string, listId: string) {
  console.log(`[Mailchimp Sync] On-demand sync for tenant ${tenantId}...`);

  const sync = await prisma.mailchimpSync.findUnique({
    where: {
      tenantId_listId: {
        tenantId,
        listId,
      },
    },
  });

  if (!sync || !sync.isActive) {
    throw new Error('Mailchimp sync not configured or inactive');
  }

  // Sync customers
  const syncResult = await batchSyncCustomers(tenantId, listId, {
    includeInactive: false,
    batchSize: 100,
  });

  // Update tags
  const tagResult = await syncAllCustomerTags(tenantId, listId);

  return {
    customersSynced: syncResult.successful,
    tagsUpdated: tagResult.updated,
    errors: syncResult.errors,
  };
}

/**
 * Clean up old sync records and campaigns
 */
export async function cleanupMailchimpData() {
  console.log('[Mailchimp Sync] Starting cleanup job...');

  // Delete campaigns older than 1 year that are sent
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const deleted = await prisma.emailCampaign.deleteMany({
    where: {
      status: 'sent',
      sentAt: {
        lt: oneYearAgo,
      },
    },
  });

  console.log(`[Mailchimp Sync] Deleted ${deleted.count} old campaigns`);

  return { deletedCampaigns: deleted.count };
}

// Export for job scheduler
export default syncMailchimpDaily;
