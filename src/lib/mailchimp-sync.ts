import { prisma } from './prisma';
import {
  syncCustomersToMailchimp,
  updateSubscriberTags,
  type SyncResult,
} from './mailchimp';
import type { Customer, AccountType } from '@prisma/client';

export interface SyncOptions {
  segment?: AccountType;
  includeInactive?: boolean;
  batchSize?: number;
}

export interface SyncResults {
  totalProcessed: number;
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ customerId: string; error: string }>;
}

/**
 * Sync a single customer to Mailchimp
 */
export async function syncCustomer(
  customerId: string,
  listId: string
): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  if (!customer.billingEmail) {
    throw new Error('Customer has no email address');
  }

  // Sync customer
  const result = await syncCustomersToMailchimp([customer], listId);

  if (result.failed > 0) {
    throw new Error(result.errors[0]?.error || 'Failed to sync customer');
  }
}

/**
 * Batch sync customers to Mailchimp
 */
export async function batchSyncCustomers(
  tenantId: string,
  listId: string,
  options: SyncOptions = {}
): Promise<SyncResults> {
  const { segment, includeInactive = false, batchSize = 100 } = options;

  // Build query
  const where: any = { tenantId };

  if (segment) {
    where.accountType = segment;
  }

  if (!includeInactive) {
    where.billingEmail = { not: null };
  }

  // Get customers
  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      billingEmail: true,
      phone: true,
      city: true,
      state: true,
      territory: true,
      accountType: true,
      lastOrderDate: true,
      riskStatus: true,
    },
  });

  const results: SyncResults = {
    totalProcessed: customers.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Process in batches
  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);

    try {
      const syncResult = await syncCustomersToMailchimp(batch as any[], listId);

      results.successful += syncResult.success;
      results.failed += syncResult.failed;
      results.skipped += syncResult.skipped;

      syncResult.errors.forEach((error) => {
        results.errors.push({
          customerId: batch.find((c) => c.billingEmail === error.email)?.id || '',
          error: error.error,
        });
      });
    } catch (error) {
      console.error('Batch sync failed:', error);
      results.failed += batch.length;

      batch.forEach((customer) => {
        results.errors.push({
          customerId: customer.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    }
  }

  // Update sync timestamp
  await prisma.mailchimpSync.upsert({
    where: {
      tenantId_listId: {
        tenantId,
        listId,
      },
    },
    create: {
      tenantId,
      listId,
      listName: 'Unknown', // Will be updated on next full sync
      lastSyncAt: new Date(),
      isActive: true,
    },
    update: {
      lastSyncAt: new Date(),
    },
  });

  return results;
}

/**
 * Sync customer tags based on current data
 */
export async function syncCustomerTags(
  customerId: string,
  listId: string
): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || !customer.billingEmail) {
    throw new Error('Customer not found or has no email');
  }

  const tags = buildCustomerTags(customer);
  await updateSubscriberTags(listId, customer.billingEmail, tags);
}

/**
 * Sync all customer tags for a tenant
 */
export async function syncAllCustomerTags(
  tenantId: string,
  listId: string
): Promise<{ updated: number; failed: number }> {
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      billingEmail: { not: null },
    },
  });

  let updated = 0;
  let failed = 0;

  for (const customer of customers) {
    try {
      const tags = buildCustomerTags(customer);
      await updateSubscriberTags(listId, customer.billingEmail!, tags);
      updated++;
    } catch (error) {
      console.error(`Failed to sync tags for ${customer.id}:`, error);
      failed++;
    }
  }

  return { updated, failed };
}

/**
 * Handle customer opt-out/unsubscribe
 */
export async function handleOptOut(
  customerId: string,
  listId: string
): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || !customer.billingEmail) {
    throw new Error('Customer not found or has no email');
  }

  // Update in Mailchimp
  const { updateSubscriberStatus } = await import('./mailchimp');
  await updateSubscriberStatus(listId, customer.billingEmail, 'unsubscribed');
}

/**
 * Get customers who should receive a campaign
 */
export async function getCampaignAudience(
  tenantId: string,
  segment: AccountType | 'ALL'
): Promise<Customer[]> {
  const where: any = {
    tenantId,
    billingEmail: { not: null },
  };

  if (segment !== 'ALL') {
    where.accountType = segment;
  }

  return prisma.customer.findMany({
    where,
    include: {
      orders: {
        orderBy: { orderedAt: 'desc' },
        take: 1,
      },
    },
  });
}

/**
 * Build tags for a customer (matching mailchimp.ts logic)
 */
function buildCustomerTags(customer: Customer): string[] {
  const tags: string[] = [];

  if (customer.accountType) {
    tags.push(`Type: ${customer.accountType}`);
  }

  if (customer.territory) {
    tags.push(`Territory: ${customer.territory}`);
  }

  if (customer.state) {
    tags.push(`State: ${customer.state}`);
  }

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

  if (customer.riskStatus && customer.riskStatus !== 'HEALTHY') {
    tags.push(`Risk: ${customer.riskStatus}`);
  }

  return tags;
}

/**
 * Get sync statistics
 */
export async function getSyncStats(tenantId: string, listId: string) {
  const sync = await prisma.mailchimpSync.findUnique({
    where: {
      tenantId_listId: {
        tenantId,
        listId,
      },
    },
  });

  const customerCount = await prisma.customer.count({
    where: {
      tenantId,
      billingEmail: { not: null },
    },
  });

  return {
    lastSyncAt: sync?.lastSyncAt,
    isActive: sync?.isActive ?? false,
    totalCustomersWithEmail: customerCount,
  };
}
