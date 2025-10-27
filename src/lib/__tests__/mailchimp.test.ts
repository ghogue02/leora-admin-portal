import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  syncCustomersToMailchimp,
  createSegment,
  createCampaign,
  updateSubscriberStatus,
  updateSubscriberTags,
  getMailchimpLists,
  validateMailchimpConnection,
} from '../mailchimp';
import type { Customer } from '@prisma/client';

// Mock Mailchimp SDK
vi.mock('@mailchimp/mailchimp_marketing', () => ({
  default: {
    setConfig: vi.fn(),
    lists: {
      getAllLists: vi.fn(),
      getListMember: vi.fn(),
      setListMember: vi.fn(),
      updateListMemberTags: vi.fn(),
      createSegment: vi.fn(),
    },
    campaigns: {
      create: vi.fn(),
      setContent: vi.fn(),
      schedule: vi.fn(),
      send: vi.fn(),
    },
    reports: {
      getCampaignReport: vi.fn(),
    },
    batches: {
      start: vi.fn(),
      status: vi.fn(),
    },
    ping: {
      get: vi.fn(),
    },
  },
}));

describe('Mailchimp Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMailchimpLists', () => {
    it('should fetch and format Mailchimp lists', async () => {
      const mockLists = {
        lists: [
          {
            id: 'list-1',
            name: 'Main List',
            stats: {
              member_count: 100,
              unsubscribe_count: 5,
              cleaned_count: 2,
            },
          },
        ],
      };

      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.lists.getAllLists).mockResolvedValue(
        mockLists as any
      );

      const lists = await getMailchimpLists();

      expect(lists).toHaveLength(1);
      expect(lists[0]).toEqual({
        id: 'list-1',
        name: 'Main List',
        stats: {
          member_count: 100,
          unsubscribe_count: 5,
          cleaned_count: 2,
        },
      });
    });

    it('should handle API errors', async () => {
      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.lists.getAllLists).mockRejectedValue(
        new Error('API Error')
      );

      await expect(getMailchimpLists()).rejects.toThrow(
        'Failed to fetch Mailchimp lists'
      );
    });
  });

  describe('syncCustomersToMailchimp', () => {
    it('should sync customers in batches', async () => {
      const customers: Partial<Customer>[] = [
        {
          id: '1',
          name: 'John Doe',
          billingEmail: 'john@example.com',
          phone: '555-1234',
          city: 'Boston',
          state: 'MA',
          territory: 'Northeast',
          accountType: 'ACTIVE',
          lastOrderDate: new Date(),
          riskStatus: 'HEALTHY',
        },
      ];

      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.batches.start).mockResolvedValue({
        id: 'batch-1',
      } as any);

      vi.mocked(mailchimp.default.batches.status).mockResolvedValue({
        status: 'finished',
        finished_operations: 1,
        errored_operations: 0,
      } as any);

      const result = await syncCustomersToMailchimp(
        customers as Customer[],
        'list-1'
      );

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip customers without email', async () => {
      const customers: Partial<Customer>[] = [
        {
          id: '1',
          name: 'John Doe',
          billingEmail: null,
        },
      ];

      const result = await syncCustomersToMailchimp(
        customers as Customer[],
        'list-1'
      );

      expect(result.skipped).toBe(1);
      expect(result.success).toBe(0);
    });

    it('should handle batch errors', async () => {
      const customers: Partial<Customer>[] = [
        {
          id: '1',
          name: 'John Doe',
          billingEmail: 'john@example.com',
        },
      ];

      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.batches.start).mockRejectedValue(
        new Error('Batch failed')
      );

      const result = await syncCustomersToMailchimp(
        customers as Customer[],
        'list-1'
      );

      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('createSegment', () => {
    it('should create a Mailchimp segment', async () => {
      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.lists.createSegment).mockResolvedValue({
        id: 123,
      } as any);

      const segmentId = await createSegment(
        'list-1',
        'Test Segment',
        ['email1@example.com', 'email2@example.com']
      );

      expect(segmentId).toBe('123');
      expect(mailchimp.default.lists.createSegment).toHaveBeenCalledWith(
        'list-1',
        expect.objectContaining({
          name: 'Test Segment',
        })
      );
    });

    it('should handle segment creation errors', async () => {
      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.lists.createSegment).mockRejectedValue(
        new Error('API Error')
      );

      await expect(
        createSegment('list-1', 'Test', ['email@example.com'])
      ).rejects.toThrow('Failed to create Mailchimp segment');
    });
  });

  describe('createCampaign', () => {
    it('should create and optionally schedule a campaign', async () => {
      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.campaigns.create).mockResolvedValue({
        id: 'campaign-1',
      } as any);

      vi.mocked(mailchimp.default.campaigns.setContent).mockResolvedValue(
        {} as any
      );

      const campaignId = await createCampaign({
        listId: 'list-1',
        subject: 'Test Campaign',
        fromName: 'Test Company',
        replyTo: 'test@example.com',
        html: '<h1>Test</h1>',
      });

      expect(campaignId).toBe('campaign-1');
      expect(mailchimp.default.campaigns.create).toHaveBeenCalled();
      expect(mailchimp.default.campaigns.setContent).toHaveBeenCalledWith(
        'campaign-1',
        expect.objectContaining({
          html: '<h1>Test</h1>',
        })
      );
    });

    it('should schedule campaign if scheduledAt provided', async () => {
      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.campaigns.create).mockResolvedValue({
        id: 'campaign-1',
      } as any);

      vi.mocked(mailchimp.default.campaigns.setContent).mockResolvedValue(
        {} as any
      );
      vi.mocked(mailchimp.default.campaigns.schedule).mockResolvedValue(
        {} as any
      );

      const scheduledAt = new Date('2025-12-01T10:00:00Z');

      await createCampaign({
        listId: 'list-1',
        subject: 'Test',
        fromName: 'Test',
        replyTo: 'test@example.com',
        html: '<h1>Test</h1>',
        scheduledAt,
      });

      expect(mailchimp.default.campaigns.schedule).toHaveBeenCalledWith(
        'campaign-1',
        expect.objectContaining({
          schedule_time: scheduledAt.toISOString(),
        })
      );
    });
  });

  describe('updateSubscriberStatus', () => {
    it('should update subscriber status', async () => {
      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.lists.setListMember).mockResolvedValue(
        {} as any
      );

      await updateSubscriberStatus('list-1', 'test@example.com', 'unsubscribed');

      expect(mailchimp.default.lists.setListMember).toHaveBeenCalled();
    });
  });

  describe('updateSubscriberTags', () => {
    it('should update subscriber tags', async () => {
      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.lists.getListMember).mockResolvedValue({
        tags: [{ name: 'OldTag' }],
      } as any);

      vi.mocked(
        mailchimp.default.lists.updateListMemberTags
      ).mockResolvedValue({} as any);

      await updateSubscriberTags('list-1', 'test@example.com', [
        'NewTag1',
        'NewTag2',
      ]);

      expect(mailchimp.default.lists.updateListMemberTags).toHaveBeenCalledWith(
        'list-1',
        expect.any(String),
        expect.objectContaining({
          tags: expect.arrayContaining([
            { name: 'OldTag', status: 'inactive' },
            { name: 'NewTag1', status: 'active' },
            { name: 'NewTag2', status: 'active' },
          ]),
        })
      );
    });
  });

  describe('validateMailchimpConnection', () => {
    it('should return true for valid connection', async () => {
      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.ping.get).mockResolvedValue({} as any);

      const isValid = await validateMailchimpConnection();
      expect(isValid).toBe(true);
    });

    it('should return false for invalid connection', async () => {
      const mailchimp = await import('@mailchimp/mailchimp_marketing');
      vi.mocked(mailchimp.default.ping.get).mockRejectedValue(
        new Error('Invalid API key')
      );

      const isValid = await validateMailchimpConnection();
      expect(isValid).toBe(false);
    });
  });
});
