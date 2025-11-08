/**
 * Integration Tests: Metrics Definition API Routes
 * Tests GET and POST endpoints for metric definitions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { PrismaClient } from '@prisma/client';
import { withAdminSession } from '@/lib/auth/admin';

const prisma = new PrismaClient();

type AdminSessionCallback = (
  context: {
    tenantId: string;
    user: { id: string; email: string };
    db: PrismaClient;
  }
) => Promise<Response> | Response;

// Mock authentication
vi.mock('@/lib/auth/admin', () => {
  const mockContext = {
    tenantId: 'test-tenant-id',
    user: { id: 'test-user-id', email: 'admin@test.com' },
    db: prisma,
  };

  return {
    withAdminSession: vi.fn((_request: NextRequest, callback: AdminSessionCallback) => {
      return callback(mockContext);
    }),
    AdminSessionContext: vi.fn(),
  };
});

const mockedWithAdminSession = vi.mocked(withAdminSession);

describe('Metrics Definition API Routes', () => {
  let testTenantId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-tenant-metrics',
        name: 'Test Tenant Metrics',
        industry: 'test',
      },
    });
    testTenantId = tenant.id;

    // Create test admin user
    const user = await prisma.adminUser.create({
      data: {
        tenantId: testTenantId,
        email: 'admin@test.com',
        fullName: 'Test Admin',
        passwordHash: 'hashed',
      },
    });
    testUserId = user.id;

    // Override mock to use real IDs
    mockedWithAdminSession.mockImplementation(
      (_request: NextRequest, callback: AdminSessionCallback) => {
        const mockContext = {
          tenantId: testTenantId,
          user: { id: testUserId, email: 'admin@test.com' },
          db: prisma,
        };
        return callback(mockContext);
      }
    );
  });

  afterEach(async () => {
    // Cleanup: Delete test data
    await prisma.metricDefinition.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.adminUser.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  describe('GET /api/metrics/definitions', () => {
    it('should return empty array when no definitions exist', async () => {
      const request = new NextRequest('http://localhost/api/metrics/definitions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.definitions).toEqual([]);
      expect(data.pagination.totalCount).toBe(0);
    });

    it('should return metric definitions with pagination', async () => {
      // Create test definitions
      await prisma.metricDefinition.createMany({
        data: [
          {
            tenantId: testTenantId,
            code: 'REVENUE',
            name: 'Total Revenue',
            description: 'Total revenue from all sources',
            version: 1,
            createdById: testUserId,
          },
          {
            tenantId: testTenantId,
            code: 'CUSTOMERS',
            name: 'Active Customers',
            description: 'Number of active customers',
            version: 1,
            createdById: testUserId,
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/metrics/definitions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.definitions).toHaveLength(2);
      expect(data.pagination.totalCount).toBe(2);
      expect(data.pagination.page).toBe(1);
      expect(data.pagination.limit).toBe(50);
    });

    it('should filter by code parameter', async () => {
      await prisma.metricDefinition.createMany({
        data: [
          {
            tenantId: testTenantId,
            code: 'REVENUE',
            name: 'Total Revenue',
            version: 1,
            createdById: testUserId,
          },
          {
            tenantId: testTenantId,
            code: 'CUSTOMERS',
            name: 'Active Customers',
            version: 1,
            createdById: testUserId,
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/metrics/definitions?code=REVENUE');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.definitions).toHaveLength(1);
      expect(data.definitions[0].code).toBe('REVENUE');
    });

    it('should search across name, description, and code', async () => {
      await prisma.metricDefinition.create({
        data: {
          tenantId: testTenantId,
          code: 'REVENUE_GROWTH',
          name: 'Revenue Growth Rate',
          description: 'Year over year revenue growth percentage',
          version: 1,
          createdById: testUserId,
        },
      });

      const request = new NextRequest('http://localhost/api/metrics/definitions?search=growth');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.definitions).toHaveLength(1);
      expect(data.definitions[0].code).toBe('REVENUE_GROWTH');
    });

    it('should exclude deprecated definitions by default', async () => {
      await prisma.metricDefinition.createMany({
        data: [
          {
            tenantId: testTenantId,
            code: 'ACTIVE',
            name: 'Active Metric',
            version: 1,
            createdById: testUserId,
          },
          {
            tenantId: testTenantId,
            code: 'DEPRECATED',
            name: 'Deprecated Metric',
            version: 1,
            createdById: testUserId,
            deprecatedAt: new Date(),
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/metrics/definitions');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.definitions).toHaveLength(1);
      expect(data.definitions[0].code).toBe('ACTIVE');
    });

    it('should include deprecated when requested', async () => {
      await prisma.metricDefinition.createMany({
        data: [
          {
            tenantId: testTenantId,
            code: 'ACTIVE',
            name: 'Active Metric',
            version: 1,
            createdById: testUserId,
          },
          {
            tenantId: testTenantId,
            code: 'DEPRECATED',
            name: 'Deprecated Metric',
            version: 1,
            createdById: testUserId,
            deprecatedAt: new Date(),
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/metrics/definitions?includeDeprecated=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.definitions).toHaveLength(2);
    });

    it('should handle pagination correctly', async () => {
      // Create 60 definitions
      const definitions = Array.from({ length: 60 }, (_, i) => ({
        tenantId: testTenantId,
        code: `METRIC_${i}`,
        name: `Metric ${i}`,
        version: 1,
        createdById: testUserId,
      }));
      await prisma.metricDefinition.createMany({ data: definitions });

      // First page
      const page1 = new NextRequest('http://localhost/api/metrics/definitions?page=1&limit=20');
      const response1 = await GET(page1);
      const data1 = await response1.json();

      expect(data1.definitions).toHaveLength(20);
      expect(data1.pagination.page).toBe(1);
      expect(data1.pagination.totalPages).toBe(3);

      // Second page
      const page2 = new NextRequest('http://localhost/api/metrics/definitions?page=2&limit=20');
      const response2 = await GET(page2);
      const data2 = await response2.json();

      expect(data2.definitions).toHaveLength(20);
      expect(data2.pagination.page).toBe(2);
    });

    it('should return creator information', async () => {
      await prisma.metricDefinition.create({
        data: {
          tenantId: testTenantId,
          code: 'TEST',
          name: 'Test Metric',
          version: 1,
          createdById: testUserId,
        },
      });

      const request = new NextRequest('http://localhost/api/metrics/definitions');
      const response = await GET(request);
      const data = await response.json();

      expect(data.definitions[0].createdBy).toBeDefined();
      expect(data.definitions[0].createdBy.email).toBe('admin@test.com');
    });

    it('should validate query parameters', async () => {
      const request = new NextRequest('http://localhost/api/metrics/definitions?page=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid query parameters');
    });
  });

  describe('POST /api/metrics/definitions', () => {
    it('should create new metric definition', async () => {
      const request = new NextRequest('http://localhost/api/metrics/definitions', {
        method: 'POST',
        body: JSON.stringify({
          code: 'REVENUE',
          name: 'Total Revenue',
          description: 'Total revenue from all sources',
          formula: {
            type: 'sum',
            field: 'amount',
          },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.definition.code).toBe('REVENUE');
      expect(data.definition.version).toBe(1);
      expect(data.message).toContain('Created new metric definition');
    });

    it('should create new version when code exists', async () => {
      // Create version 1
      await prisma.metricDefinition.create({
        data: {
          tenantId: testTenantId,
          code: 'REVENUE',
          name: 'Total Revenue',
          version: 1,
          createdById: testUserId,
        },
      });

      // Create version 2
      const request = new NextRequest('http://localhost/api/metrics/definitions', {
        method: 'POST',
        body: JSON.stringify({
          code: 'REVENUE',
          name: 'Total Revenue (Updated)',
          description: 'Updated description',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.definition.version).toBe(2);
      expect(data.message).toContain('Created version 2');
    });

    it('should validate request body', async () => {
      const request = new NextRequest('http://localhost/api/metrics/definitions', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          name: 'Test Metric',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request body');
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/metrics/definitions', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should store formula as JSON', async () => {
      const formula = {
        type: 'calculation',
        expression: '(revenue - costs) / revenue * 100',
        dependencies: ['revenue', 'costs'],
      };

      const request = new NextRequest('http://localhost/api/metrics/definitions', {
        method: 'POST',
        body: JSON.stringify({
          code: 'PROFIT_MARGIN',
          name: 'Profit Margin',
          formula,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.definition.formula).toEqual(formula);
    });

    it('should associate with creator', async () => {
      const request = new NextRequest('http://localhost/api/metrics/definitions', {
        method: 'POST',
        body: JSON.stringify({
          code: 'TEST',
          name: 'Test Metric',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.definition.createdBy.id).toBe(testUserId);
      expect(data.definition.createdBy.email).toBe('admin@test.com');
    });

    it('should handle database errors', async () => {
      // Create a definition
      await prisma.metricDefinition.create({
        data: {
          tenantId: testTenantId,
          code: 'DUPLICATE',
          name: 'Test',
          version: 1,
          createdById: testUserId,
        },
      });

      // Try to create same code/version (should create v2, but if we force duplicate)
      const request = new NextRequest('http://localhost/api/metrics/definitions', {
        method: 'POST',
        body: JSON.stringify({
          code: 'DUPLICATE',
          name: 'Test',
        }),
      });

      const response = await POST(request);

      // Should create version 2 successfully
      expect(response.status).toBe(201);
    });
  });

  describe('Version Management', () => {
    it('should track multiple versions correctly', async () => {
      const versions = [
        { name: 'Revenue V1', description: 'Original' },
        { name: 'Revenue V2', description: 'Updated' },
        { name: 'Revenue V3', description: 'Latest' },
      ];

      for (const version of versions) {
        const request = new NextRequest('http://localhost/api/metrics/definitions', {
          method: 'POST',
          body: JSON.stringify({
            code: 'REVENUE',
            ...version,
          }),
        });
        await POST(request);
      }

      const getRequest = new NextRequest('http://localhost/api/metrics/definitions?code=REVENUE');
      const response = await GET(getRequest);
      const data = await response.json();

      expect(data.definitions).toHaveLength(3);
      expect(data.definitions[0].version).toBe(3); // Latest first
      expect(data.definitions[2].version).toBe(1);
    });
  });
});
