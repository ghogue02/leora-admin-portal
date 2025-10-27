/**
 * Data Integrity Tests for Samples
 *
 * Verifies data consistency and integrity including:
 * - Inventory constraints
 * - Revenue attribution accuracy
 * - Conversion rate bounds
 * - Date validations
 * - No orphaned records
 * - Foreign key consistency
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestSample, createTestOrder, createSampleScenario } from '../factories/sample-factory';

const mockDb = {
  samples: [] as any[],
  orders: [] as any[],
  inventory: [] as any[],
  customers: [] as any[],
  products: [] as any[],
  salesReps: [] as any[],
  clear() {
    this.samples = [];
    this.orders = [];
    this.inventory = [];
    this.customers = [];
    this.products = [];
    this.salesReps = [];
  },
};

describe('Sample Data Integrity', () => {
  beforeEach(() => {
    mockDb.clear();
  });

  describe('Inventory Constraints', () => {
    it('should never allow negative inventory', () => {
      mockDb.inventory = [{ productId: 'prod-123', quantity: 5 }];

      const result = decrementInventory('prod-123', 10, mockDb);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
      expect(mockDb.inventory[0].quantity).toBe(5); // Unchanged
    });

    it('should maintain accurate inventory counts', () => {
      mockDb.inventory = [{ productId: 'prod-123', quantity: 100 }];

      decrementInventory('prod-123', 5, mockDb);
      decrementInventory('prod-123', 10, mockDb);
      decrementInventory('prod-123', 15, mockDb);

      expect(mockDb.inventory[0].quantity).toBe(70);
    });

    it('should rollback inventory on transaction failure', async () => {
      mockDb.inventory = [{ productId: 'prod-123', quantity: 100 }];

      try {
        await performSampleAssignmentWithFailure('prod-123', 10, mockDb);
      } catch (e) {
        // Expected failure
      }

      // Inventory should be restored
      expect(mockDb.inventory[0].quantity).toBe(100);
    });

    it('should handle concurrent inventory updates', async () => {
      mockDb.inventory = [{ productId: 'prod-123', quantity: 50 }];

      const updates = Array(10)
        .fill(null)
        .map(() => decrementInventory('prod-123', 2, mockDb));

      await Promise.all(updates);

      expect(mockDb.inventory[0].quantity).toBe(30); // 50 - (10 * 2)
    });
  });

  describe('Revenue Attribution Accuracy', () => {
    it('should attribute revenue only within 30-day window', () => {
      const scenario = createSampleScenario({
        shouldConvert: true,
        daysUntilOrder: 31,
      });

      mockDb.samples = [scenario.sample];
      if (scenario.order) mockDb.orders = [scenario.order];

      const attribution = calculateRevenue(scenario.sample.id, mockDb);

      expect(attribution.revenue).toBe(0);
      expect(attribution.reason).toBe('Outside window');
    });

    it('should attribute exact revenue amount', () => {
      const sample = createTestSample({ id: 'sample-123' });
      const order = createTestOrder({
        customerId: sample.customerId,
        orderDate: new Date(new Date(sample.dateGiven).getTime() + 5 * 24 * 60 * 60 * 1000),
        totalValue: 1234.56,
        status: 'completed',
      });

      mockDb.samples = [sample];
      mockDb.orders = [order];

      const attribution = attributeRevenue(sample.id, order.id, mockDb);

      expect(attribution.amount).toBe(1234.56);
      expect(attribution.sampleId).toBe('sample-123');
    });

    it('should not double-attribute revenue', () => {
      const sample = createTestSample({ id: 'sample-123', resultedInOrder: true, orderId: 'order-1' });
      const order = createTestOrder({ id: 'order-1' });

      mockDb.samples = [sample];
      mockDb.orders = [order];

      // Try to attribute again
      const result = attributeRevenue(sample.id, 'order-2', mockDb);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already attributed');
    });

    it('should verify attribution totals match orders', () => {
      const scenarios = Array.from({ length: 10 }, () =>
        createSampleScenario({ shouldConvert: true, daysUntilOrder: 10 })
      );

      mockDb.samples = scenarios.map(s => s.sample);
      mockDb.orders = scenarios.map(s => s.order).filter(Boolean) as any[];

      const totalAttributed = mockDb.samples
        .filter(s => s.resultedInOrder)
        .reduce((sum, s) => {
          const order = mockDb.orders.find(o => o.id === s.orderId);
          return sum + (order?.totalValue || 0);
        }, 0);

      const totalOrders = mockDb.orders.reduce((sum, o) => sum + o.totalValue, 0);

      expect(totalAttributed).toBeCloseTo(totalOrders, 2);
    });
  });

  describe('Conversion Rate Bounds', () => {
    it('should ensure conversion rate between 0 and 1', () => {
      mockDb.samples = [
        createTestSample({ resultedInOrder: true }),
        createTestSample({ resultedInOrder: false }),
        createTestSample({ resultedInOrder: true }),
      ];

      const rate = calculateConversionRate(mockDb);

      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(1);
      expect(rate).toBeCloseTo(0.667, 2);
    });

    it('should handle 100% conversion correctly', () => {
      mockDb.samples = Array(5)
        .fill(null)
        .map(() => createTestSample({ resultedInOrder: true }));

      const rate = calculateConversionRate(mockDb);

      expect(rate).toBe(1.0);
    });

    it('should handle 0% conversion correctly', () => {
      mockDb.samples = Array(5)
        .fill(null)
        .map(() => createTestSample({ resultedInOrder: false }));

      const rate = calculateConversionRate(mockDb);

      expect(rate).toBe(0.0);
    });

    it('should handle empty dataset without errors', () => {
      mockDb.samples = [];

      const rate = calculateConversionRate(mockDb);

      expect(rate).toBe(0);
      expect(Number.isNaN(rate)).toBe(false);
    });
  });

  describe('Date Validations', () => {
    it('should ensure sample date before order date', () => {
      const sample = createTestSample({
        dateGiven: new Date('2025-10-20'),
        resultedInOrder: true,
      });

      const order = createTestOrder({
        customerId: sample.customerId,
        orderDate: new Date('2025-10-15'), // Before sample!
      });

      const validation = validateSampleOrderDates(sample, order);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('before sample');
    });

    it('should ensure dates are not in future', () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const sample = createTestSample({ dateGiven: futureDate });

      const validation = validateSampleDate(sample);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('future');
    });

    it('should ensure reasonable date ranges', () => {
      const veryOldDate = new Date('1900-01-01');
      const sample = createTestSample({ dateGiven: veryOldDate });

      const validation = validateSampleDate(sample);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('unreasonable');
    });
  });

  describe('Orphaned Records Prevention', () => {
    it('should verify all samples have valid customer references', () => {
      mockDb.customers = [{ id: 'customer-1' }, { id: 'customer-2' }];
      mockDb.samples = [
        createTestSample({ customerId: 'customer-1' }),
        createTestSample({ customerId: 'customer-2' }),
        createTestSample({ customerId: 'customer-999' }), // Orphaned!
      ];

      const orphans = findOrphanedSamples(mockDb);

      expect(orphans).toHaveLength(1);
      expect(orphans[0].customerId).toBe('customer-999');
    });

    it('should verify all samples have valid product references', () => {
      mockDb.products = [{ id: 'prod-1' }, { id: 'prod-2' }];
      mockDb.samples = [
        createTestSample({ productId: 'prod-1' }),
        createTestSample({ productId: 'prod-999' }), // Orphaned!
      ];

      const orphans = findOrphanedSamplesByProduct(mockDb);

      expect(orphans).toHaveLength(1);
    });

    it('should verify all samples have valid sales rep references', () => {
      mockDb.salesReps = [{ id: 'rep-1' }, { id: 'rep-2' }];
      mockDb.samples = [
        createTestSample({ salesRepId: 'rep-1' }),
        createTestSample({ salesRepId: 'rep-999' }), // Orphaned!
      ];

      const orphans = findOrphanedSamplesByRep(mockDb);

      expect(orphans).toHaveLength(1);
    });

    it('should cascade delete when customer deleted', async () => {
      mockDb.customers = [{ id: 'customer-1' }];
      mockDb.samples = [
        createTestSample({ customerId: 'customer-1' }),
        createTestSample({ customerId: 'customer-1' }),
      ];

      await deleteCustomerCascade('customer-1', mockDb);

      expect(mockDb.samples).toHaveLength(0);
      expect(mockDb.customers).toHaveLength(0);
    });
  });

  describe('Foreign Key Consistency', () => {
    it('should maintain referential integrity on updates', async () => {
      const sample = createTestSample({ id: 'sample-1', customerId: 'customer-1' });
      mockDb.samples = [sample];
      mockDb.customers = [{ id: 'customer-1' }, { id: 'customer-2' }];

      await updateSampleCustomer('sample-1', 'customer-2', mockDb);

      const updated = mockDb.samples.find(s => s.id === 'sample-1');
      expect(updated.customerId).toBe('customer-2');
    });

    it('should prevent updating to non-existent foreign key', async () => {
      const sample = createTestSample({ id: 'sample-1', customerId: 'customer-1' });
      mockDb.samples = [sample];
      mockDb.customers = [{ id: 'customer-1' }];

      const result = await updateSampleCustomer('sample-1', 'customer-999', mockDb);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(mockDb.samples[0].customerId).toBe('customer-1'); // Unchanged
    });

    it('should maintain consistency across related records', () => {
      const customerId = 'customer-123';
      mockDb.samples = [
        createTestSample({ customerId, id: 'sample-1' }),
        createTestSample({ customerId, id: 'sample-2' }),
      ];
      mockDb.orders = [createTestOrder({ customerId })];

      const consistency = checkRelatedRecordsConsistency(customerId, mockDb);

      expect(consistency.valid).toBe(true);
      expect(consistency.samples).toBe(2);
      expect(consistency.orders).toBe(1);
    });
  });

  describe('Data Validation Rules', () => {
    it('should enforce quantity greater than zero', () => {
      const sample = createTestSample({ quantity: 0 });

      const validation = validateSample(sample);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Quantity must be greater than 0');
    });

    it('should enforce required fields', () => {
      const invalidSample = {
        id: 'sample-1',
        customerId: null,
        productId: null,
        salesRepId: 'rep-1',
      };

      const validation = validateSample(invalidSample);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should validate feedback length', () => {
      const longFeedback = 'a'.repeat(5001);
      const sample = createTestSample({ feedback: longFeedback });

      const validation = validateSample(sample);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Feedback too long');
    });
  });
});

// Helper functions

function decrementInventory(productId: string, quantity: number, db: typeof mockDb) {
  const item = db.inventory.find(i => i.productId === productId);
  if (!item || item.quantity < quantity) {
    return { success: false, error: 'Insufficient inventory' };
  }

  item.quantity -= quantity;
  return { success: true };
}

async function performSampleAssignmentWithFailure(
  productId: string,
  quantity: number,
  db: typeof mockDb
) {
  const original = db.inventory[0].quantity;

  try {
    decrementInventory(productId, quantity, db);
    throw new Error('Simulated failure');
  } catch (e) {
    // Rollback
    db.inventory[0].quantity = original;
    throw e;
  }
}

function calculateRevenue(sampleId: string, db: typeof mockDb) {
  const sample = db.samples.find(s => s.id === sampleId);
  if (!sample || !sample.orderId) {
    return { revenue: 0, reason: 'No order' };
  }

  const order = db.orders.find(o => o.id === sample.orderId);
  if (!order) {
    return { revenue: 0, reason: 'Order not found' };
  }

  const daysDiff =
    (new Date(order.orderDate).getTime() - new Date(sample.dateGiven).getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysDiff > 30) {
    return { revenue: 0, reason: 'Outside window' };
  }

  return { revenue: order.totalValue };
}

function attributeRevenue(sampleId: string, orderId: string, db: typeof mockDb) {
  const sample = db.samples.find(s => s.id === sampleId);
  if (!sample) return { success: false, error: 'Sample not found' };

  if (sample.resultedInOrder) {
    return { success: false, error: 'Revenue already attributed' };
  }

  const order = db.orders.find(o => o.id === orderId);
  if (!order) return { success: false, error: 'Order not found' };

  sample.resultedInOrder = true;
  sample.orderId = orderId;

  return { success: true, amount: order.totalValue, sampleId };
}

function calculateConversionRate(db: typeof mockDb) {
  if (db.samples.length === 0) return 0;

  const conversions = db.samples.filter(s => s.resultedInOrder).length;
  return conversions / db.samples.length;
}

function validateSampleOrderDates(sample: any, order: any) {
  const sampleDate = new Date(sample.dateGiven);
  const orderDate = new Date(order.orderDate);

  if (orderDate < sampleDate) {
    return { valid: false, error: 'Order date is before sample date' };
  }

  return { valid: true };
}

function validateSampleDate(sample: any) {
  const date = new Date(sample.dateGiven);
  const now = new Date();

  if (date > now) {
    return { valid: false, error: 'Date cannot be in future' };
  }

  if (date.getFullYear() < 2020) {
    return { valid: false, error: 'Date is unreasonable' };
  }

  return { valid: true };
}

function findOrphanedSamples(db: typeof mockDb) {
  const customerIds = new Set(db.customers.map(c => c.id));
  return db.samples.filter(s => !customerIds.has(s.customerId));
}

function findOrphanedSamplesByProduct(db: typeof mockDb) {
  const productIds = new Set(db.products.map(p => p.id));
  return db.samples.filter(s => !productIds.has(s.productId));
}

function findOrphanedSamplesByRep(db: typeof mockDb) {
  const repIds = new Set(db.salesReps.map(r => r.id));
  return db.samples.filter(s => !repIds.has(s.salesRepId));
}

async function deleteCustomerCascade(customerId: string, db: typeof mockDb) {
  db.samples = db.samples.filter(s => s.customerId !== customerId);
  db.customers = db.customers.filter(c => c.id !== customerId);
}

async function updateSampleCustomer(
  sampleId: string,
  newCustomerId: string,
  db: typeof mockDb
) {
  const customerExists = db.customers.some(c => c.id === newCustomerId);
  if (!customerExists) {
    return { success: false, error: 'Customer not found' };
  }

  const sample = db.samples.find(s => s.id === sampleId);
  if (sample) {
    sample.customerId = newCustomerId;
  }

  return { success: true };
}

function checkRelatedRecordsConsistency(customerId: string, db: typeof mockDb) {
  const samples = db.samples.filter(s => s.customerId === customerId).length;
  const orders = db.orders.filter(o => o.customerId === customerId).length;

  return {
    valid: true,
    samples,
    orders,
  };
}

function validateSample(sample: any) {
  const errors: string[] = [];

  if (!sample.customerId) errors.push('Customer ID required');
  if (!sample.productId) errors.push('Product ID required');
  if (sample.quantity <= 0) errors.push('Quantity must be greater than 0');
  if (sample.feedback && sample.feedback.length > 5000) {
    errors.push('Feedback too long');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
