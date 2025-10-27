import { describe, it, expect, vi, beforeEach } from 'vitest';
import { batchSyncCustomers, syncCustomer, getSyncStats } from '../mailchimp-sync';
import { prisma } from '../prisma';

// Mock dependencies
vi.mock('../prisma', () => ({
  prisma: {
    customer: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    mailchimpSync: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../mailchimp', () => ({
  syncCustomersToMailchimp: vi.fn(),
  updateSubscriberTags: vi.fn(),
  updateSubscriberStatus: vi.fn(),
}));

describe('Mailchimp Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncCustomer', () => {
    it('should sync a single customer', async () => {
      const mockCustomer = {
        id: '1',
        name: 'John Doe',
        billingEmail: 'john@example.com',
        tenantId: 'tenant-1',
      };

      vi.mocked(prisma.customer.findUnique).mockResolvedValue(
        mockCustomer as any
      );

      const { syncCustomersToMailchimp } = await import('../mailchimp');
      vi.mocked(syncCustomersToMailchimp).mockResolvedValue({
        success: 1,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      await syncCustomer('1', 'list-1');

      expect(syncCustomersToMailchimp).toHaveBeenCalledWith(
        [mockCustomer],
        'list-1'
      );
    });

    it('should throw error if customer not found', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue(null);

      await expect(syncCustomer('1', 'list-1')).rejects.toThrow(
        'Customer not found'
      );
    });

    it('should throw error if customer has no email', async () => {
      vi.mocked(prisma.customer.findUnique).mockResolvedValue({
        id: '1',
        billingEmail: null,
      } as any);

      await expect(syncCustomer('1', 'list-1')).rejects.toThrow(
        'Customer has no email address'
      );
    });
  });

  describe('batchSyncCustomers', () => {
    it('should sync customers by segment', async () => {
      const mockCustomers = [
        {
          id: '1',
          name: 'Customer 1',
          billingEmail: 'customer1@example.com',
          accountType: 'ACTIVE',
        },
        {
          id: '2',
          name: 'Customer 2',
          billingEmail: 'customer2@example.com',
          accountType: 'ACTIVE',
        },
      ];

      vi.mocked(prisma.customer.findMany).mockResolvedValue(
        mockCustomers as any
      );

      const { syncCustomersToMailchimp } = await import('../mailchimp');
      vi.mocked(syncCustomersToMailchimp).mockResolvedValue({
        success: 2,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      vi.mocked(prisma.mailchimpSync.upsert).mockResolvedValue({} as any);

      const results = await batchSyncCustomers('tenant-1', 'list-1', {
        segment: 'ACTIVE',
        batchSize: 100,
      });

      expect(results.successful).toBe(2);
      expect(results.failed).toBe(0);
      expect(results.totalProcessed).toBe(2);

      // Verify sync timestamp was updated
      expect(prisma.mailchimpSync.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId_listId: {
              tenantId: 'tenant-1',
              listId: 'list-1',
            },
          }),
        })
      );
    });

    it('should handle sync errors gracefully', async () => {
      vi.mocked(prisma.customer.findMany).mockResolvedValue([
        { id: '1', billingEmail: 'test@example.com' },
      ] as any);

      const { syncCustomersToMailchimp } = await import('../mailchimp');
      vi.mocked(syncCustomersToMailchimp).mockResolvedValue({
        success: 0,
        failed: 1,
        skipped: 0,
        errors: [{ email: 'test@example.com', error: 'API error' }],
      });

      vi.mocked(prisma.mailchimpSync.upsert).mockResolvedValue({} as any);

      const results = await batchSyncCustomers('tenant-1', 'list-1');

      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
    });

    it('should process customers in batches', async () => {
      // Create 250 mock customers
      const mockCustomers = Array.from({ length: 250 }, (_, i) => ({
        id: `customer-${i}`,
        billingEmail: `customer${i}@example.com`,
        name: `Customer ${i}`,
      }));

      vi.mocked(prisma.customer.findMany).mockResolvedValue(
        mockCustomers as any
      );

      const { syncCustomersToMailchimp } = await import('../mailchimp');
      vi.mocked(syncCustomersToMailchimp).mockResolvedValue({
        success: 100,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      vi.mocked(prisma.mailchimpSync.upsert).mockResolvedValue({} as any);

      await batchSyncCustomers('tenant-1', 'list-1', {
        batchSize: 100,
      });

      // Should be called 3 times (250 / 100 = 3 batches)
      expect(syncCustomersToMailchimp).toHaveBeenCalledTimes(3);
    });
  });

  describe('getSyncStats', () => {
    it('should return sync statistics', async () => {
      vi.mocked(prisma.mailchimpSync.findUnique).mockResolvedValue({
        lastSyncAt: new Date('2025-01-15'),
        isActive: true,
      } as any);

      vi.mocked(prisma.customer.count).mockResolvedValue(150);

      const stats = await getSyncStats('tenant-1', 'list-1');

      expect(stats).toEqual({
        lastSyncAt: expect.any(Date),
        isActive: true,
        totalCustomersWithEmail: 150,
      });
    });

    it('should handle missing sync record', async () => {
      vi.mocked(prisma.mailchimpSync.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.customer.count).mockResolvedValue(100);

      const stats = await getSyncStats('tenant-1', 'list-1');

      expect(stats.lastSyncAt).toBeUndefined();
      expect(stats.isActive).toBe(false);
      expect(stats.totalCustomersWithEmail).toBe(100);
    });
  });
});
