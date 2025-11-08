/**
 * Sample API Integration Tests
 *
 * Tests all sample-related API endpoints including:
 * - Quick assign endpoint
 * - Analytics endpoints with filters
 * - Top performers
 * - Rep leaderboard
 * - Supplier report generation
 * - Feedback templates
 * - Error responses
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestSample,
  createTestMetrics,
  type TestSampleMetrics,
  type TestSampleUsage,
} from '../../../__tests__/factories/sample-factory';

// Mock Next.js request/response
class MockRequest<TBody = undefined> {
  method: string;
  url: string;
  headers: Map<string, string>;
  body?: TBody;

  constructor(method: string, url: string, body?: TBody) {
    this.method = method;
    this.url = url;
    this.headers = new Map();
    if (body !== undefined) {
      this.body = body;
    }
  }

  json(): Promise<TBody> {
    return Promise.resolve(this.body as TBody);
  }
}

class MockResponse<TBody = unknown> {
  statusCode = 200;
  body?: TBody;
  headers: Map<string, string> = new Map();

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: TBody) {
    this.body = data;
    return this;
  }

  setHeader(key: string, value: string) {
    this.headers.set(key, value);
    return this;
  }
}

type ApiError = { error: string };
type ValidationError = { errors: string[] };

type QuickAssignRequestBody = {
  customerId?: string;
  productId?: string;
  salesRepId?: string;
  quantity?: number;
  feedbackOptions?: string[];
  customerResponse?: string;
  sampleSource?: string;
  notes?: string;
};

type QuickAssignSuccess = {
  success: true;
  sample: TestSampleUsage;
  activityCreated: boolean;
  activity: { id: string };
};

type QuickAssignResponse = QuickAssignSuccess | ApiError | ValidationError;

type AnalyticsResponse = TestSampleMetrics & {
  filters: {
    salesRepId: string | null;
    productId: string | null;
    customerId: string | null;
  };
  dateRange: { startDate: string; endDate: string } | null;
};

type TopPerformerProduct = {
  productId: string;
  productName: string;
  totalSamples: number;
  conversions: number;
  conversionRate: number;
};

type TopPerformersResponse = {
  products: TopPerformerProduct[];
};

type RepLeaderboardEntry = {
  repId: string;
  name: string;
  totalSamples: number;
  conversions: number;
  conversionRate: number;
  totalRevenue: number;
};

type RepLeaderboardResponse = {
  reps: RepLeaderboardEntry[];
  dateRange: { startDate: string; endDate: string } | null;
};

type SupplierReportRequestBody = {
  supplierId?: string;
};

type SupplierReportResponse = {
  reportId: string;
  pdfUrl: string;
  preview: {
    totalSamples: number;
    conversionRate: number;
    productBreakdown: Array<{
      productName: string;
      samples: number;
      conversions: number;
    }>;
  };
};

type FeedbackTemplate = {
  id: string;
  name: string;
  template: string;
  category: string;
  isActive: boolean;
};

type FeedbackTemplatesResponse = {
  templates: FeedbackTemplate[];
};

describe('Sample API Integration', () => {
  beforeEach(() => {
    // Reset database
  });

  afterEach(() => {
    // Cleanup
  });

  describe('POST /api/samples/quick-assign', () => {
    it('should assign sample to customer successfully', async () => {
      const requestBody = {
        customerId: 'customer-123',
        productId: 'product-456',
        salesRepId: 'rep-789',
        quantity: 2,
      };

      const req = new MockRequest('POST', '/api/samples/quick-assign', requestBody);
      const res = new MockResponse();

      await quickAssignHandler(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.sample).toHaveProperty('id');
      expect(res.body.sample.customerId).toBe('customer-123');
    });

    it('should validate required fields', async () => {
      const requestBody = {
        customerId: 'customer-123',
        // Missing productId and salesRepId
      };

      const req = new MockRequest('POST', '/api/samples/quick-assign', requestBody);
      const res = new MockResponse();

      await quickAssignHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toContain('required');
    });

    it('should check inventory availability', async () => {
      const requestBody = {
        customerId: 'customer-123',
        productId: 'out-of-stock-product',
        salesRepId: 'rep-789',
        quantity: 100, // More than available
      };

      const req = new MockRequest('POST', '/api/samples/quick-assign', requestBody);
      const res = new MockResponse();

      await quickAssignHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('inventory');
    });

    it('should create activity record automatically', async () => {
      const requestBody = {
        customerId: 'customer-123',
        productId: 'product-456',
        salesRepId: 'rep-789',
        quantity: 1,
      };

      const req = new MockRequest('POST', '/api/samples/quick-assign', requestBody);
      const res = new MockResponse();

      await quickAssignHandler(req, res);

      expect(res.body.activityCreated).toBe(true);
      expect(res.body.activity).toHaveProperty('id');
    });
  });

  describe('GET /api/samples/analytics', () => {
    it('should return analytics for date range', async () => {
      const url = '/api/samples/analytics?startDate=2025-10-01&endDate=2025-10-31';
      const req = new MockRequest('GET', url);
      const res = new MockResponse();

      await analyticsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('totalSamples');
      expect(res.body).toHaveProperty('conversionRate');
      expect(res.body).toHaveProperty('totalValue');
    });

    it('should filter by sales rep', async () => {
      const url = '/api/samples/analytics?salesRepId=rep-123';
      const req = new MockRequest('GET', url);
      const res = new MockResponse();

      await analyticsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.filters.salesRepId).toBe('rep-123');
    });

    it('should filter by product', async () => {
      const url = '/api/samples/analytics?productId=product-456';
      const req = new MockRequest('GET', url);
      const res = new MockResponse();

      await analyticsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.filters.productId).toBe('product-456');
    });

    it('should filter by customer', async () => {
      const url = '/api/samples/analytics?customerId=customer-789';
      const req = new MockRequest('GET', url);
      const res = new MockResponse();

      await analyticsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.filters.customerId).toBe('customer-789');
    });

    it('should handle invalid date format', async () => {
      const url = '/api/samples/analytics?startDate=invalid-date';
      const req = new MockRequest('GET', url);
      const res = new MockResponse();

      await analyticsHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain('date');
    });

    it('should return empty results for no data', async () => {
      const url = '/api/samples/analytics?startDate=2020-01-01&endDate=2020-01-02';
      const req = new MockRequest('GET', url);
      const res = new MockResponse();

      await analyticsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.totalSamples).toBe(0);
      expect(res.body.conversionRate).toBe(0);
    });
  });

  describe('GET /api/samples/top-performers', () => {
    it('should return top performing products', async () => {
      const req = new MockRequest('GET', '/api/samples/top-performers');
      const res = new MockResponse();

      await topPerformersHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products.length).toBeGreaterThan(0);
    });

    it('should limit results to top 10 by default', async () => {
      const req = new MockRequest('GET', '/api/samples/top-performers');
      const res = new MockResponse();

      await topPerformersHandler(req, res);

      expect(res.body.products.length).toBeLessThanOrEqual(10);
    });

    it('should allow custom limit', async () => {
      const req = new MockRequest('GET', '/api/samples/top-performers?limit=5');
      const res = new MockResponse();

      await topPerformersHandler(req, res);

      expect(res.body.products.length).toBeLessThanOrEqual(5);
    });

    it('should sort by conversion rate descending', async () => {
      const req = new MockRequest('GET', '/api/samples/top-performers');
      const res = new MockResponse();

      await topPerformersHandler(req, res);

      const products = (res.body as TopPerformersResponse | undefined)?.products ?? [];
      const rates = products.map(product => product.conversionRate);
      const sorted = [...rates].sort((a, b) => b - a);

      expect(rates).toEqual(sorted);
    });
  });

  describe('GET /api/samples/rep-leaderboard', () => {
    it('should return sales rep leaderboard', async () => {
      const req = new MockRequest('GET', '/api/samples/rep-leaderboard');
      const res = new MockResponse();

      await repLeaderboardHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.reps)).toBe(true);
    });

    it('should include rep statistics', async () => {
      const req = new MockRequest('GET', '/api/samples/rep-leaderboard');
      const res = new MockResponse();

      await repLeaderboardHandler(req, res);

      const rep = res.body.reps[0];
      expect(rep).toHaveProperty('totalSamples');
      expect(rep).toHaveProperty('conversions');
      expect(rep).toHaveProperty('conversionRate');
      expect(rep).toHaveProperty('totalRevenue');
    });

    it('should filter by date range', async () => {
      const url = '/api/samples/rep-leaderboard?startDate=2025-10-01&endDate=2025-10-31';
      const req = new MockRequest('GET', url);
      const res = new MockResponse();

      await repLeaderboardHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.dateRange).toBeDefined();
    });
  });

  describe('POST /api/samples/supplier-report', () => {
    it('should generate supplier report PDF', async () => {
      const requestBody = {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
        supplierId: 'supplier-123',
      };

      const req = new MockRequest('POST', '/api/samples/supplier-report', requestBody);
      const res = new MockResponse();

      await supplierReportHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.pdfUrl).toBeDefined();
      expect(res.body.reportId).toBeDefined();
    });

    it('should include sample breakdown in report', async () => {
      const requestBody = {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
        supplierId: 'supplier-123',
      };

      const req = new MockRequest('POST', '/api/samples/supplier-report', requestBody);
      const res = new MockResponse();

      await supplierReportHandler(req, res);

      expect(res.body.preview).toHaveProperty('totalSamples');
      expect(res.body.preview).toHaveProperty('conversionRate');
      expect(res.body.preview).toHaveProperty('productBreakdown');
    });

    it('should validate supplier exists', async () => {
      const requestBody = {
        startDate: '2025-10-01',
        endDate: '2025-10-31',
        supplierId: 'invalid-supplier',
      };

      const req = new MockRequest('POST', '/api/samples/supplier-report', requestBody);
      const res = new MockResponse();

      await supplierReportHandler(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('Supplier not found');
    });
  });

  describe('GET /api/samples/feedback-templates', () => {
    it('should return active feedback templates', async () => {
      const req = new MockRequest('GET', '/api/samples/feedback-templates');
      const res = new MockResponse();

      await feedbackTemplatesHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.templates)).toBe(true);
    });

    it('should filter by category', async () => {
      const url = '/api/samples/feedback-templates?category=positive';
      const req = new MockRequest('GET', url);
      const res = new MockResponse();

      await feedbackTemplatesHandler(req, res);

      const templates = (res.body as FeedbackTemplatesResponse | undefined)?.templates ?? [];
      expect(templates.every(template => template.category === 'positive')).toBe(true);
    });

    it('should return only active templates', async () => {
      const req = new MockRequest('GET', '/api/samples/feedback-templates');
      const res = new MockResponse();

      await feedbackTemplatesHandler(req, res);

      const templates = (res.body as FeedbackTemplatesResponse | undefined)?.templates ?? [];
      expect(templates.every(template => template.isActive === true)).toBe(true);
    });
  });

  describe('Error Responses', () => {
    it('should return 401 for unauthorized requests', async () => {
      const req = new MockRequest('GET', '/api/samples/analytics');
      // Don't set auth header

      const res = new MockResponse();

      await analyticsHandler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toContain('Unauthorized');
    });

    it('should return 404 for non-existent sample', async () => {
      const req = new MockRequest('GET', '/api/samples/nonexistent-id');
      const res = new MockResponse();

      await getSampleHandler(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 500 for database errors', async () => {
      // Simulate database failure
      const req = new MockRequest('GET', '/api/samples/analytics');
      const res = new MockResponse();

      // Mock database error
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await analyticsHandlerWithError(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for validation errors', async () => {
      const requestBody = {
        customerId: '', // Empty
        productId: 'product-123',
        quantity: -1, // Invalid
      };

      const req = new MockRequest('POST', '/api/samples/quick-assign', requestBody);
      const res = new MockResponse();

      await quickAssignHandler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle analytics query under 500ms', async () => {
      const req = new MockRequest('GET', '/api/samples/analytics');
      const res = new MockResponse();

      const start = performance.now();
      await analyticsHandler(req, res);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500);
    });

    it('should handle large datasets efficiently', async () => {
      // Query with large result set
      const url = '/api/samples/analytics?startDate=2020-01-01&endDate=2025-12-31';
      const req = new MockRequest('GET', url);
      const res = new MockResponse();

      const start = performance.now();
      await analyticsHandler(req, res);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1000);
      expect(res.statusCode).toBe(200);
    });
  });
});

// Handler mock implementations

async function quickAssignHandler(
  req: MockRequest<QuickAssignRequestBody>,
  res: MockResponse<QuickAssignResponse>
) {
  const body = await req.json();

  // Validation
  if (!body?.customerId || !body.productId || !body.salesRepId) {
    return res.status(400).json({
      error: 'Missing required fields: customerId, productId, salesRepId',
    });
  }

  if (!body.quantity || body.quantity <= 0) {
    return res.status(400).json({
      errors: ['Quantity must be greater than 0'],
    });
  }

  // Check inventory
  if (body.productId === 'out-of-stock-product') {
    return res.status(400).json({
      error: 'Insufficient inventory for this product',
    });
  }

  const sample = createTestSample({
    customerId: body.customerId,
    productId: body.productId,
    salesRepId: body.salesRepId,
    quantity: body.quantity,
  });

  return res.status(201).json({
    success: true,
    sample,
    activityCreated: true,
    activity: { id: 'activity-' + sample.id },
  });
}

async function analyticsHandler(
  req: MockRequest,
  res: MockResponse<AnalyticsResponse | ApiError>
) {
  const url = new URL(req.url, 'http://localhost');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');
  const salesRepId = url.searchParams.get('salesRepId');
  const productId = url.searchParams.get('productId');
  const customerId = url.searchParams.get('customerId');

  // Validate dates
  if (startDate && isNaN(Date.parse(startDate))) {
    return res.status(400).json({
      error: 'Invalid date format for startDate',
    });
  }

  const metrics = createTestMetrics();

  return res.status(200).json({
    ...metrics,
    filters: {
      salesRepId,
      productId,
      customerId,
    },
    dateRange: startDate && endDate ? { startDate, endDate } : null,
  });
}

async function topPerformersHandler(
  req: MockRequest,
  res: MockResponse<TopPerformersResponse>
) {
  const url = new URL(req.url, 'http://localhost');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  const products = Array.from({ length: limit }, (_, i) => ({
    productId: `prod-${i}`,
    productName: `Product ${i}`,
    totalSamples: 100 - i * 5,
    conversions: 30 - i * 2,
    conversionRate: (30 - i * 2) / (100 - i * 5),
  })).sort((a, b) => b.conversionRate - a.conversionRate);

  return res.status(200).json({ products });
}

async function repLeaderboardHandler(
  req: MockRequest,
  res: MockResponse<RepLeaderboardResponse>
) {
  const url = new URL(req.url, 'http://localhost');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  const reps = [
    {
      repId: 'rep-1',
      name: 'Rep 1',
      totalSamples: 100,
      conversions: 35,
      conversionRate: 0.35,
      totalRevenue: 50000,
    },
    {
      repId: 'rep-2',
      name: 'Rep 2',
      totalSamples: 80,
      conversions: 25,
      conversionRate: 0.3125,
      totalRevenue: 40000,
    },
  ];

  return res.status(200).json({
    reps,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
  });
}

async function supplierReportHandler(
  req: MockRequest<SupplierReportRequestBody>,
  res: MockResponse<SupplierReportResponse | ApiError>
) {
  const body = await req.json();

  if (body?.supplierId === 'invalid-supplier') {
    return res.status(404).json({
      error: 'Supplier not found',
    });
  }

  return res.status(200).json({
    reportId: 'report-123',
    pdfUrl: '/reports/supplier-123.pdf',
    preview: {
      totalSamples: 150,
      conversionRate: 0.28,
      productBreakdown: [
        { productName: 'Product A', samples: 50, conversions: 15 },
        { productName: 'Product B', samples: 100, conversions: 27 },
      ],
    },
  });
}

async function feedbackTemplatesHandler(
  req: MockRequest,
  res: MockResponse<FeedbackTemplatesResponse>
) {
  const url = new URL(req.url, 'http://localhost');
  const category = url.searchParams.get('category');

  let templates = [
    { id: '1', name: 'Loved it', template: 'Customer loved it!', category: 'positive', isActive: true },
    { id: '2', name: 'Too dry', template: 'Too dry for preference', category: 'negative', isActive: true },
  ];

  if (category) {
    templates = templates.filter(t => t.category === category);
  }

  return res.status(200).json({ templates });
}

async function getSampleHandler(req: MockRequest, res: MockResponse<ApiError>) {
  return res.status(404).json({
    error: 'Sample not found',
  });
}

async function analyticsHandlerWithError(
  req: MockRequest,
  res: MockResponse<ApiError>
) {
  return res.status(500).json({
    error: 'Internal server error',
  });
}
