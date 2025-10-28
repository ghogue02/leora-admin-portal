/**
 * Integration Tests: Bulk Customer Categorization
 * Tests bulk operations for categorizing customers in call plans
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/customers/bulk-categorize/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

vi.mock('@/lib/auth/sales', () => ({
  withSalesSession: (request: NextRequest, callback: Function) => {
    const mockContext = {
      tenantId: 'test-tenant-id',
      session: { user: { id: 'test-user-id', email: 'sales@test.com' } },
      db: prisma,
    };
    return callback(mockContext);
  },
}));

describe('Bulk Customer Categorization', () => {
  let testTenantId: string;
  let testUserId: string;
  let accountIds: string[] = [];

  beforeEach(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-bulk-categorize',
        name: 'Test Bulk Categorize',
        industry: 'test',
      },
    });
    testTenantId = tenant.id;

    const user = await prisma.salesUser.create({
      data: {
        tenantId: testTenantId,
        email: 'sales@test.com',
        fullName: 'Test Sales Rep',
        passwordHash: 'hashed',
      },
    });
    testUserId = user.id;

    // Create test accounts
    const accounts = await Promise.all(
      Array.from({ length: 20 }, async (_, i) => {
        return await prisma.account.create({
          data: {
            tenantId: testTenantId,
            name: `Account ${i + 1}`,
            type: 'on_premise',
            region: 'North',
            accountTier: 'standard',
          },
        });
      })
    );

    accountIds = accounts.map((a) => a.id);

    vi.mocked(require('@/lib/auth/sales').withSalesSession).mockImplementation(
      (request: NextRequest, callback: Function) => {
        const mockContext = {
          tenantId: testTenantId,
          session: { user: { id: testUserId, email: 'sales@test.com' } },
          db: prisma,
        };
        return callback(mockContext);
      }
    );
  });

  afterEach(async () => {
    await prisma.account.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.salesUser.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  describe('POST /api/customers/bulk-categorize', () => {
    it('should categorize multiple customers as high-value', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 5),
          category: 'high_value',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.updatedCount).toBe(5);

      // Verify updates
      const updated = await prisma.account.findMany({
        where: {
          id: { in: accountIds.slice(0, 5) },
        },
      });

      updated.forEach((account) => {
        expect(account.accountTier).toBe('high_value');
      });
    });

    it('should categorize customers as growth', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(5, 10),
          category: 'growth',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.updatedCount).toBe(5);

      const updated = await prisma.account.findMany({
        where: { id: { in: accountIds.slice(5, 10) } },
      });

      updated.forEach((account) => {
        expect(account.accountTier).toBe('growth');
      });
    });

    it('should categorize customers as at-risk', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(10, 15),
          category: 'at_risk',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.updatedCount).toBe(5);

      const updated = await prisma.account.findMany({
        where: { id: { in: accountIds.slice(10, 15) } },
      });

      updated.forEach((account) => {
        expect(account.accountTier).toBe('at_risk');
      });
    });

    it('should handle empty account list', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: [],
          category: 'high_value',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('No accounts provided');
    });

    it('should validate category value', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 5),
          category: 'invalid_category',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid category');
    });

    it('should enforce maximum batch size of 100', async () => {
      // Create 101 accounts
      const manyAccountIds = [...accountIds];
      const additionalAccounts = await Promise.all(
        Array.from({ length: 81 }, async (_, i) => {
          return await prisma.account.create({
            data: {
              tenantId: testTenantId,
              name: `Extra Account ${i}`,
              type: 'on_premise',
              region: 'North',
            },
          });
        })
      );

      manyAccountIds.push(...additionalAccounts.map((a) => a.id));

      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: manyAccountIds,
          category: 'high_value',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Maximum 100 accounts');
    });

    it('should track categorization history', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 3),
          category: 'high_value',
          trackHistory: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.updatedCount).toBe(3);
      expect(data.historyRecorded).toBe(true);
    });

    it('should add categorization notes', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 5),
          category: 'high_value',
          notes: 'Q4 high performers',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.updatedCount).toBe(5);

      // Verify notes were added
      const updated = await prisma.account.findMany({
        where: { id: { in: accountIds.slice(0, 5) } },
      });

      updated.forEach((account) => {
        expect(account.notes).toContain('Q4 high performers');
      });
    });

    it('should filter by current category before updating', async () => {
      // Set some accounts to high_value
      await prisma.account.updateMany({
        where: { id: { in: accountIds.slice(0, 5) } },
        data: { accountTier: 'high_value' },
      });

      // Only update standard accounts
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 10),
          category: 'growth',
          currentCategory: 'standard',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should only update the 5 standard accounts
      expect(data.updatedCount).toBe(5);
    });

    it('should return list of updated account IDs', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 3),
          category: 'high_value',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.updatedAccountIds).toHaveLength(3);
      expect(data.updatedAccountIds).toEqual(accountIds.slice(0, 3));
    });

    it('should handle partial failures gracefully', async () => {
      // Include some invalid account IDs
      const mixedIds = [...accountIds.slice(0, 3), 'invalid-id-1', 'invalid-id-2'];

      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: mixedIds,
          category: 'high_value',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.updatedCount).toBe(3); // Only valid accounts updated
      expect(data.failedCount).toBe(2);
      expect(data.errors).toHaveLength(2);
    });

    it('should update timestamps', async () => {
      const beforeUpdate = new Date();

      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 5),
          category: 'high_value',
        }),
      });

      await POST(request);

      const updated = await prisma.account.findMany({
        where: { id: { in: accountIds.slice(0, 5) } },
      });

      updated.forEach((account) => {
        expect(account.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      });
    });

    it('should support dry-run mode', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 5),
          category: 'high_value',
          dryRun: true,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.wouldUpdateCount).toBe(5);
      expect(data.dryRun).toBe(true);

      // Verify no actual updates
      const accounts = await prisma.account.findMany({
        where: { id: { in: accountIds.slice(0, 5) } },
      });

      accounts.forEach((account) => {
        expect(account.accountTier).not.toBe('high_value');
      });
    });
  });

  describe('Categorization Rules', () => {
    it('should apply revenue-based categorization rules', async () => {
      // Set revenue for accounts
      await Promise.all(
        accountIds.slice(0, 5).map((id, i) =>
          prisma.account.update({
            where: { id },
            data: {
              lastOrderAmount: (i + 1) * 10000, // $10k to $50k
            },
          })
        )
      );

      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 5),
          categorizeBy: 'revenue',
          rules: {
            high_value: { minRevenue: 40000 },
            growth: { minRevenue: 20000, maxRevenue: 39999 },
            standard: { maxRevenue: 19999 },
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.updatedCount).toBe(5);
      expect(data.categoryCounts).toEqual({
        high_value: 2, // $40k and $50k
        growth: 2, // $20k and $30k
        standard: 1, // $10k
      });
    });

    it('should apply activity-based categorization rules', async () => {
      const request = new NextRequest('http://localhost/api/customers/bulk-categorize', {
        method: 'POST',
        body: JSON.stringify({
          accountIds: accountIds.slice(0, 10),
          categorizeBy: 'activity',
          rules: {
            at_risk: { daysSinceLastOrder: 90 },
            growth: { daysSinceLastOrder: 30 },
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.categoryCounts).toBeDefined();
    });
  });
});
