/**
 * Integration Tests: Call Plan Accounts API Routes
 * Tests account management for weekly call plans with 75-account limit
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/call-plans/[planId]/accounts/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock authentication
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

describe('Call Plan Accounts API Routes', () => {
  let testTenantId: string;
  let testUserId: string;
  let testCallPlanId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-call-plan-accounts',
        name: 'Test Call Plan Accounts',
        industry: 'test',
      },
    });
    testTenantId = tenant.id;

    // Create test sales user
    const user = await prisma.salesUser.create({
      data: {
        tenantId: testTenantId,
        email: 'sales@test.com',
        fullName: 'Test Sales Rep',
        passwordHash: 'hashed',
      },
    });
    testUserId = user.id;

    // Create test call plan
    const plan = await prisma.callPlan.create({
      data: {
        tenantId: testTenantId,
        userId: testUserId,
        weekStartDate: new Date('2025-10-20'),
        weekEndDate: new Date('2025-10-26'),
        status: 'active',
        accountsCount: 0,
      },
    });
    testCallPlanId = plan.id;

    // Override mock
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
    await prisma.callPlanAccount.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.callPlan.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.salesUser.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  describe('GET /api/call-plans/[planId]/accounts', () => {
    it('should return empty array when no accounts in plan', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.accounts).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return accounts ordered by priority', async () => {
      await prisma.callPlanAccount.createMany({
        data: [
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-1',
            accountName: 'Account 1',
            priority: 3,
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-2',
            accountName: 'Account 2',
            priority: 1,
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-3',
            accountName: 'Account 3',
            priority: 2,
          },
        ],
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.accounts).toHaveLength(3);
      expect(data.accounts[0].priority).toBe(1);
      expect(data.accounts[1].priority).toBe(2);
      expect(data.accounts[2].priority).toBe(3);
    });

    it('should include account objectives', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'High Value Account',
          priority: 1,
          objective: 'Discuss Q4 promotion and secure 20-case order',
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.accounts[0].objective).toBe(
        'Discuss Q4 promotion and secure 20-case order'
      );
    });

    it('should include outcome tracking (X/Y/Blank)', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Account 1',
          priority: 1,
          outcome: 'X', // Met objective
          outcomeNotes: 'Secured 25-case order, above target',
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.accounts[0].outcome).toBe('X');
      expect(data.accounts[0].outcomeNotes).toBe('Secured 25-case order, above target');
    });

    it('should filter accounts by outcome', async () => {
      await prisma.callPlanAccount.createMany({
        data: [
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-1',
            accountName: 'Account 1',
            priority: 1,
            outcome: 'X',
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-2',
            accountName: 'Account 2',
            priority: 2,
            outcome: 'Y',
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-3',
            accountName: 'Account 3',
            priority: 3,
            outcome: null, // Blank
          },
        ],
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts?outcome=X`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.accounts).toHaveLength(1);
      expect(data.accounts[0].outcome).toBe('X');
    });
  });

  describe('POST /api/call-plans/[planId]/accounts', () => {
    it('should add account to call plan', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-1',
            accountName: 'Test Account',
            priority: 1,
            objective: 'Discuss new products',
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.account.accountId).toBe('account-1');
      expect(data.account.objective).toBe('Discuss new products');

      // Verify plan count updated
      const plan = await prisma.callPlan.findUnique({
        where: { id: testCallPlanId },
      });
      expect(plan?.accountsCount).toBe(1);
    });

    it('should enforce 75 account limit per week', async () => {
      // Add 75 accounts
      const accounts = Array.from({ length: 75 }, (_, i) => ({
        tenantId: testTenantId,
        callPlanId: testCallPlanId,
        accountId: `account-${i}`,
        accountName: `Account ${i}`,
        priority: i + 1,
      }));

      await prisma.callPlanAccount.createMany({ data: accounts });
      await prisma.callPlan.update({
        where: { id: testCallPlanId },
        data: { accountsCount: 75 },
      });

      // Try to add 76th account
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-76',
            accountName: 'Account 76',
            priority: 76,
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Maximum 75 accounts');
    });

    it('should prevent duplicate accounts in same plan', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Account 1',
          priority: 1,
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-1',
            accountName: 'Account 1',
            priority: 2,
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already in call plan');
    });

    it('should auto-assign priority if not provided', async () => {
      // Add 3 accounts
      await prisma.callPlanAccount.createMany({
        data: [
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-1',
            accountName: 'Account 1',
            priority: 1,
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-2',
            accountName: 'Account 2',
            priority: 2,
          },
        ],
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-3',
            accountName: 'Account 3',
            // No priority provided
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.account.priority).toBe(3); // Auto-assigned
    });
  });

  describe('PUT /api/call-plans/[planId]/accounts', () => {
    it('should update account objective', async () => {
      const account = await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Account 1',
          priority: 1,
          objective: 'Original objective',
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`,
        {
          method: 'PUT',
          body: JSON.stringify({
            accountId: 'account-1',
            objective: 'Updated objective',
          }),
        }
      );

      const response = await PUT(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.account.objective).toBe('Updated objective');
    });

    it('should record outcome (X/Y/Blank)', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Account 1',
          priority: 1,
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`,
        {
          method: 'PUT',
          body: JSON.stringify({
            accountId: 'account-1',
            outcome: 'X',
            outcomeNotes: 'Exceeded target with 30-case order',
          }),
        }
      );

      const response = await PUT(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.account.outcome).toBe('X');
      expect(data.account.outcomeNotes).toBe('Exceeded target with 30-case order');
    });

    it('should validate outcome values', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Account 1',
          priority: 1,
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`,
        {
          method: 'PUT',
          body: JSON.stringify({
            accountId: 'account-1',
            outcome: 'Z', // Invalid
          }),
        }
      );

      const response = await PUT(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid outcome');
    });

    it('should update priority', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Account 1',
          priority: 5,
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts`,
        {
          method: 'PUT',
          body: JSON.stringify({
            accountId: 'account-1',
            priority: 1,
          }),
        }
      );

      const response = await PUT(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.account.priority).toBe(1);
    });
  });

  describe('DELETE /api/call-plans/[planId]/accounts', () => {
    it('should remove account from call plan', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Account 1',
          priority: 1,
        },
      });

      await prisma.callPlan.update({
        where: { id: testCallPlanId },
        data: { accountsCount: 1 },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts?accountId=account-1`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify plan count updated
      const plan = await prisma.callPlan.findUnique({
        where: { id: testCallPlanId },
      });
      expect(plan?.accountsCount).toBe(0);
    });

    it('should return 404 for non-existent account', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts?accountId=nonexistent`,
        { method: 'DELETE' }
      );

      const response = await DELETE(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('Bulk Operations', () => {
    it('should add multiple accounts at once', async () => {
      const accounts = [
        { accountId: 'account-1', accountName: 'Account 1', priority: 1 },
        { accountId: 'account-2', accountName: 'Account 2', priority: 2 },
        { accountId: 'account-3', accountName: 'Account 3', priority: 3 },
      ];

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts/bulk`,
        {
          method: 'POST',
          body: JSON.stringify({ accounts }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.addedCount).toBe(3);

      const plan = await prisma.callPlan.findUnique({
        where: { id: testCallPlanId },
      });
      expect(plan?.accountsCount).toBe(3);
    });

    it('should enforce 75 limit in bulk operations', async () => {
      const accounts = Array.from({ length: 80 }, (_, i) => ({
        accountId: `account-${i}`,
        accountName: `Account ${i}`,
        priority: i + 1,
      }));

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/accounts/bulk`,
        {
          method: 'POST',
          body: JSON.stringify({ accounts }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Maximum 75 accounts');
    });
  });
});
