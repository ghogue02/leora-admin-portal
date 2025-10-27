/**
 * Inventory Transaction Integration Tests
 *
 * Tests all inventory transaction operations including:
 * - Allocation with race conditions
 * - Release scenarios
 * - Shipment processing
 * - Inventory adjustments
 * - Error handling and rollback
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  allocateInventory,
  releaseInventory,
  shipInventory,
  adjustInventory,
  getAvailableInventory,
  canAllocateOrder,
  InsufficientInventoryError,
  InventoryNotFoundError,
  InventoryError,
} from '../inventory';
import { prisma } from '../prisma';

// Test data
const TEST_TENANT_ID = 'test-tenant-id';
const TEST_SKU_ID = 'test-sku-id';
const TEST_ORDER_ID = 'test-order-id';
const TEST_CUSTOMER_ID = 'test-customer-id';
const TEST_USER_ID = 'test-user-id';

describe('Inventory Transaction Service', () => {
  // Setup: Create test data before each test
  beforeEach(async () => {
    // Create tenant
    await prisma.tenant.upsert({
      where: { id: TEST_TENANT_ID },
      update: {},
      create: {
        id: TEST_TENANT_ID,
        slug: 'test-tenant',
        name: 'Test Tenant',
      },
    });

    // Create customer
    await prisma.customer.upsert({
      where: { id: TEST_CUSTOMER_ID },
      update: {},
      create: {
        id: TEST_CUSTOMER_ID,
        tenantId: TEST_TENANT_ID,
        name: 'Test Customer',
      },
    });

    // Create product and SKU
    const product = await prisma.product.upsert({
      where: { tenantId_name: { tenantId: TEST_TENANT_ID, name: 'Test Product' } },
      update: {},
      create: {
        tenantId: TEST_TENANT_ID,
        name: 'Test Product',
      },
    });

    await prisma.sku.upsert({
      where: { id: TEST_SKU_ID },
      update: {},
      create: {
        id: TEST_SKU_ID,
        tenantId: TEST_TENANT_ID,
        productId: product.id,
        code: 'TEST-SKU-001',
      },
    });

    // Create initial inventory
    await prisma.inventory.upsert({
      where: {
        tenantId_skuId_location: {
          tenantId: TEST_TENANT_ID,
          skuId: TEST_SKU_ID,
          location: 'main',
        },
      },
      update: {
        onHand: 100,
        allocated: 0,
      },
      create: {
        tenantId: TEST_TENANT_ID,
        skuId: TEST_SKU_ID,
        location: 'main',
        onHand: 100,
        allocated: 0,
      },
    });
  });

  // Cleanup: Remove test data after each test
  afterEach(async () => {
    await prisma.auditLog.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.orderLine.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.order.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.inventory.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.sku.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.product.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.customer.deleteMany({ where: { tenantId: TEST_TENANT_ID } });
    await prisma.tenant.deleteMany({ where: { id: TEST_TENANT_ID } });
  });

  describe('allocateInventory', () => {
    it('should successfully allocate inventory for an order', async () => {
      // Create order
      const order = await prisma.order.create({
        data: {
          id: TEST_ORDER_ID,
          tenantId: TEST_TENANT_ID,
          customerId: TEST_CUSTOMER_ID,
          status: 'DRAFT',
          lines: {
            create: [
              {
                tenantId: TEST_TENANT_ID,
                skuId: TEST_SKU_ID,
                quantity: 10,
                unitPrice: 50,
              },
            ],
          },
        },
      });

      // Allocate inventory
      await allocateInventory(
        TEST_ORDER_ID,
        [{ skuId: TEST_SKU_ID, quantity: 10 }],
        'main',
        TEST_USER_ID
      );

      // Verify inventory updated
      const inventory = await prisma.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: TEST_TENANT_ID,
            skuId: TEST_SKU_ID,
            location: 'main',
          },
        },
      });

      expect(inventory?.onHand).toBe(100);
      expect(inventory?.allocated).toBe(10);

      // Verify order status updated
      const updatedOrder = await prisma.order.findUnique({
        where: { id: TEST_ORDER_ID },
      });

      expect(updatedOrder?.status).toBe('SUBMITTED');
      expect(updatedOrder?.orderedAt).toBeTruthy();

      // Verify audit log created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          entityType: 'Inventory',
          action: 'ALLOCATION',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });

    it('should throw InsufficientInventoryError when inventory is insufficient', async () => {
      // Create order with quantity exceeding available inventory
      await prisma.order.create({
        data: {
          id: TEST_ORDER_ID,
          tenantId: TEST_TENANT_ID,
          customerId: TEST_CUSTOMER_ID,
          status: 'DRAFT',
          lines: {
            create: [
              {
                tenantId: TEST_TENANT_ID,
                skuId: TEST_SKU_ID,
                quantity: 150, // More than available (100)
                unitPrice: 50,
              },
            ],
          },
        },
      });

      await expect(
        allocateInventory(
          TEST_ORDER_ID,
          [{ skuId: TEST_SKU_ID, quantity: 150 }],
          'main'
        )
      ).rejects.toThrow(InsufficientInventoryError);

      // Verify inventory unchanged
      const inventory = await prisma.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: TEST_TENANT_ID,
            skuId: TEST_SKU_ID,
            location: 'main',
          },
        },
      });

      expect(inventory?.allocated).toBe(0);

      // Verify order status unchanged
      const order = await prisma.order.findUnique({
        where: { id: TEST_ORDER_ID },
      });

      expect(order?.status).toBe('DRAFT');
    });

    it('should handle concurrent allocation attempts (race condition)', async () => {
      // Create two orders
      const order1 = await prisma.order.create({
        data: {
          id: `${TEST_ORDER_ID}-1`,
          tenantId: TEST_TENANT_ID,
          customerId: TEST_CUSTOMER_ID,
          status: 'DRAFT',
          lines: {
            create: [
              {
                tenantId: TEST_TENANT_ID,
                skuId: TEST_SKU_ID,
                quantity: 60,
                unitPrice: 50,
              },
            ],
          },
        },
      });

      const order2 = await prisma.order.create({
        data: {
          id: `${TEST_ORDER_ID}-2`,
          tenantId: TEST_TENANT_ID,
          customerId: TEST_CUSTOMER_ID,
          status: 'DRAFT',
          lines: {
            create: [
              {
                tenantId: TEST_TENANT_ID,
                skuId: TEST_SKU_ID,
                quantity: 60,
                unitPrice: 50,
              },
            ],
          },
        },
      });

      // Try to allocate both concurrently (total 120 > 100 available)
      const results = await Promise.allSettled([
        allocateInventory(
          `${TEST_ORDER_ID}-1`,
          [{ skuId: TEST_SKU_ID, quantity: 60 }],
          'main'
        ),
        allocateInventory(
          `${TEST_ORDER_ID}-2`,
          [{ skuId: TEST_SKU_ID, quantity: 60 }],
          'main'
        ),
      ]);

      // One should succeed, one should fail
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      // Verify inventory state is consistent
      const inventory = await prisma.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: TEST_TENANT_ID,
            skuId: TEST_SKU_ID,
            location: 'main',
          },
        },
      });

      expect(inventory?.allocated).toBe(60); // Only one allocation succeeded
    });
  });

  describe('releaseInventory', () => {
    it('should successfully release allocated inventory', async () => {
      // Create and allocate order
      const order = await prisma.order.create({
        data: {
          id: TEST_ORDER_ID,
          tenantId: TEST_TENANT_ID,
          customerId: TEST_CUSTOMER_ID,
          status: 'DRAFT',
          lines: {
            create: [
              {
                tenantId: TEST_TENANT_ID,
                skuId: TEST_SKU_ID,
                quantity: 10,
                unitPrice: 50,
              },
            ],
          },
        },
      });

      await allocateInventory(
        TEST_ORDER_ID,
        [{ skuId: TEST_SKU_ID, quantity: 10 }],
        'main'
      );

      // Release inventory
      await releaseInventory(TEST_ORDER_ID, 'main', TEST_USER_ID);

      // Verify inventory released
      const inventory = await prisma.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: TEST_TENANT_ID,
            skuId: TEST_SKU_ID,
            location: 'main',
          },
        },
      });

      expect(inventory?.allocated).toBe(0);

      // Verify order cancelled
      const updatedOrder = await prisma.order.findUnique({
        where: { id: TEST_ORDER_ID },
      });

      expect(updatedOrder?.status).toBe('CANCELLED');

      // Verify audit log
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          entityType: 'Inventory',
          action: 'RELEASE',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
    });
  });

  describe('shipInventory', () => {
    it('should successfully ship order and deduct inventory', async () => {
      // Create and allocate order
      await prisma.order.create({
        data: {
          id: TEST_ORDER_ID,
          tenantId: TEST_TENANT_ID,
          customerId: TEST_CUSTOMER_ID,
          status: 'DRAFT',
          lines: {
            create: [
              {
                tenantId: TEST_TENANT_ID,
                skuId: TEST_SKU_ID,
                quantity: 10,
                unitPrice: 50,
              },
            ],
          },
        },
      });

      await allocateInventory(
        TEST_ORDER_ID,
        [{ skuId: TEST_SKU_ID, quantity: 10 }],
        'main'
      );

      // Ship order
      const trackingNumber = 'TRACK-12345';
      await shipInventory(TEST_ORDER_ID, trackingNumber, 'main', TEST_USER_ID);

      // Verify inventory deducted
      const inventory = await prisma.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: TEST_TENANT_ID,
            skuId: TEST_SKU_ID,
            location: 'main',
          },
        },
      });

      expect(inventory?.onHand).toBe(90); // 100 - 10
      expect(inventory?.allocated).toBe(0); // Released

      // Verify order fulfilled
      const order = await prisma.order.findUnique({
        where: { id: TEST_ORDER_ID },
      });

      expect(order?.status).toBe('FULFILLED');
      expect(order?.fulfilledAt).toBeTruthy();

      // Verify audit log contains tracking number
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          tenantId: TEST_TENANT_ID,
          entityType: 'Inventory',
          action: 'SHIPMENT',
        },
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].changes).toMatchObject({
        trackingNumber,
      });
    });

    it('should throw error when shipping non-submitted order', async () => {
      // Create order (not allocated)
      await prisma.order.create({
        data: {
          id: TEST_ORDER_ID,
          tenantId: TEST_TENANT_ID,
          customerId: TEST_CUSTOMER_ID,
          status: 'DRAFT',
          lines: {
            create: [
              {
                tenantId: TEST_TENANT_ID,
                skuId: TEST_SKU_ID,
                quantity: 10,
                unitPrice: 50,
              },
            ],
          },
        },
      });

      await expect(
        shipInventory(TEST_ORDER_ID, 'TRACK-123', 'main')
      ).rejects.toThrow(InventoryError);
    });
  });

  describe('adjustInventory', () => {
    it('should successfully add inventory', async () => {
      const reason = 'Stock replenishment';
      await adjustInventory(
        TEST_TENANT_ID,
        TEST_SKU_ID,
        50,
        reason,
        'main',
        TEST_USER_ID
      );

      const inventory = await prisma.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: TEST_TENANT_ID,
            skuId: TEST_SKU_ID,
            location: 'main',
          },
        },
      });

      expect(inventory?.onHand).toBe(150); // 100 + 50
    });

    it('should successfully subtract inventory', async () => {
      const reason = 'Damaged goods';
      await adjustInventory(
        TEST_TENANT_ID,
        TEST_SKU_ID,
        -30,
        reason,
        'main',
        TEST_USER_ID
      );

      const inventory = await prisma.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: TEST_TENANT_ID,
            skuId: TEST_SKU_ID,
            location: 'main',
          },
        },
      });

      expect(inventory?.onHand).toBe(70); // 100 - 30
    });

    it('should create inventory record if it does not exist', async () => {
      const newSkuId = 'new-sku-id';

      // Create new SKU
      const product = await prisma.product.findFirst({
        where: { tenantId: TEST_TENANT_ID },
      });

      await prisma.sku.create({
        data: {
          id: newSkuId,
          tenantId: TEST_TENANT_ID,
          productId: product!.id,
          code: 'NEW-SKU-001',
        },
      });

      const reason = 'Initial stock';
      await adjustInventory(TEST_TENANT_ID, newSkuId, 100, reason, 'main');

      const inventory = await prisma.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: TEST_TENANT_ID,
            skuId: newSkuId,
            location: 'main',
          },
        },
      });

      expect(inventory).toBeTruthy();
      expect(inventory?.onHand).toBe(100);
    });
  });

  describe('getAvailableInventory', () => {
    it('should return correct available quantity', async () => {
      const available = await getAvailableInventory(
        TEST_TENANT_ID,
        TEST_SKU_ID,
        'main'
      );

      expect(available).toBe(100);
    });

    it('should return 0 for non-existent inventory', async () => {
      const available = await getAvailableInventory(
        TEST_TENANT_ID,
        'non-existent-sku',
        'main'
      );

      expect(available).toBe(0);
    });
  });

  describe('canAllocateOrder', () => {
    it('should return true when sufficient inventory exists', async () => {
      await prisma.order.create({
        data: {
          id: TEST_ORDER_ID,
          tenantId: TEST_TENANT_ID,
          customerId: TEST_CUSTOMER_ID,
          status: 'DRAFT',
          lines: {
            create: [
              {
                tenantId: TEST_TENANT_ID,
                skuId: TEST_SKU_ID,
                quantity: 50,
                unitPrice: 50,
              },
            ],
          },
        },
      });

      const result = await canAllocateOrder(TEST_ORDER_ID, 'main');

      expect(result.canAllocate).toBe(true);
      expect(result.details[0].sufficient).toBe(true);
    });

    it('should return false when insufficient inventory exists', async () => {
      await prisma.order.create({
        data: {
          id: TEST_ORDER_ID,
          tenantId: TEST_TENANT_ID,
          customerId: TEST_CUSTOMER_ID,
          status: 'DRAFT',
          lines: {
            create: [
              {
                tenantId: TEST_TENANT_ID,
                skuId: TEST_SKU_ID,
                quantity: 150,
                unitPrice: 50,
              },
            ],
          },
        },
      });

      const result = await canAllocateOrder(TEST_ORDER_ID, 'main');

      expect(result.canAllocate).toBe(false);
      expect(result.details[0].sufficient).toBe(false);
    });
  });
});
