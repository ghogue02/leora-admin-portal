/**
 * Integration Tests: Call Plans API Routes
 * Tests CRUD operations for weekly call planning
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/call-plans/route';
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

describe('Call Plans API Routes', () => {
  let testTenantId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-call-plans',
        name: 'Test Call Plans Tenant',
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

    // Override mock to use real IDs
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
    // Cleanup: Delete test data in correct order
    await prisma.callPlanAccount.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.callPlan.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.salesUser.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  describe('GET /api/call-plans', () => {
    it('should return empty array when no call plans exist', async () => {
      const request = new NextRequest('http://localhost/api/call-plans');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.callPlans).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return call plans for current user', async () => {
      // Create test call plan
      await prisma.callPlan.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          weekStartDate: new Date('2025-10-20'),
          weekEndDate: new Date('2025-10-26'),
          status: 'active',
          accountsCount: 0,
        },
      });

      const request = new NextRequest('http://localhost/api/call-plans');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.callPlans).toHaveLength(1);
      expect(data.callPlans[0].status).toBe('active');
      expect(data.total).toBe(1);
    });

    it('should filter call plans by week', async () => {
      // Create call plans for different weeks
      await prisma.callPlan.createMany({
        data: [
          {
            tenantId: testTenantId,
            userId: testUserId,
            weekStartDate: new Date('2025-10-20'),
            weekEndDate: new Date('2025-10-26'),
            status: 'active',
            accountsCount: 5,
          },
          {
            tenantId: testTenantId,
            userId: testUserId,
            weekStartDate: new Date('2025-10-13'),
            weekEndDate: new Date('2025-10-19'),
            status: 'completed',
            accountsCount: 10,
          },
        ],
      });

      const request = new NextRequest(
        'http://localhost/api/call-plans?weekStart=2025-10-20'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.callPlans).toHaveLength(1);
      expect(data.callPlans[0].accountsCount).toBe(5);
    });

    it('should filter call plans by status', async () => {
      await prisma.callPlan.createMany({
        data: [
          {
            tenantId: testTenantId,
            userId: testUserId,
            weekStartDate: new Date('2025-10-20'),
            weekEndDate: new Date('2025-10-26'),
            status: 'active',
            accountsCount: 5,
          },
          {
            tenantId: testTenantId,
            userId: testUserId,
            weekStartDate: new Date('2025-10-13'),
            weekEndDate: new Date('2025-10-19'),
            status: 'completed',
            accountsCount: 10,
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/call-plans?status=active');
      const response = await GET(request);
      const data = await response.json();

      expect(data.callPlans).toHaveLength(1);
      expect(data.callPlans[0].status).toBe('active');
    });

    it('should paginate results', async () => {
      // Create 15 call plans
      const plans = Array.from({ length: 15 }, (_, i) => ({
        tenantId: testTenantId,
        userId: testUserId,
        weekStartDate: new Date(`2025-${String(i + 1).padStart(2, '0')}-01`),
        weekEndDate: new Date(`2025-${String(i + 1).padStart(2, '0')}-07`),
        status: 'active',
        accountsCount: i,
      }));

      await prisma.callPlan.createMany({ data: plans });

      const request = new NextRequest('http://localhost/api/call-plans?limit=10&offset=0');
      const response = await GET(request);
      const data = await response.json();

      expect(data.callPlans).toHaveLength(10);
      expect(data.total).toBe(15);
      expect(data.hasMore).toBe(true);
    });

    it('should include accounts count in response', async () => {
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

      // Add accounts to plan
      await prisma.callPlanAccount.createMany({
        data: [
          {
            tenantId: testTenantId,
            callPlanId: plan.id,
            accountId: 'account-1',
            accountName: 'Test Account 1',
            priority: 1,
          },
          {
            tenantId: testTenantId,
            callPlanId: plan.id,
            accountId: 'account-2',
            accountName: 'Test Account 2',
            priority: 2,
          },
        ],
      });

      // Update count
      await prisma.callPlan.update({
        where: { id: plan.id },
        data: { accountsCount: 2 },
      });

      const request = new NextRequest('http://localhost/api/call-plans');
      const response = await GET(request);
      const data = await response.json();

      expect(data.callPlans[0].accountsCount).toBe(2);
    });
  });

  describe('POST /api/call-plans', () => {
    it('should create new call plan for current week', async () => {
      const request = new NextRequest('http://localhost/api/call-plans', {
        method: 'POST',
        body: JSON.stringify({
          weekStartDate: '2025-10-20',
          weekEndDate: '2025-10-26',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.callPlan.status).toBe('active');
      expect(data.callPlan.accountsCount).toBe(0);
      expect(new Date(data.callPlan.weekStartDate)).toEqual(new Date('2025-10-20'));
    });

    it('should prevent duplicate call plans for same week', async () => {
      // Create first plan
      await prisma.callPlan.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          weekStartDate: new Date('2025-10-20'),
          weekEndDate: new Date('2025-10-26'),
          status: 'active',
          accountsCount: 0,
        },
      });

      // Try to create duplicate
      const request = new NextRequest('http://localhost/api/call-plans', {
        method: 'POST',
        body: JSON.stringify({
          weekStartDate: '2025-10-20',
          weekEndDate: '2025-10-26',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('Call plan already exists');
    });

    it('should validate week date range', async () => {
      const request = new NextRequest('http://localhost/api/call-plans', {
        method: 'POST',
        body: JSON.stringify({
          weekStartDate: '2025-10-26',
          weekEndDate: '2025-10-20', // End before start
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid date range');
    });

    it('should create plan with optional notes', async () => {
      const notes = 'Focus on high-value accounts this week';

      const request = new NextRequest('http://localhost/api/call-plans', {
        method: 'POST',
        body: JSON.stringify({
          weekStartDate: '2025-10-20',
          weekEndDate: '2025-10-26',
          notes,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.callPlan.notes).toBe(notes);
    });

    it('should create plan with target accounts count', async () => {
      const request = new NextRequest('http://localhost/api/call-plans', {
        method: 'POST',
        body: JSON.stringify({
          weekStartDate: '2025-10-20',
          weekEndDate: '2025-10-26',
          targetAccountsCount: 50,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.callPlan.targetAccountsCount).toBe(50);
    });

    it('should enforce maximum 75 accounts per week', async () => {
      const request = new NextRequest('http://localhost/api/call-plans', {
        method: 'POST',
        body: JSON.stringify({
          weekStartDate: '2025-10-20',
          weekEndDate: '2025-10-26',
          targetAccountsCount: 100, // Exceeds limit
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Maximum 75 accounts');
    });

    it('should include timestamps in response', async () => {
      const request = new NextRequest('http://localhost/api/call-plans', {
        method: 'POST',
        body: JSON.stringify({
          weekStartDate: '2025-10-20',
          weekEndDate: '2025-10-26',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.callPlan.createdAt).toBeDefined();
      expect(data.callPlan.updatedAt).toBeDefined();
      expect(new Date(data.callPlan.createdAt)).toBeInstanceOf(Date);
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/call-plans', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON body');
    });
  });

  describe('Call Plan Status Management', () => {
    it('should allow updating plan status to completed', async () => {
      const plan = await prisma.callPlan.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          weekStartDate: new Date('2025-10-20'),
          weekEndDate: new Date('2025-10-26'),
          status: 'active',
          accountsCount: 10,
        },
      });

      const updated = await prisma.callPlan.update({
        where: { id: plan.id },
        data: { status: 'completed' },
      });

      expect(updated.status).toBe('completed');
    });

    it('should track completion date when marked complete', async () => {
      const plan = await prisma.callPlan.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          weekStartDate: new Date('2025-10-20'),
          weekEndDate: new Date('2025-10-26'),
          status: 'active',
          accountsCount: 10,
        },
      });

      const completionDate = new Date();
      const updated = await prisma.callPlan.update({
        where: { id: plan.id },
        data: {
          status: 'completed',
          completedAt: completionDate,
        },
      });

      expect(updated.completedAt).toEqual(completionDate);
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should isolate call plans by user', async () => {
      // Create second user
      const user2 = await prisma.salesUser.create({
        data: {
          tenantId: testTenantId,
          email: 'sales2@test.com',
          fullName: 'Test Sales 2',
          passwordHash: 'hashed',
        },
      });

      // Create plans for both users
      await prisma.callPlan.createMany({
        data: [
          {
            tenantId: testTenantId,
            userId: testUserId,
            weekStartDate: new Date('2025-10-20'),
            weekEndDate: new Date('2025-10-26'),
            status: 'active',
            accountsCount: 5,
          },
          {
            tenantId: testTenantId,
            userId: user2.id,
            weekStartDate: new Date('2025-10-20'),
            weekEndDate: new Date('2025-10-26'),
            status: 'active',
            accountsCount: 10,
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/call-plans');
      const response = await GET(request);
      const data = await response.json();

      // Should only return current user's plans
      expect(data.callPlans).toHaveLength(1);
      expect(data.callPlans[0].accountsCount).toBe(5);
    });
  });
});
