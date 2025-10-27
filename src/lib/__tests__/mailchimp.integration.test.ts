import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mailchimp from '@mailchimp/mailchimp_marketing';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Mock implementations
vi.mock('@mailchimp/mailchimp_marketing');
vi.mock('@supabase/supabase-js');

describe('Mailchimp Integration Tests', () => {
  let supabase: ReturnType<typeof createClient<Database>>;
  const mockListId = 'list123';

  beforeEach(() => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Setup Mailchimp mock
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY!,
      server: 'us1'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Customer Sync', () => {
    it('should sync single customer to Mailchimp', async () => {
      const customer = {
        id: 'cust_1',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        company: 'Wine Shop Inc',
        status: 'ACTIVE'
      };

      vi.mocked(mailchimp.lists.addListMember).mockResolvedValue({
        id: 'member_1',
        email_address: customer.email,
        status: 'subscribed'
      } as any);

      const result = await syncCustomerToMailchimp(customer, mockListId);

      expect(result.success).toBe(true);
      expect(mailchimp.lists.addListMember).toHaveBeenCalledWith(
        mockListId,
        expect.objectContaining({
          email_address: customer.email,
          status: 'subscribed',
          merge_fields: {
            FNAME: customer.first_name,
            LNAME: customer.last_name,
            COMPANY: customer.company
          }
        })
      );
    });

    it('should batch sync 100+ customers efficiently', async () => {
      const customers = Array.from({ length: 150 }, (_, i) => ({
        id: `cust_${i}`,
        email: `customer${i}@example.com`,
        first_name: `Customer`,
        last_name: `${i}`,
        status: 'ACTIVE'
      }));

      vi.mocked(mailchimp.lists.batchListMembers).mockResolvedValue({
        new_members: customers.map(c => ({ email_address: c.email })),
        updated_members: [],
        errors: []
      } as any);

      const start = Date.now();
      const result = await batchSyncCustomers(customers, mockListId);
      const duration = Date.now() - start;

      expect(result.synced).toBe(150);
      expect(result.errors).toHaveLength(0);
      expect(duration).toBeLessThan(30000); // <30s for 150 customers
    });

    it('should handle duplicate email gracefully', async () => {
      const customer = {
        email: 'existing@example.com',
        first_name: 'Existing',
        last_name: 'User'
      };

      const error = new Error('Member Exists');
      (error as any).status = 400;
      (error as any).title = 'Member Exists';

      vi.mocked(mailchimp.lists.addListMember).mockRejectedValue(error);

      // Should update instead of failing
      vi.mocked(mailchimp.lists.updateListMember).mockResolvedValue({
        email_address: customer.email
      } as any);

      const result = await syncCustomerToMailchimp(customer as any, mockListId);

      expect(result.success).toBe(true);
      expect(mailchimp.lists.updateListMember).toHaveBeenCalled();
    });
  });

  describe('Segment Creation', () => {
    it('should create segment for ACTIVE customers', async () => {
      vi.mocked(mailchimp.lists.createSegment).mockResolvedValue({
        id: 123,
        name: 'Active Customers',
        member_count: 50
      } as any);

      const segment = await createSegment(mockListId, {
        name: 'Active Customers',
        status: 'ACTIVE'
      });

      expect(segment.id).toBe(123);
      expect(mailchimp.lists.createSegment).toHaveBeenCalledWith(
        mockListId,
        expect.objectContaining({
          name: 'Active Customers',
          options: expect.objectContaining({
            conditions: expect.arrayContaining([
              expect.objectContaining({
                field: 'status',
                op: 'is',
                value: 'ACTIVE'
              })
            ])
          })
        })
      );
    });

    it('should create segment for PROSPECT customers', async () => {
      vi.mocked(mailchimp.lists.createSegment).mockResolvedValue({
        id: 124,
        name: 'Prospects',
        member_count: 25
      } as any);

      const segment = await createSegment(mockListId, {
        name: 'Prospects',
        status: 'PROSPECT'
      });

      expect(segment.name).toBe('Prospects');
    });

    it('should create geographic segment', async () => {
      vi.mocked(mailchimp.lists.createSegment).mockResolvedValue({
        id: 125,
        name: 'SF Bay Area',
        member_count: 30
      } as any);

      const segment = await createSegment(mockListId, {
        name: 'SF Bay Area',
        location: {
          state: 'CA',
          cities: ['San Francisco', 'Oakland', 'Berkeley']
        }
      });

      expect(segment.member_count).toBe(30);
    });
  });

  describe('Campaign Creation', () => {
    it('should create and configure email campaign', async () => {
      const campaignConfig = {
        subject: 'New Wine Arrivals',
        previewText: 'Check out our latest selections',
        fromName: 'Wine Shop',
        replyTo: 'sales@wineshop.com',
        listId: mockListId,
        segmentId: 123
      };

      vi.mocked(mailchimp.campaigns.create).mockResolvedValue({
        id: 'campaign_1',
        web_id: 12345,
        status: 'save'
      } as any);

      const campaign = await createCampaign(campaignConfig);

      expect(campaign.id).toBe('campaign_1');
      expect(mailchimp.campaigns.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'regular',
          recipients: {
            list_id: mockListId,
            segment_opts: {
              saved_segment_id: 123
            }
          },
          settings: {
            subject_line: campaignConfig.subject,
            preview_text: campaignConfig.previewText,
            from_name: campaignConfig.fromName,
            reply_to: campaignConfig.replyTo
          }
        })
      );
    });

    it('should set campaign content with product features', async () => {
      const products = [
        { name: 'Chardonnay 2022', price: 24.99 },
        { name: 'Pinot Noir 2021', price: 32.99 }
      ];

      vi.mocked(mailchimp.campaigns.setContent).mockResolvedValue({} as any);

      await setCampaignContent('campaign_1', {
        products,
        template: 'product-showcase'
      });

      expect(mailchimp.campaigns.setContent).toHaveBeenCalledWith(
        'campaign_1',
        expect.objectContaining({
          html: expect.stringContaining('Chardonnay 2022')
        })
      );
    });

    it('should send campaign to segment', async () => {
      vi.mocked(mailchimp.campaigns.send).mockResolvedValue({} as any);

      const result = await sendCampaign('campaign_1');

      expect(result.success).toBe(true);
      expect(mailchimp.campaigns.send).toHaveBeenCalledWith('campaign_1');
    });

    it('should schedule campaign for future send', async () => {
      const scheduleTime = new Date(Date.now() + 86400000); // Tomorrow

      vi.mocked(mailchimp.campaigns.schedule).mockResolvedValue({} as any);

      await scheduleCampaign('campaign_1', scheduleTime);

      expect(mailchimp.campaigns.schedule).toHaveBeenCalledWith(
        'campaign_1',
        expect.objectContaining({
          schedule_time: scheduleTime.toISOString()
        })
      );
    });
  });

  describe('Tag Management', () => {
    it('should add tags to customer', async () => {
      vi.mocked(mailchimp.lists.updateListMemberTags).mockResolvedValue({} as any);

      await addTags(mockListId, 'test@example.com', ['VIP', 'Wine Enthusiast']);

      expect(mailchimp.lists.updateListMemberTags).toHaveBeenCalledWith(
        mockListId,
        expect.any(String), // MD5 hash of email
        {
          tags: [
            { name: 'VIP', status: 'active' },
            { name: 'Wine Enthusiast', status: 'active' }
          ]
        }
      );
    });

    it('should remove tags from customer', async () => {
      vi.mocked(mailchimp.lists.updateListMemberTags).mockResolvedValue({} as any);

      await removeTags(mockListId, 'test@example.com', ['Inactive']);

      expect(mailchimp.lists.updateListMemberTags).toHaveBeenCalledWith(
        mockListId,
        expect.any(String),
        {
          tags: [
            { name: 'Inactive', status: 'inactive' }
          ]
        }
      );
    });
  });

  describe('Opt-Out Handling', () => {
    it('should unsubscribe customer on opt-out', async () => {
      vi.mocked(mailchimp.lists.updateListMember).mockResolvedValue({
        status: 'unsubscribed'
      } as any);

      const result = await unsubscribeCustomer(mockListId, 'optout@example.com');

      expect(result.status).toBe('unsubscribed');
      expect(mailchimp.lists.updateListMember).toHaveBeenCalledWith(
        mockListId,
        expect.any(String),
        { status: 'unsubscribed' }
      );
    });

    it('should sync opt-out status to database', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null })
      } as any);

      await syncOptOutStatus('optout@example.com', true);

      expect(supabase.from).toHaveBeenCalledWith('customers');
    });

    it('should respect GDPR right to be forgotten', async () => {
      vi.mocked(mailchimp.lists.deleteListMemberPermanent).mockResolvedValue({} as any);

      await deleteCustomerPermanently(mockListId, 'forget@example.com');

      expect(mailchimp.lists.deleteListMemberPermanent).toHaveBeenCalledWith(
        mockListId,
        expect.any(String)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle Mailchimp API timeout', async () => {
      vi.mocked(mailchimp.lists.addListMember).mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      await expect(
        syncCustomerToMailchimp({ email: 'test@example.com' } as any, mockListId)
      ).rejects.toThrow('Timeout');
    });

    it('should handle rate limiting', async () => {
      const error = new Error('Rate limit exceeded');
      (error as any).status = 429;

      vi.mocked(mailchimp.lists.addListMember).mockRejectedValue(error);

      await expect(
        syncCustomerToMailchimp({ email: 'test@example.com' } as any, mockListId)
      ).rejects.toThrow('Rate limit');
    });

    it('should handle invalid API key', async () => {
      const error = new Error('Invalid API key');
      (error as any).status = 401;

      vi.mocked(mailchimp.lists.getLists).mockRejectedValue(error);

      await expect(validateMailchimpConnection()).rejects.toThrow('Invalid API key');
    });

    it('should handle list not found', async () => {
      const error = new Error('Resource Not Found');
      (error as any).status = 404;

      vi.mocked(mailchimp.lists.getList).mockRejectedValue(error);

      await expect(getListInfo('invalid_list')).rejects.toThrow('Resource Not Found');
    });
  });

  describe('Performance', () => {
    it('should sync 100 customers in under 30 seconds', async () => {
      const customers = Array.from({ length: 100 }, (_, i) => ({
        id: `cust_${i}`,
        email: `customer${i}@example.com`
      }));

      vi.mocked(mailchimp.lists.batchListMembers).mockResolvedValue({
        new_members: customers.map(c => ({ email_address: c.email })),
        errors: []
      } as any);

      const start = Date.now();
      await batchSyncCustomers(customers as any[], mockListId);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(30000);
    });

    it('should handle concurrent campaign operations', async () => {
      const operations = [
        createCampaign({ subject: 'Campaign 1' } as any),
        createCampaign({ subject: 'Campaign 2' } as any),
        createCampaign({ subject: 'Campaign 3' } as any)
      ];

      vi.mocked(mailchimp.campaigns.create).mockResolvedValue({
        id: 'campaign_test'
      } as any);

      const results = await Promise.all(operations);

      expect(results).toHaveLength(3);
    });
  });
});

