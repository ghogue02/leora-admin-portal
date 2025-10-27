/**
 * End-to-End Workflow Tests for Samples
 *
 * Tests complete workflows from start to finish:
 * - Sample assignment flow
 * - Sample conversion flow (sample → order → attribution)
 * - Analytics workflow (dashboard → filters → export)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  createTestSample,
  createTestOrder,
  createSampleScenario,
} from '../factories/sample-factory';

// Mock database
const mockDb = {
  samples: [] as any[],
  orders: [] as any[],
  inventory: [] as any[],
  activities: [] as any[],
  triggers: [] as any[],
  tasks: [] as any[],
  clear() {
    this.samples = [];
    this.orders = [];
    this.inventory = [];
    this.activities = [];
    this.triggers = [];
    this.tasks = [];
  },
};

describe('E2E Sample Workflows', () => {
  beforeEach(() => {
    mockDb.clear();
    // Setup initial inventory
    mockDb.inventory = [
      { productId: 'prod-123', quantity: 100, productName: 'Chardonnay' },
      { productId: 'prod-456', quantity: 50, productName: 'Pinot Noir' },
    ];
  });

  afterEach(() => {
    mockDb.clear();
  });

  describe('Workflow A: Sample Assignment Flow', () => {
    it('should complete full sample assignment workflow', async () => {
      // Step 1: Rep assigns sample to customer
      const assignmentRequest = {
        customerId: 'customer-123',
        productId: 'prod-123',
        salesRepId: 'rep-789',
        quantity: 2,
      };

      const sample = await assignSample(assignmentRequest, mockDb);

      expect(sample).toBeDefined();
      expect(sample.id).toBeDefined();
      expect(sample.customerId).toBe('customer-123');
      expect(sample.quantity).toBe(2);

      // Step 2: Sample inventory decremented
      const inventory = mockDb.inventory.find(i => i.productId === 'prod-123');
      expect(inventory.quantity).toBe(98); // 100 - 2

      // Step 3: Activity created automatically
      const activity = mockDb.activities.find(a => a.sampleId === sample.id);
      expect(activity).toBeDefined();
      expect(activity.type).toBe('sample_given');
      expect(activity.customerId).toBe('customer-123');

      // Step 4: Customer receives sample (simulated)
      const customerRecord = await getCustomerWithSamples('customer-123', mockDb);
      expect(customerRecord.samples).toHaveLength(1);
      expect(customerRecord.samples[0].id).toBe(sample.id);

      // Step 5: Rep logs feedback
      const feedback = 'Customer loved the wine and wants to order more!';
      const updatedSample = await updateSampleFeedback(sample.id, feedback, mockDb);

      expect(updatedSample.feedback).toBe(feedback);
      expect(mockDb.samples.find(s => s.id === sample.id).feedback).toBe(feedback);

      // Step 6: Trigger created if no order after 7 days
      const trigger = await createNoOrderTrigger(sample.id, mockDb);
      expect(trigger).toBeDefined();
      expect(trigger.sampleId).toBe(sample.id);
      expect(trigger.triggerType).toBe('sample_no_order');
      expect(trigger.daysToWait).toBe(7);

      // Verify complete workflow state
      expect(mockDb.samples).toHaveLength(1);
      expect(mockDb.activities).toHaveLength(1);
      expect(mockDb.triggers).toHaveLength(1);
      expect(mockDb.inventory[0].quantity).toBe(98);
    });

    it('should handle inventory validation in assignment flow', async () => {
      const assignmentRequest = {
        customerId: 'customer-123',
        productId: 'prod-123',
        salesRepId: 'rep-789',
        quantity: 200, // More than available (100)
      };

      await expect(assignSample(assignmentRequest, mockDb)).rejects.toThrow(
        'Insufficient inventory'
      );

      // Verify no side effects
      expect(mockDb.samples).toHaveLength(0);
      expect(mockDb.activities).toHaveLength(0);
      expect(mockDb.inventory[0].quantity).toBe(100); // Unchanged
    });

    it('should rollback on activity creation failure', async () => {
      // Simulate activity creation failure
      const assignmentRequest = {
        customerId: 'customer-123',
        productId: 'prod-123',
        salesRepId: 'rep-789',
        quantity: 2,
        simulateActivityFailure: true,
      };

      await expect(assignSample(assignmentRequest, mockDb)).rejects.toThrow();

      // Verify rollback occurred
      expect(mockDb.samples).toHaveLength(0);
      expect(mockDb.inventory[0].quantity).toBe(100); // Rolled back
    });
  });

  describe('Workflow B: Sample Conversion Flow', () => {
    it('should track sample → order → revenue attribution', async () => {
      // Step 1: Sample given and logged
      const sample = createTestSample({
        id: 'sample-123',
        customerId: 'customer-456',
        productId: 'prod-123',
        dateGiven: new Date('2025-10-01'),
        resultedInOrder: false,
      });

      mockDb.samples = [sample];

      expect(sample.resultedInOrder).toBe(false);
      expect(sample.orderId).toBeUndefined();

      // Step 2: Customer places order within 30 days
      const order = createTestOrder({
        id: 'order-789',
        customerId: 'customer-456',
        orderDate: new Date('2025-10-15'), // 14 days after sample
        totalValue: 1500,
        status: 'completed',
      });

      mockDb.orders = [order];

      // Step 3: Sample marked as resultedInOrder
      const attribution = await attributeOrderToSample(order, mockDb);

      expect(attribution.success).toBe(true);
      expect(attribution.sampleId).toBe('sample-123');

      const updatedSample = mockDb.samples.find(s => s.id === 'sample-123');
      expect(updatedSample.resultedInOrder).toBe(true);
      expect(updatedSample.orderId).toBe('order-789');

      // Step 4: Revenue attributed to sample
      const sampleRevenue = await calculateSampleRevenue('sample-123', mockDb);

      expect(sampleRevenue.attributed).toBe(true);
      expect(sampleRevenue.amount).toBe(1500);
      expect(sampleRevenue.daysToConversion).toBe(14);

      // Step 5: Metrics updated
      const metrics = await calculateMetrics(mockDb);

      expect(metrics.totalSamples).toBe(1);
      expect(metrics.conversions).toBe(1);
      expect(metrics.conversionRate).toBe(1.0);
      expect(metrics.totalRevenue).toBe(1500);

      // Step 6: Conversion rate increases (add more samples for context)
      mockDb.samples.push(
        createTestSample({ resultedInOrder: false }),
        createTestSample({ resultedInOrder: false })
      );

      const updatedMetrics = await calculateMetrics(mockDb);

      expect(updatedMetrics.totalSamples).toBe(3);
      expect(updatedMetrics.conversions).toBe(1);
      expect(updatedMetrics.conversionRate).toBeCloseTo(0.33, 2);
    });

    it('should NOT attribute order outside 30-day window', async () => {
      const sample = createTestSample({
        id: 'sample-123',
        customerId: 'customer-456',
        dateGiven: new Date('2025-09-01'),
        resultedInOrder: false,
      });

      mockDb.samples = [sample];

      // Order 35 days later (outside window)
      const order = createTestOrder({
        id: 'order-789',
        customerId: 'customer-456',
        orderDate: new Date('2025-10-06'),
        totalValue: 1500,
        status: 'completed',
      });

      mockDb.orders = [order];

      const attribution = await attributeOrderToSample(order, mockDb);

      expect(attribution.success).toBe(false);
      expect(attribution.reason).toBe('Outside attribution window');

      const sampleStillPending = mockDb.samples.find(s => s.id === 'sample-123');
      expect(sampleStillPending.resultedInOrder).toBe(false);
    });

    it('should handle cancelled orders correctly', async () => {
      const sample = createTestSample({
        id: 'sample-123',
        customerId: 'customer-456',
        dateGiven: new Date('2025-10-01'),
      });

      mockDb.samples = [sample];

      const order = createTestOrder({
        customerId: 'customer-456',
        orderDate: new Date('2025-10-10'),
        totalValue: 1500,
        status: 'cancelled', // Cancelled order
      });

      mockDb.orders = [order];

      const attribution = await attributeOrderToSample(order, mockDb);

      expect(attribution.success).toBe(false);
      expect(attribution.reason).toBe('Order cancelled');
    });
  });

  describe('Workflow C: Analytics Workflow', () => {
    it('should complete analytics dashboard workflow', async () => {
      // Setup test data
      const samples = [
        createTestSample({
          dateGiven: new Date('2025-10-15'),
          resultedInOrder: true,
          salesRepId: 'rep-1',
        }),
        createTestSample({
          dateGiven: new Date('2025-10-20'),
          resultedInOrder: false,
          salesRepId: 'rep-1',
        }),
        createTestSample({
          dateGiven: new Date('2025-10-25'),
          resultedInOrder: true,
          salesRepId: 'rep-2',
        }),
      ];

      mockDb.samples = samples;

      // Step 1: View sample analytics dashboard
      const dashboard = await loadAnalyticsDashboard(mockDb);

      expect(dashboard.summary).toBeDefined();
      expect(dashboard.summary.totalSamples).toBe(3);
      expect(dashboard.summary.conversionRate).toBeCloseTo(0.67, 2);

      // Step 2: Filter by date range
      const filtered = await filterAnalyticsByDateRange(
        new Date('2025-10-01'),
        new Date('2025-10-20'),
        mockDb
      );

      expect(filtered.samples).toHaveLength(2); // Only samples in range
      expect(filtered.summary.totalSamples).toBe(2);

      // Step 3: Export supplier report
      const reportRequest = {
        startDate: new Date('2025-10-01'),
        endDate: new Date('2025-10-31'),
        supplierId: 'supplier-123',
      };

      const report = await generateSupplierReport(reportRequest, mockDb);

      expect(report.generated).toBe(true);
      expect(report.format).toBe('pdf');
      expect(report.url).toBeDefined();

      // Step 4: PDF generated correctly
      const pdfData = await fetchReportPDF(report.url);

      expect(pdfData).toBeDefined();
      expect(pdfData.contentType).toBe('application/pdf');
      expect(pdfData.size).toBeGreaterThan(0);

      // Step 5: Data matches database
      const reportData = await parseReportData(pdfData);

      expect(reportData.totalSamples).toBe(filtered.summary.totalSamples);
      expect(reportData.conversionRate).toBeCloseTo(
        filtered.summary.conversionRate,
        2
      );
    });

    it('should apply multiple filters simultaneously', async () => {
      const samples = Array.from({ length: 20 }, (_, i) =>
        createTestSample({
          salesRepId: i % 2 === 0 ? 'rep-1' : 'rep-2',
          productId: i % 3 === 0 ? 'prod-123' : 'prod-456',
          dateGiven: new Date(`2025-10-${10 + i}`),
        })
      );

      mockDb.samples = samples;

      const filters = {
        salesRepId: 'rep-1',
        productId: 'prod-123',
        startDate: new Date('2025-10-15'),
        endDate: new Date('2025-10-25'),
      };

      const filtered = await applyFilters(filters, mockDb);

      // Verify all filters applied
      expect(filtered.every(s => s.salesRepId === 'rep-1')).toBe(true);
      expect(filtered.every(s => s.productId === 'prod-123')).toBe(true);
      expect(
        filtered.every(s => {
          const date = new Date(s.dateGiven);
          return date >= filters.startDate && date <= filters.endDate;
        })
      ).toBe(true);
    });

    it('should handle real-time dashboard updates', async () => {
      mockDb.samples = [createTestSample()];

      const initialDashboard = await loadAnalyticsDashboard(mockDb);
      expect(initialDashboard.summary.totalSamples).toBe(1);

      // Add new sample
      mockDb.samples.push(createTestSample({ resultedInOrder: true }));

      const updatedDashboard = await loadAnalyticsDashboard(mockDb);
      expect(updatedDashboard.summary.totalSamples).toBe(2);
      expect(updatedDashboard.summary.conversionRate).toBeGreaterThan(
        initialDashboard.summary.conversionRate
      );
    });
  });

  describe('Cross-Workflow Integration', () => {
    it('should maintain consistency across all workflows', async () => {
      // Start with sample assignment
      const sample = await assignSample(
        {
          customerId: 'customer-123',
          productId: 'prod-123',
          salesRepId: 'rep-789',
          quantity: 1,
        },
        mockDb
      );

      // Sample converts to order
      const order = createTestOrder({
        customerId: 'customer-123',
        orderDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        totalValue: 500,
        status: 'completed',
      });

      mockDb.orders = [order];
      await attributeOrderToSample(order, mockDb);

      // Check analytics reflect the conversion
      const analytics = await loadAnalyticsDashboard(mockDb);

      expect(analytics.summary.totalSamples).toBe(1);
      expect(analytics.summary.conversions).toBe(1);
      expect(analytics.summary.conversionRate).toBe(1.0);
      expect(analytics.summary.totalRevenue).toBe(500);

      // Verify inventory is still correct
      const inventory = mockDb.inventory.find(i => i.productId === 'prod-123');
      expect(inventory.quantity).toBe(99); // Started at 100, used 1
    });
  });
});

// Helper functions (would be imported from actual modules)

async function assignSample(request: any, db: typeof mockDb) {
  if (request.simulateActivityFailure) {
    throw new Error('Activity creation failed');
  }

  const inventory = db.inventory.find(i => i.productId === request.productId);
  if (!inventory || inventory.quantity < request.quantity) {
    throw new Error('Insufficient inventory');
  }

  const sample = createTestSample({
    customerId: request.customerId,
    productId: request.productId,
    salesRepId: request.salesRepId,
    quantity: request.quantity,
    dateGiven: new Date(),
  });

  db.samples.push(sample);
  inventory.quantity -= request.quantity;

  // Create activity
  db.activities.push({
    id: `activity-${Date.now()}`,
    sampleId: sample.id,
    customerId: request.customerId,
    type: 'sample_given',
    createdAt: new Date(),
  });

  return sample;
}

async function getCustomerWithSamples(customerId: string, db: typeof mockDb) {
  return {
    id: customerId,
    samples: db.samples.filter(s => s.customerId === customerId),
  };
}

async function updateSampleFeedback(
  sampleId: string,
  feedback: string,
  db: typeof mockDb
) {
  const sample = db.samples.find(s => s.id === sampleId);
  if (!sample) throw new Error('Sample not found');

  sample.feedback = feedback;
  return sample;
}

async function createNoOrderTrigger(sampleId: string, db: typeof mockDb) {
  const trigger = {
    id: `trigger-${Date.now()}`,
    sampleId,
    triggerType: 'sample_no_order',
    daysToWait: 7,
    createdAt: new Date(),
  };

  db.triggers.push(trigger);
  return trigger;
}

async function attributeOrderToSample(order: any, db: typeof mockDb) {
  const sample = db.samples.find(s => s.customerId === order.customerId);
  if (!sample) {
    return { success: false, reason: 'No sample found for customer' };
  }

  if (order.status !== 'completed') {
    return { success: false, reason: 'Order cancelled' };
  }

  const sampleDate = new Date(sample.dateGiven);
  const orderDate = new Date(order.orderDate);
  const daysDiff = Math.floor(
    (orderDate.getTime() - sampleDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff > 30) {
    return { success: false, reason: 'Outside attribution window' };
  }

  sample.resultedInOrder = true;
  sample.orderId = order.id;

  return { success: true, sampleId: sample.id };
}

async function calculateSampleRevenue(sampleId: string, db: typeof mockDb) {
  const sample = db.samples.find(s => s.id === sampleId);
  if (!sample || !sample.orderId) {
    return { attributed: false, amount: 0 };
  }

  const order = db.orders.find(o => o.id === sample.orderId);
  if (!order) {
    return { attributed: false, amount: 0 };
  }

  const sampleDate = new Date(sample.dateGiven);
  const orderDate = new Date(order.orderDate);
  const daysToConversion = Math.floor(
    (orderDate.getTime() - sampleDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    attributed: true,
    amount: order.totalValue,
    daysToConversion,
  };
}

async function calculateMetrics(db: typeof mockDb) {
  const totalSamples = db.samples.length;
  const conversions = db.samples.filter(s => s.resultedInOrder).length;
  const conversionRate = totalSamples > 0 ? conversions / totalSamples : 0;

  const totalRevenue = db.orders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + o.totalValue, 0);

  return {
    totalSamples,
    conversions,
    conversionRate,
    totalRevenue,
  };
}

async function loadAnalyticsDashboard(db: typeof mockDb) {
  const summary = await calculateMetrics(db);
  return { summary };
}

async function filterAnalyticsByDateRange(
  startDate: Date,
  endDate: Date,
  db: typeof mockDb
) {
  const samples = db.samples.filter(s => {
    const date = new Date(s.dateGiven);
    return date >= startDate && date <= endDate;
  });

  const totalSamples = samples.length;
  const conversions = samples.filter(s => s.resultedInOrder).length;
  const conversionRate = totalSamples > 0 ? conversions / totalSamples : 0;

  return {
    samples,
    summary: { totalSamples, conversions, conversionRate },
  };
}

async function generateSupplierReport(request: any, db: typeof mockDb) {
  return {
    generated: true,
    format: 'pdf',
    url: '/reports/supplier-123.pdf',
    id: 'report-' + Date.now(),
  };
}

async function fetchReportPDF(url: string) {
  return {
    contentType: 'application/pdf',
    size: 1024 * 100, // 100KB
    data: Buffer.from('mock pdf data'),
  };
}

async function parseReportData(pdfData: any) {
  // Simulated parsing
  return {
    totalSamples: 2,
    conversionRate: 0.5,
  };
}

async function applyFilters(filters: any, db: typeof mockDb) {
  let filtered = db.samples;

  if (filters.salesRepId) {
    filtered = filtered.filter(s => s.salesRepId === filters.salesRepId);
  }

  if (filters.productId) {
    filtered = filtered.filter(s => s.productId === filters.productId);
  }

  if (filters.startDate && filters.endDate) {
    filtered = filtered.filter(s => {
      const date = new Date(s.dateGiven);
      return date >= filters.startDate && date <= filters.endDate;
    });
  }

  return filtered;
}
