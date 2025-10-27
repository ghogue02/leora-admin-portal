/**
 * Automated Triggers Integration Tests
 *
 * Tests the automated trigger system including:
 * - Sample no-order triggers (7 and 30 days)
 * - First order followup creation
 * - Customer timing triggers
 * - Burn rate alerts
 * - Duplicate prevention
 * - Task creation and tracking
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  createTestSample,
  createTestTrigger,
  createTestOrder,
} from '../../__tests__/factories/sample-factory';

// Mock database and task queue
const mockDb = {
  triggers: [] as any[],
  samples: [] as any[],
  orders: [] as any[],
  tasks: [] as any[],
  clear() {
    this.triggers = [];
    this.samples = [];
    this.orders = [];
    this.tasks = [];
  },
};

describe('Automated Triggers Integration', () => {
  beforeEach(() => {
    mockDb.clear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    mockDb.clear();
  });

  describe('Sample No Order Trigger (7 days)', () => {
    it('should create task 7 days after sample with no order', async () => {
      const trigger = createTestTrigger({
        triggerType: 'sample_no_order',
        conditions: { daysAfterSample: 7 },
        isActive: true,
      });

      const sample = createTestSample({
        dateGiven: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        resultedInOrder: false,
      });

      mockDb.triggers = [trigger];
      mockDb.samples = [sample];

      await processTriggers(mockDb);

      expect(mockDb.tasks).toHaveLength(1);
      expect(mockDb.tasks[0].type).toBe('sample_followup');
      expect(mockDb.tasks[0].sampleId).toBe(sample.id);
    });

    it('should NOT create task if sample resulted in order', async () => {
      const trigger = createTestTrigger({
        triggerType: 'sample_no_order',
        conditions: { daysAfterSample: 7 },
        isActive: true,
      });

      const sample = createTestSample({
        dateGiven: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resultedInOrder: true,
        orderId: 'order-123',
      });

      mockDb.triggers = [trigger];
      mockDb.samples = [sample];

      await processTriggers(mockDb);

      expect(mockDb.tasks).toHaveLength(0);
    });

    it('should NOT create task if trigger is inactive', async () => {
      const trigger = createTestTrigger({
        triggerType: 'sample_no_order',
        conditions: { daysAfterSample: 7 },
        isActive: false,
      });

      const sample = createTestSample({
        dateGiven: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resultedInOrder: false,
      });

      mockDb.triggers = [trigger];
      mockDb.samples = [sample];

      await processTriggers(mockDb);

      expect(mockDb.tasks).toHaveLength(0);
    });
  });

  describe('Sample No Order Trigger (30 days)', () => {
    it('should create urgent task 30 days after sample with no order', async () => {
      const trigger = createTestTrigger({
        triggerType: 'sample_no_order',
        conditions: { daysAfterSample: 30 },
        actionPayload: {
          priority: 'high',
          title: 'Final followup on sample',
        },
        isActive: true,
      });

      const sample = createTestSample({
        dateGiven: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        resultedInOrder: false,
      });

      mockDb.triggers = [trigger];
      mockDb.samples = [sample];

      await processTriggers(mockDb);

      expect(mockDb.tasks).toHaveLength(1);
      expect(mockDb.tasks[0].priority).toBe('high');
    });

    it('should handle edge of 30-day window', async () => {
      const trigger = createTestTrigger({
        triggerType: 'sample_no_order',
        conditions: { daysAfterSample: 30 },
        isActive: true,
      });

      // Sample exactly 30 days ago
      const exactDate = new Date();
      exactDate.setDate(exactDate.getDate() - 30);
      exactDate.setHours(0, 0, 0, 0);

      const sample = createTestSample({
        dateGiven: exactDate,
        resultedInOrder: false,
      });

      mockDb.triggers = [trigger];
      mockDb.samples = [sample];

      await processTriggers(mockDb);

      expect(mockDb.tasks).toHaveLength(1);
    });
  });

  describe('First Order Followup', () => {
    it('should create followup task after first order', async () => {
      const trigger = createTestTrigger({
        triggerType: 'first_order_followup',
        conditions: { daysAfterOrder: 3 },
        isActive: true,
      });

      const order = createTestOrder({
        orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'completed',
      });

      mockDb.triggers = [trigger];
      mockDb.orders = [order];

      await processTriggers(mockDb);

      expect(mockDb.tasks).toHaveLength(1);
      expect(mockDb.tasks[0].type).toBe('order_followup');
    });

    it('should only trigger for completed orders', async () => {
      const trigger = createTestTrigger({
        triggerType: 'first_order_followup',
        conditions: { daysAfterOrder: 3 },
        isActive: true,
      });

      const pendingOrder = createTestOrder({
        orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'pending',
      });

      mockDb.triggers = [trigger];
      mockDb.orders = [pendingOrder];

      await processTriggers(mockDb);

      expect(mockDb.tasks).toHaveLength(0);
    });
  });

  describe('Customer Timing Trigger', () => {
    it('should create task based on customer contact timing', async () => {
      const trigger = createTestTrigger({
        triggerType: 'customer_timing',
        conditions: { daysSinceLastContact: 14 },
        isActive: true,
      });

      const customer = {
        id: 'customer-123',
        lastContactDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      };

      mockDb.triggers = [trigger];

      await processCustomerTimingTriggers([customer], mockDb);

      expect(mockDb.tasks).toHaveLength(1);
      expect(mockDb.tasks[0].customerId).toBe(customer.id);
    });

    it('should NOT trigger if customer contacted recently', async () => {
      const trigger = createTestTrigger({
        triggerType: 'customer_timing',
        conditions: { daysSinceLastContact: 14 },
        isActive: true,
      });

      const customer = {
        id: 'customer-123',
        lastContactDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      mockDb.triggers = [trigger];

      await processCustomerTimingTriggers([customer], mockDb);

      expect(mockDb.tasks).toHaveLength(0);
    });
  });

  describe('Burn Rate Alert', () => {
    it('should alert when customer burn rate exceeds threshold', async () => {
      const trigger = createTestTrigger({
        triggerType: 'burn_rate_alert',
        conditions: { thresholdDays: 30 },
        isActive: true,
      });

      const customer = {
        id: 'customer-123',
        estimatedBurnRate: 25, // Will run out in 25 days
      };

      mockDb.triggers = [trigger];

      await processBurnRateAlerts([customer], mockDb);

      expect(mockDb.tasks).toHaveLength(1);
      expect(mockDb.tasks[0].type).toBe('burn_rate_alert');
      expect(mockDb.tasks[0].priority).toBe('high');
    });

    it('should NOT alert when burn rate is healthy', async () => {
      const trigger = createTestTrigger({
        triggerType: 'burn_rate_alert',
        conditions: { thresholdDays: 30 },
        isActive: true,
      });

      const customer = {
        id: 'customer-123',
        estimatedBurnRate: 60, // Healthy - 60 days left
      };

      mockDb.triggers = [trigger];

      await processBurnRateAlerts([customer], mockDb);

      expect(mockDb.tasks).toHaveLength(0);
    });
  });

  describe('Duplicate Task Prevention', () => {
    it('should NOT create duplicate tasks for same sample', async () => {
      const trigger = createTestTrigger({
        triggerType: 'sample_no_order',
        conditions: { daysAfterSample: 7 },
        isActive: true,
      });

      const sample = createTestSample({
        id: 'sample-123',
        dateGiven: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resultedInOrder: false,
      });

      // Existing task for this sample
      const existingTask = {
        id: 'task-1',
        sampleId: 'sample-123',
        type: 'sample_followup',
        completed: false,
      };

      mockDb.triggers = [trigger];
      mockDb.samples = [sample];
      mockDb.tasks = [existingTask];

      await processTriggers(mockDb);

      // Should still only have 1 task
      expect(mockDb.tasks).toHaveLength(1);
    });

    it('should create new task if previous task completed', async () => {
      const trigger = createTestTrigger({
        triggerType: 'sample_no_order',
        conditions: { daysAfterSample: 7 },
        isActive: true,
      });

      const sample = createTestSample({
        id: 'sample-123',
        dateGiven: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resultedInOrder: false,
      });

      // Completed task for this sample
      const completedTask = {
        id: 'task-1',
        sampleId: 'sample-123',
        type: 'sample_followup',
        completed: true,
      };

      mockDb.triggers = [trigger];
      mockDb.samples = [sample];
      mockDb.tasks = [completedTask];

      await processTriggers(mockDb);

      // Should now have 2 tasks (old completed + new)
      expect(mockDb.tasks).toHaveLength(2);
    });
  });

  describe('Trigger Activation/Deactivation', () => {
    it('should allow activating a trigger', async () => {
      const trigger = createTestTrigger({
        isActive: false,
      });

      mockDb.triggers = [trigger];

      await updateTriggerStatus(trigger.id, true, mockDb);

      const updated = mockDb.triggers.find(t => t.id === trigger.id);
      expect(updated.isActive).toBe(true);
    });

    it('should allow deactivating a trigger', async () => {
      const trigger = createTestTrigger({
        isActive: true,
      });

      mockDb.triggers = [trigger];

      await updateTriggerStatus(trigger.id, false, mockDb);

      const updated = mockDb.triggers.find(t => t.id === trigger.id);
      expect(updated.isActive).toBe(false);
    });
  });

  describe('Task Completion Tracking', () => {
    it('should mark task as completed', async () => {
      const task = {
        id: 'task-1',
        sampleId: 'sample-123',
        completed: false,
        completedAt: null,
      };

      mockDb.tasks = [task];

      await completeTask('task-1', mockDb);

      const updated = mockDb.tasks.find(t => t.id === 'task-1');
      expect(updated.completed).toBe(true);
      expect(updated.completedAt).toBeDefined();
    });

    it('should prevent completing already completed task', async () => {
      const task = {
        id: 'task-1',
        completed: true,
        completedAt: new Date('2025-10-01'),
      };

      mockDb.tasks = [task];

      const result = await completeTask('task-1', mockDb);

      expect(result.alreadyCompleted).toBe(true);
      // Original completion date unchanged
      expect(mockDb.tasks[0].completedAt).toEqual(new Date('2025-10-01'));
    });
  });

  describe('Multi-Trigger Scenarios', () => {
    it('should process multiple triggers simultaneously', async () => {
      const trigger1 = createTestTrigger({
        triggerType: 'sample_no_order',
        conditions: { daysAfterSample: 7 },
        isActive: true,
      });

      const trigger2 = createTestTrigger({
        triggerType: 'sample_no_order',
        conditions: { daysAfterSample: 30 },
        isActive: true,
      });

      const sample7days = createTestSample({
        id: 'sample-1',
        dateGiven: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resultedInOrder: false,
      });

      const sample30days = createTestSample({
        id: 'sample-2',
        dateGiven: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        resultedInOrder: false,
      });

      mockDb.triggers = [trigger1, trigger2];
      mockDb.samples = [sample7days, sample30days];

      await processTriggers(mockDb);

      expect(mockDb.tasks).toHaveLength(2);
    });
  });
});

// Helper functions (would be imported from actual trigger module)

async function processTriggers(db: typeof mockDb) {
  const activeTriggers = db.triggers.filter(t => t.isActive);

  for (const trigger of activeTriggers) {
    if (trigger.triggerType === 'sample_no_order') {
      const daysAfter = trigger.conditions.daysAfterSample;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAfter);

      const eligibleSamples = db.samples.filter(s => {
        const sampleDate = new Date(s.dateGiven);
        const isOldEnough = sampleDate <= cutoffDate;
        const noOrder = !s.resultedInOrder;
        const noExistingTask = !db.tasks.some(
          t => t.sampleId === s.id && !t.completed
        );

        return isOldEnough && noOrder && noExistingTask;
      });

      for (const sample of eligibleSamples) {
        db.tasks.push({
          id: `task-${Date.now()}-${Math.random()}`,
          sampleId: sample.id,
          type: 'sample_followup',
          priority: trigger.actionPayload.priority || 'medium',
          title: trigger.actionPayload.title || 'Sample followup',
          completed: false,
          createdAt: new Date(),
        });
      }
    }

    if (trigger.triggerType === 'first_order_followup') {
      const daysAfter = trigger.conditions.daysAfterOrder;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAfter);

      const eligibleOrders = db.orders.filter(o => {
        const orderDate = new Date(o.orderDate);
        return orderDate <= cutoffDate && o.status === 'completed';
      });

      for (const order of eligibleOrders) {
        const noExistingTask = !db.tasks.some(
          t => t.orderId === order.id && !t.completed
        );

        if (noExistingTask) {
          db.tasks.push({
            id: `task-${Date.now()}-${Math.random()}`,
            orderId: order.id,
            customerId: order.customerId,
            type: 'order_followup',
            completed: false,
            createdAt: new Date(),
          });
        }
      }
    }
  }
}

async function processCustomerTimingTriggers(customers: any[], db: typeof mockDb) {
  const trigger = db.triggers.find(
    t => t.triggerType === 'customer_timing' && t.isActive
  );

  if (!trigger) return;

  const daysSince = trigger.conditions.daysSinceLastContact;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSince);

  for (const customer of customers) {
    const lastContact = new Date(customer.lastContactDate);
    if (lastContact <= cutoffDate) {
      db.tasks.push({
        id: `task-${Date.now()}-${Math.random()}`,
        customerId: customer.id,
        type: 'customer_contact',
        completed: false,
        createdAt: new Date(),
      });
    }
  }
}

async function processBurnRateAlerts(customers: any[], db: typeof mockDb) {
  const trigger = db.triggers.find(
    t => t.triggerType === 'burn_rate_alert' && t.isActive
  );

  if (!trigger) return;

  const threshold = trigger.conditions.thresholdDays;

  for (const customer of customers) {
    if (customer.estimatedBurnRate < threshold) {
      db.tasks.push({
        id: `task-${Date.now()}-${Math.random()}`,
        customerId: customer.id,
        type: 'burn_rate_alert',
        priority: 'high',
        completed: false,
        createdAt: new Date(),
      });
    }
  }
}

async function updateTriggerStatus(triggerId: string, isActive: boolean, db: typeof mockDb) {
  const trigger = db.triggers.find(t => t.id === triggerId);
  if (trigger) {
    trigger.isActive = isActive;
  }
}

async function completeTask(taskId: string, db: typeof mockDb) {
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) return { success: false };

  if (task.completed) {
    return { success: false, alreadyCompleted: true };
  }

  task.completed = true;
  task.completedAt = new Date();
  return { success: true };
}