// Helper functions (would be imported from actual implementation)
async function syncCustomerToMailchimp(customer: any, listId: string): Promise<any> {
  throw new Error('Not implemented');
}

async function batchSyncCustomers(customers: any[], listId: string): Promise<any> {
  throw new Error('Not implemented');
}

async function createSegment(listId: string, options: any): Promise<any> {
  throw new Error('Not implemented');
}

async function createCampaign(config: any): Promise<any> {
  throw new Error('Not implemented');
}

async function setCampaignContent(campaignId: string, content: any): Promise<void> {
  throw new Error('Not implemented');
}

async function sendCampaign(campaignId: string): Promise<any> {
  throw new Error('Not implemented');
}

async function scheduleCampaign(campaignId: string, time: Date): Promise<void> {
  throw new Error('Not implemented');
}

async function addTags(listId: string, email: string, tags: string[]): Promise<void> {
  throw new Error('Not implemented');
}

async function removeTags(listId: string, email: string, tags: string[]): Promise<void> {
  throw new Error('Not implemented');
}

async function unsubscribeCustomer(listId: string, email: string): Promise<any> {
  throw new Error('Not implemented');
}

async function syncOptOutStatus(email: string, optedOut: boolean): Promise<void> {
  throw new Error('Not implemented');
}

async function deleteCustomerPermanently(listId: string, email: string): Promise<void> {
  throw new Error('Not implemented');
}

async function validateMailchimpConnection(): Promise<boolean> {
  throw new Error('Not implemented');
}

async function getListInfo(listId: string): Promise<any> {
  throw new Error('Not implemented');
}
