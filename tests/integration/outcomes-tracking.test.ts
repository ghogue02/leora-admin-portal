/**
 * Integration Tests: Call Outcomes Tracking (X/Y/Blank)
 * Tests outcome tracking and analytics for call plans
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/call-plans/[planId]/outcomes/route';
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

describe('Call Outcomes Tracking', () => {
  let testTenantId: string;
  let testUserId: string;
  let testCallPlanId: string;

  beforeEach(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-outcomes',
        name: 'Test Outcomes',
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

  describe('Recording Outcomes', () => {
    it('should record outcome X (met objective)', async () => {
      const account = await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Test Account',
          priority: 1,
          objective: 'Secure 20-case order',
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-1',
            outcome: 'X',
            outcomeNotes: 'Secured 25-case order, exceeded target',
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.outcome.outcome).toBe('X');
      expect(data.outcome.outcomeNotes).toContain('25-case order');
    });

    it('should record outcome Y (progress made)', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-2',
          accountName: 'Growth Account',
          priority: 1,
          objective: 'Discuss new product line',
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-2',
            outcome: 'Y',
            outcomeNotes: 'Interested but needs manager approval',
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.outcome.outcome).toBe('Y');
    });

    it('should allow blank outcome (not completed)', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-3',
          accountName: 'Pending Account',
          priority: 1,
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-3',
            outcome: null, // Blank
            outcomeNotes: 'Did not reach contact',
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.outcome.outcome).toBeNull();
    });

    it('should validate outcome values', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Test Account',
          priority: 1,
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-1',
            outcome: 'Z', // Invalid
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid outcome');
    });

    it('should timestamp outcome recording', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Test Account',
          priority: 1,
        },
      });

      const beforeRecording = new Date();

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-1',
            outcome: 'X',
          }),
        }
      );

      await POST(request, { params: { planId: testCallPlanId } });

      const account = await prisma.callPlanAccount.findFirst({
        where: { accountId: 'account-1' },
      });

      expect(account?.outcomeRecordedAt).toBeDefined();
      expect(account!.outcomeRecordedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeRecording.getTime()
      );
    });

    it('should allow updating outcome', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Test Account',
          priority: 1,
          outcome: 'Y',
          outcomeNotes: 'Initial notes',
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-1',
            outcome: 'X',
            outcomeNotes: 'Updated notes - deal closed',
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.outcome.outcome).toBe('X');
      expect(data.outcome.outcomeNotes).toBe('Updated notes - deal closed');
    });
  });

  describe('Outcomes Analytics', () => {
    beforeEach(async () => {
      // Create accounts with different outcomes
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
            outcome: 'X',
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-3',
            accountName: 'Account 3',
            priority: 3,
            outcome: 'Y',
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-4',
            accountName: 'Account 4',
            priority: 4,
            outcome: 'Y',
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'account-5',
            accountName: 'Account 5',
            priority: 5,
            outcome: null, // Blank
          },
        ],
      });

      await prisma.callPlan.update({
        where: { id: testCallPlanId },
        data: { accountsCount: 5 },
      });
    });

    it('should get outcome summary', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary.totalAccounts).toBe(5);
      expect(data.summary.outcomeX).toBe(2);
      expect(data.summary.outcomeY).toBe(2);
      expect(data.summary.outcomeBlank).toBe(1);
    });

    it('should calculate completion rate', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      // 4 completed out of 5 = 80%
      expect(data.summary.completionRate).toBeCloseTo(80, 1);
    });

    it('should calculate success rate', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      // 2 X outcomes out of 4 completed = 50%
      expect(data.summary.successRate).toBeCloseTo(50, 1);
    });

    it('should provide outcome breakdown percentages', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.summary.percentX).toBeCloseTo(40, 1); // 2/5 = 40%
      expect(data.summary.percentY).toBeCloseTo(40, 1); // 2/5 = 40%
      expect(data.summary.percentBlank).toBeCloseTo(20, 1); // 1/5 = 20%
    });

    it('should list accounts by outcome', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes?groupBy=outcome`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.byOutcome.X).toHaveLength(2);
      expect(data.byOutcome.Y).toHaveLength(2);
      expect(data.byOutcome.blank).toHaveLength(1);
    });
  });

  describe('Outcome Trends', () => {
    it('should track outcome trends over multiple weeks', async () => {
      // Create previous week's plan
      const prevPlan = await prisma.callPlan.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          weekStartDate: new Date('2025-10-13'),
          weekEndDate: new Date('2025-10-19'),
          status: 'completed',
          accountsCount: 5,
        },
      });

      // Previous week outcomes: 3 X, 1 Y, 1 Blank
      await prisma.callPlanAccount.createMany({
        data: [
          {
            tenantId: testTenantId,
            callPlanId: prevPlan.id,
            accountId: 'prev-1',
            accountName: 'Prev 1',
            priority: 1,
            outcome: 'X',
          },
          {
            tenantId: testTenantId,
            callPlanId: prevPlan.id,
            accountId: 'prev-2',
            accountName: 'Prev 2',
            priority: 2,
            outcome: 'X',
          },
          {
            tenantId: testTenantId,
            callPlanId: prevPlan.id,
            accountId: 'prev-3',
            accountName: 'Prev 3',
            priority: 3,
            outcome: 'X',
          },
          {
            tenantId: testTenantId,
            callPlanId: prevPlan.id,
            accountId: 'prev-4',
            accountName: 'Prev 4',
            priority: 4,
            outcome: 'Y',
          },
          {
            tenantId: testTenantId,
            callPlanId: prevPlan.id,
            accountId: 'prev-5',
            accountName: 'Prev 5',
            priority: 5,
            outcome: null,
          },
        ],
      });

      // Current week: 2 X, 2 Y, 1 Blank (from beforeEach)
      await prisma.callPlanAccount.createMany({
        data: [
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'curr-1',
            accountName: 'Curr 1',
            priority: 1,
            outcome: 'X',
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'curr-2',
            accountName: 'Curr 2',
            priority: 2,
            outcome: 'X',
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'curr-3',
            accountName: 'Curr 3',
            priority: 3,
            outcome: 'Y',
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'curr-4',
            accountName: 'Curr 4',
            priority: 4,
            outcome: 'Y',
          },
          {
            tenantId: testTenantId,
            callPlanId: testCallPlanId,
            accountId: 'curr-5',
            accountName: 'Curr 5',
            priority: 5,
            outcome: null,
          },
        ],
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes?includeTrends=true`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.trends).toBeDefined();
      expect(data.trends.previousWeek.successRate).toBeCloseTo(75, 1); // 3/4 = 75%
      expect(data.trends.currentWeek.successRate).toBeCloseTo(50, 1); // 2/4 = 50%
      expect(data.trends.change).toBeDefined();
    });
  });

  describe('Outcome Notes', () => {
    it('should support rich text in outcome notes', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Test Account',
          priority: 1,
        },
      });

      const richNotes = `Customer very excited about new products.
Key points:
- Interested in seasonal promotion
- Wants to increase order size
- Needs delivery by Nov 1st

Follow-up required next week.`;

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-1',
            outcome: 'X',
            outcomeNotes: richNotes,
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.outcome.outcomeNotes).toBe(richNotes);
    });

    it('should enforce max length for outcome notes', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'Test Account',
          priority: 1,
        },
      });

      const longNotes = 'A'.repeat(2000); // Exceeds limit

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/outcomes`,
        {
          method: 'POST',
          body: JSON.stringify({
            accountId: 'account-1',
            outcome: 'X',
            outcomeNotes: longNotes,
          }),
        }
      );

      const response = await POST(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('too long');
    });
  });
});
