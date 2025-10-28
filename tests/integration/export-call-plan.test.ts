/**
 * Integration Tests: Call Plan Export
 * Tests export functionality for call plans in multiple formats
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/call-plans/[planId]/export/route';
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

describe('Call Plan Export', () => {
  let testTenantId: string;
  let testUserId: string;
  let testCallPlanId: string;

  beforeEach(async () => {
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-export',
        name: 'Test Export',
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
        notes: 'Focus on Q4 objectives',
      },
    });
    testCallPlanId = plan.id;

    // Add accounts with various statuses
    await prisma.callPlanAccount.createMany({
      data: [
        {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'High Value Account',
          priority: 1,
          objective: 'Discuss Q4 promotion',
          outcome: 'X',
          outcomeNotes: 'Secured 25-case order',
        },
        {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-2',
          accountName: 'Growth Account',
          priority: 2,
          objective: 'Introduce new products',
          outcome: 'Y',
          outcomeNotes: 'Interested but needs time to decide',
        },
        {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-3',
          accountName: 'Standard Account',
          priority: 3,
          objective: 'Quarterly check-in',
          outcome: null, // Not completed
          outcomeNotes: null,
        },
      ],
    });

    await prisma.callPlan.update({
      where: { id: testCallPlanId },
      data: { accountsCount: 3 },
    });

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

  describe('CSV Export', () => {
    it('should export call plan as CSV', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('call-plan');
      expect(response.headers.get('Content-Disposition')).toContain('.csv');

      const csvText = await response.text();
      expect(csvText).toContain('Account Name');
      expect(csvText).toContain('Priority');
      expect(csvText).toContain('Objective');
      expect(csvText).toContain('Outcome');
      expect(csvText).toContain('High Value Account');
      expect(csvText).toContain('Discuss Q4 promotion');
    });

    it('should include all account fields in CSV', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const csvText = await response.text();

      const lines = csvText.split('\n');
      expect(lines[0]).toContain('Account Name');
      expect(lines[0]).toContain('Priority');
      expect(lines[0]).toContain('Objective');
      expect(lines[0]).toContain('Outcome');
      expect(lines[0]).toContain('Outcome Notes');

      // Check data rows
      expect(lines[1]).toContain('High Value Account');
      expect(lines[1]).toContain('1');
      expect(lines[1]).toContain('X');
      expect(lines[1]).toContain('Secured 25-case order');
    });

    it('should handle special characters in CSV', async () => {
      await prisma.callPlanAccount.create({
        data: {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-4',
          accountName: 'Account "Special" & Co.',
          priority: 4,
          objective: 'Test, with, commas',
          outcomeNotes: 'Notes with "quotes" and, commas',
        },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const csvText = await response.text();

      expect(csvText).toContain('"Account ""Special"" & Co."');
      expect(csvText).toContain('"Test, with, commas"');
    });

    it('should order accounts by priority in CSV', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const csvText = await response.text();

      const lines = csvText.split('\n').filter((line) => line.trim());
      expect(lines[1]).toContain('High Value Account'); // Priority 1
      expect(lines[2]).toContain('Growth Account'); // Priority 2
      expect(lines[3]).toContain('Standard Account'); // Priority 3
    });
  });

  describe('Excel Export', () => {
    it('should export call plan as Excel', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=xlsx`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(response.headers.get('Content-Disposition')).toContain('.xlsx');
    });

    it('should include summary sheet in Excel', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=xlsx&includeSummary=true`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      expect(response.status).toBe(200);
      // Excel file should include both summary and accounts sheets
      const arrayBuffer = await response.arrayBuffer();
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should format dates in Excel', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=xlsx`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      expect(response.status).toBe(200);
    });
  });

  describe('PDF Export', () => {
    it('should export call plan as PDF', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=pdf`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('.pdf');
    });

    it('should include header with week dates in PDF', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=pdf`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      expect(response.status).toBe(200);
      // PDF should contain formatted dates
    });

    it('should group accounts by outcome in PDF', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=pdf&groupByOutcome=true`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      expect(response.status).toBe(200);
    });
  });

  describe('JSON Export', () => {
    it('should export call plan as JSON', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=json`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toContain('application/json');

      expect(data.callPlan).toBeDefined();
      expect(data.callPlan.id).toBe(testCallPlanId);
      expect(data.callPlan.weekStartDate).toBeDefined();
      expect(data.accounts).toHaveLength(3);
    });

    it('should include full account details in JSON', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=json`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      const account = data.accounts[0];
      expect(account).toHaveProperty('accountId');
      expect(account).toHaveProperty('accountName');
      expect(account).toHaveProperty('priority');
      expect(account).toHaveProperty('objective');
      expect(account).toHaveProperty('outcome');
      expect(account).toHaveProperty('outcomeNotes');
    });

    it('should include metadata in JSON export', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=json`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.metadata).toBeDefined();
      expect(data.metadata.exportedAt).toBeDefined();
      expect(data.metadata.exportedBy).toBe('sales@test.com');
      expect(data.metadata.totalAccounts).toBe(3);
    });
  });

  describe('Export Filters', () => {
    it('should export only completed accounts', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv&filter=completed`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const csvText = await response.text();

      const lines = csvText.split('\n').filter((line) => line.trim());
      expect(lines.length).toBe(3); // Header + 2 completed accounts
      expect(csvText).toContain('High Value Account');
      expect(csvText).toContain('Growth Account');
      expect(csvText).not.toContain('Standard Account');
    });

    it('should export only pending accounts', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv&filter=pending`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const csvText = await response.text();

      const lines = csvText.split('\n').filter((line) => line.trim());
      expect(lines.length).toBe(2); // Header + 1 pending account
      expect(csvText).toContain('Standard Account');
      expect(csvText).not.toContain('High Value Account');
    });

    it('should filter by outcome X (met objective)', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv&outcome=X`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const csvText = await response.text();

      expect(csvText).toContain('High Value Account');
      expect(csvText).not.toContain('Growth Account');
    });

    it('should filter by outcome Y (progress made)', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv&outcome=Y`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const csvText = await response.text();

      expect(csvText).toContain('Growth Account');
      expect(csvText).not.toContain('High Value Account');
    });
  });

  describe('Export Statistics', () => {
    it('should include summary statistics in export', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=json&includeStats=true`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      expect(data.statistics).toBeDefined();
      expect(data.statistics.totalAccounts).toBe(3);
      expect(data.statistics.completedAccounts).toBe(2);
      expect(data.statistics.pendingAccounts).toBe(1);
      expect(data.statistics.outcomeX).toBe(1);
      expect(data.statistics.outcomeY).toBe(1);
      expect(data.statistics.outcomeBlank).toBe(1);
      expect(data.statistics.completionRate).toBeCloseTo(66.67, 1);
    });

    it('should calculate success rate', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=json&includeStats=true`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });
      const data = await response.json();

      // Success rate = X outcomes / completed accounts
      expect(data.statistics.successRate).toBeCloseTo(50, 1); // 1 X out of 2 completed
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent call plan', async () => {
      const request = new NextRequest(
        'http://localhost/api/call-plans/invalid-id/export?format=csv'
      );
      const response = await GET(request, { params: { planId: 'invalid-id' } });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid export format', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=invalid`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      expect(response.status).toBe(400);
    });

    it('should handle empty call plan gracefully', async () => {
      // Remove all accounts
      await prisma.callPlanAccount.deleteMany({
        where: { callPlanId: testCallPlanId },
      });

      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      expect(response.status).toBe(200);
      const csvText = await response.text();
      expect(csvText).toContain('Account Name'); // Header should still exist
    });
  });

  describe('File Naming', () => {
    it('should include week dates in filename', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('2025-10-20');
      expect(disposition).toContain('2025-10-26');
    });

    it('should sanitize special characters in filename', async () => {
      const request = new NextRequest(
        `http://localhost/api/call-plans/${testCallPlanId}/export?format=csv`
      );
      const response = await GET(request, { params: { planId: testCallPlanId } });

      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).not.toContain('/');
      expect(disposition).not.toContain('\\');
    });
  });
});
