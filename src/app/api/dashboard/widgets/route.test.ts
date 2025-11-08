/**
 * Integration Tests: Dashboard Widgets API Routes
 * Tests GET and POST endpoints for widget CRUD operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { PrismaClient } from '@prisma/client';
import { withSalesSession } from '@/lib/auth/sales';

const prisma = new PrismaClient();

type SalesSessionCallback = (
  context: {
    tenantId: string;
    session: { user: { id: string; email: string } };
    db: PrismaClient;
  }
) => Promise<Response> | Response;

// Mock authentication
vi.mock('@/lib/auth/sales', () => {
  const mockContext = {
    tenantId: 'test-tenant-id',
    session: { user: { id: 'test-user-id', email: 'sales@test.com' } },
    db: prisma,
  };

  return {
    withSalesSession: vi.fn((_request: NextRequest, callback: SalesSessionCallback) => {
      return callback(mockContext);
    }),
  };
});

const mockedWithSalesSession = vi.mocked(withSalesSession);

describe('Dashboard Widgets API Routes', () => {
  let testTenantId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-tenant-widgets',
        name: 'Test Tenant Widgets',
        industry: 'test',
      },
    });
    testTenantId = tenant.id;

    // Create test sales user
    const user = await prisma.salesUser.create({
      data: {
        tenantId: testTenantId,
        email: 'sales@test.com',
        fullName: 'Test Sales',
        passwordHash: 'hashed',
      },
    });
    testUserId = user.id;

    // Override mock to use real IDs
    mockedWithSalesSession.mockImplementation(
      (_request: NextRequest, callback: SalesSessionCallback) => {
        const mockContext = {
          tenantId: testTenantId,
          session: { user: { id: testUserId, email: 'sales@test.com' } },
          db: prisma,
        };
        return callback(mockContext);
      },
    );
  });

  afterEach(async () => {
    // Cleanup: Delete test data
    await prisma.dashboardWidget.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.salesUser.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  describe('GET /api/dashboard/widgets', () => {
    it('should return empty array when no widgets exist', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.widgets).toEqual([]);
      expect(data.availableWidgets).toBeDefined();
      expect(data.metadata).toBeDefined();
    });

    it('should return user widgets ordered by position', async () => {
      // Create test widgets
      await prisma.dashboardWidget.createMany({
        data: [
          {
            tenantId: testTenantId,
            userId: testUserId,
            widgetType: 'revenue_trend',
            position: 2,
            size: 'large',
            isVisible: true,
          },
          {
            tenantId: testTenantId,
            userId: testUserId,
            widgetType: 'at_risk_customers',
            position: 1,
            size: 'medium',
            isVisible: true,
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/dashboard/widgets');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.widgets).toHaveLength(2);
      expect(data.widgets[0].widgetType).toBe('at_risk_customers'); // Position 1 first
      expect(data.widgets[1].widgetType).toBe('revenue_trend'); // Position 2 second
    });

    it('should exclude hidden widgets by default', async () => {
      await prisma.dashboardWidget.createMany({
        data: [
          {
            tenantId: testTenantId,
            userId: testUserId,
            widgetType: 'revenue_trend',
            position: 1,
            size: 'large',
            isVisible: true,
          },
          {
            tenantId: testTenantId,
            userId: testUserId,
            widgetType: 'top_products',
            position: 2,
            size: 'medium',
            isVisible: false, // Hidden
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/dashboard/widgets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.widgets).toHaveLength(1);
      expect(data.widgets[0].widgetType).toBe('revenue_trend');
    });

    it('should include hidden widgets when requested', async () => {
      await prisma.dashboardWidget.createMany({
        data: [
          {
            tenantId: testTenantId,
            userId: testUserId,
            widgetType: 'revenue_trend',
            position: 1,
            size: 'large',
            isVisible: true,
          },
          {
            tenantId: testTenantId,
            userId: testUserId,
            widgetType: 'top_products',
            position: 2,
            size: 'medium',
            isVisible: false,
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/dashboard/widgets?includeHidden=true');
      const response = await GET(request);
      const data = await response.json();

      expect(data.widgets).toHaveLength(2);
    });

    it('should show only widgets not already added in availableWidgets', async () => {
      await prisma.dashboardWidget.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          widgetType: 'revenue_trend',
          position: 1,
          size: 'large',
          isVisible: true,
        },
      });

      const request = new NextRequest('http://localhost/api/dashboard/widgets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.availableWidgets).not.toContain('revenue_trend');
      expect(data.availableWidgets).toContain('at_risk_customers');
    });

    it('should return widget metadata', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata).toBeDefined();
      expect(data.metadata.revenue_trend).toBeDefined();
      expect(data.metadata.revenue_trend.title).toBeDefined();
      expect(data.metadata.revenue_trend.description).toBeDefined();
    });

    it('should include widget config', async () => {
      const config = { period: '30d', showTrend: true };

      await prisma.dashboardWidget.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          widgetType: 'revenue_trend',
          position: 1,
          size: 'large',
          isVisible: true,
          config,
        },
      });

      const request = new NextRequest('http://localhost/api/dashboard/widgets');
      const response = await GET(request);
      const data = await response.json();

      expect(data.widgets[0].config).toEqual(config);
    });

    it('should filter by tenant and user', async () => {
      // Create widget for different user
      const otherUser = await prisma.salesUser.create({
        data: {
          tenantId: testTenantId,
          email: 'other@test.com',
          fullName: 'Other User',
          passwordHash: 'hashed',
        },
      });

      await prisma.dashboardWidget.createMany({
        data: [
          {
            tenantId: testTenantId,
            userId: testUserId,
            widgetType: 'revenue_trend',
            position: 1,
            size: 'large',
            isVisible: true,
          },
          {
            tenantId: testTenantId,
            userId: otherUser.id,
            widgetType: 'at_risk_customers',
            position: 1,
            size: 'medium',
            isVisible: true,
          },
        ],
      });

      const request = new NextRequest('http://localhost/api/dashboard/widgets');
      const response = await GET(request);
      const data = await response.json();

      // Should only return current user's widgets
      expect(data.widgets).toHaveLength(1);
      expect(data.widgets[0].widgetType).toBe('revenue_trend');
    });
  });

  describe('POST /api/dashboard/widgets', () => {
    it('should create new widget with default values', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'revenue_trend',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.widget.widgetType).toBe('revenue_trend');
      expect(data.widget.position).toBe(1); // First widget
      expect(data.widget.size).toBe('large'); // Default from metadata
      expect(data.widget.isVisible).toBe(true);
    });

    it('should create widget with custom position', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'revenue_trend',
          position: 5,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.widget.position).toBe(5);
    });

    it('should create widget with custom size', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'at_risk_customers',
          size: 'small',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.widget.size).toBe('small');
    });

    it('should create widget with config', async () => {
      const config = {
        period: '7d',
        threshold: 10,
      };

      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'at_risk_customers',
          config,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.widget.config).toEqual(config);
    });

    it('should auto-increment position when not specified', async () => {
      // Create first widget
      await prisma.dashboardWidget.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          widgetType: 'revenue_trend',
          position: 3,
          size: 'large',
          isVisible: true,
        },
      });

      // Create second widget
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'at_risk_customers',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.widget.position).toBe(4); // Max position (3) + 1
    });

    it('should prevent duplicate widgets', async () => {
      // Create first widget
      await prisma.dashboardWidget.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          widgetType: 'revenue_trend',
          position: 1,
          size: 'large',
          isVisible: true,
        },
      });

      // Try to create duplicate
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'revenue_trend',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Widget already exists on dashboard');
    });

    it('should validate widget type', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'invalid_widget_type',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should validate size', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'revenue_trend',
          size: 'invalid_size',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should validate position is non-negative', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'revenue_trend',
          position: -1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request data');
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid JSON body');
    });

    it('should include timestamps in response', async () => {
      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'revenue_trend',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.widget.createdAt).toBeDefined();
      expect(data.widget.updatedAt).toBeDefined();
      expect(new Date(data.widget.createdAt)).toBeInstanceOf(Date);
    });
  });

  describe('Widget Types', () => {
    const widgetTypes = [
      'at_risk_customers',
      'revenue_trend',
      'tasks_from_management',
      'top_products',
      'new_customers',
      'customer_balances',
      'upcoming_events',
      'activity_summary',
      'quota_progress',
      'customers_due',
    ];

    widgetTypes.forEach((widgetType) => {
      it(`should create ${widgetType} widget`, async () => {
        const request = new NextRequest('http://localhost/api/dashboard/widgets', {
          method: 'POST',
          body: JSON.stringify({ widgetType }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.widget.widgetType).toBe(widgetType);
      });
    });
  });

  describe('Multi-User Scenarios', () => {
    it('should allow different users to have same widget types', async () => {
      // Create second user
      const user2 = await prisma.salesUser.create({
        data: {
          tenantId: testTenantId,
          email: 'sales2@test.com',
          fullName: 'Test Sales 2',
          passwordHash: 'hashed',
        },
      });

      // User 1 creates widget
      await prisma.dashboardWidget.create({
        data: {
          tenantId: testTenantId,
          userId: testUserId,
          widgetType: 'revenue_trend',
          position: 1,
          size: 'large',
          isVisible: true,
        },
      });

      // User 2 should be able to create same widget type
      mockedWithSalesSession.mockImplementationOnce(
        (_request: NextRequest, callback: SalesSessionCallback) => {
          const mockContext = {
            tenantId: testTenantId,
            session: { user: { id: user2.id, email: 'sales2@test.com' } },
            db: prisma,
          };
          return callback(mockContext);
        },
      );

      const request = new NextRequest('http://localhost/api/dashboard/widgets', {
        method: 'POST',
        body: JSON.stringify({
          widgetType: 'revenue_trend',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });
});
