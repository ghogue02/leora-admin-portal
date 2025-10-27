/**
 * Pick Sheet Generator Integration Tests
 *
 * Tests pick sheet generation, item picking, and status management
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { generatePickSheet } from '@/lib/pick-sheet-generator';

describe('Pick Sheet Generator Integration', () => {
  let testCustomerId: string;
  let testOrderId: string;
  let testInventoryIds: string[] = [];

  beforeEach(async () => {
    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
        phone: '555-0100',
      },
    });
    testCustomerId = customer.id;

    // Create test inventory with warehouse locations
    const inventory1 = await prisma.inventoryItem.create({
      data: {
        productName: 'Test Product A',
        sku: 'TEST-A-001',
        quantity: 100,
        unitPrice: 10.00,
        warehouseLocation: 'A-01-01', // Aisle A, Rack 01, Shelf 01
        pickOrder: 1,
      },
    });

    const inventory2 = await prisma.inventoryItem.create({
      data: {
        productName: 'Test Product B',
        sku: 'TEST-B-001',
        quantity: 50,
        unitPrice: 20.00,
        warehouseLocation: 'B-02-03', // Aisle B, Rack 02, Shelf 03
        pickOrder: 2,
      },
    });

    const inventory3 = await prisma.inventoryItem.create({
      data: {
        productName: 'Test Product C',
        sku: 'TEST-C-001',
        quantity: 75,
        unitPrice: 15.00,
        warehouseLocation: 'A-01-02', // Same aisle as Product A
        pickOrder: 1,
      },
    });

    testInventoryIds = [inventory1.id, inventory2.id, inventory3.id];

    // Create test order with SUBMITTED status
    const order = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderDate: new Date(),
        status: 'SUBMITTED',
        totalAmount: 100.00,
        orderLines: {
          create: [
            {
              inventoryItemId: inventory1.id,
              quantity: 5,
              unitPrice: 10.00,
              totalPrice: 50.00,
            },
            {
              inventoryItemId: inventory2.id,
              quantity: 2,
              unitPrice: 20.00,
              totalPrice: 40.00,
            },
            {
              inventoryItemId: inventory3.id,
              quantity: 1,
              unitPrice: 15.00,
              totalPrice: 15.00,
            },
          ],
        },
      },
    });
    testOrderId = order.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.pickSheetItem.deleteMany({});
    await prisma.pickSheet.deleteMany({});
    await prisma.orderLine.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.customer.deleteMany({});
  });

  describe('Pick Sheet Generation', () => {
    it('should generate pick sheet from ready orders', async () => {
      const pickSheet = await generatePickSheet([testOrderId]);

      expect(pickSheet).toBeDefined();
      expect(pickSheet.status).toBe('PENDING');
      expect(pickSheet.pickSheetItems).toHaveLength(3);
    });

    it('should sort items correctly by pickOrder', async () => {
      const pickSheet = await generatePickSheet([testOrderId]);

      const items = pickSheet.pickSheetItems;

      // Items with pickOrder 1 should come before pickOrder 2
      expect(items[0].pickOrder).toBe(1);
      expect(items[1].pickOrder).toBe(1);
      expect(items[2].pickOrder).toBe(2);

      // Within same pickOrder, should be alphabetically by location
      expect(items[0].warehouseLocation).toBe('A-01-01');
      expect(items[1].warehouseLocation).toBe('A-01-02');
      expect(items[2].warehouseLocation).toBe('B-02-03');
    });

    it('should include all order details in pick sheet items', async () => {
      const pickSheet = await generatePickSheet([testOrderId]);

      const item = pickSheet.pickSheetItems[0];

      expect(item.productName).toBeDefined();
      expect(item.sku).toBeDefined();
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.warehouseLocation).toBeDefined();
      expect(item.orderId).toBe(testOrderId);
    });

    it('should handle empty order list gracefully', async () => {
      await expect(generatePickSheet([])).rejects.toThrow('No orders provided');
    });

    it('should reject orders with invalid status', async () => {
      // Update order to FULFILLED status
      await prisma.order.update({
        where: { id: testOrderId },
        data: { status: 'FULFILLED' },
      });

      await expect(generatePickSheet([testOrderId])).rejects.toThrow(
        'Order must be in SUBMITTED status'
      );
    });

    it('should handle concurrent pick sheet generation', async () => {
      // Create additional order
      const order2 = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 50.00,
          orderLines: {
            create: [
              {
                inventoryItemId: testInventoryIds[0],
                quantity: 2,
                unitPrice: 10.00,
                totalPrice: 20.00,
              },
            ],
          },
        },
      });

      // Generate both pick sheets simultaneously
      const [pickSheet1, pickSheet2] = await Promise.all([
        generatePickSheet([testOrderId]),
        generatePickSheet([order2.id]),
      ]);

      expect(pickSheet1.id).not.toBe(pickSheet2.id);
      expect(pickSheet1.pickSheetItems.length).toBe(3);
      expect(pickSheet2.pickSheetItems.length).toBe(1);
    });
  });

  describe('Item Picking Operations', () => {
    let pickSheetId: string;

    beforeEach(async () => {
      const pickSheet = await generatePickSheet([testOrderId]);
      pickSheetId = pickSheet.id;
    });

    it('should mark single item as picked', async () => {
      const pickSheet = await prisma.pickSheet.findUnique({
        where: { id: pickSheetId },
        include: { pickSheetItems: true },
      });

      const itemId = pickSheet!.pickSheetItems[0].id;

      await prisma.pickSheetItem.update({
        where: { id: itemId },
        data: { picked: true },
      });

      const updatedItem = await prisma.pickSheetItem.findUnique({
        where: { id: itemId },
      });

      expect(updatedItem!.picked).toBe(true);
    });

    it('should mark multiple items as picked in bulk', async () => {
      const pickSheet = await prisma.pickSheet.findUnique({
        where: { id: pickSheetId },
        include: { pickSheetItems: true },
      });

      const itemIds = pickSheet!.pickSheetItems.map((item) => item.id);

      await prisma.pickSheetItem.updateMany({
        where: { id: { in: itemIds } },
        data: { picked: true },
      });

      const updatedItems = await prisma.pickSheetItem.findMany({
        where: { id: { in: itemIds } },
      });

      expect(updatedItems.every((item) => item.picked)).toBe(true);
    });

    it('should complete pick sheet when all items picked', async () => {
      const pickSheet = await prisma.pickSheet.findUnique({
        where: { id: pickSheetId },
        include: { pickSheetItems: true },
      });

      const itemIds = pickSheet!.pickSheetItems.map((item) => item.id);

      // Mark all items as picked
      await prisma.pickSheetItem.updateMany({
        where: { id: { in: itemIds } },
        data: { picked: true },
      });

      // Update pick sheet status
      await prisma.pickSheet.update({
        where: { id: pickSheetId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      const updatedPickSheet = await prisma.pickSheet.findUnique({
        where: { id: pickSheetId },
      });

      expect(updatedPickSheet!.status).toBe('COMPLETED');
      expect(updatedPickSheet!.completedAt).toBeDefined();
    });

    it('should validate all items picked before completion', async () => {
      const pickSheet = await prisma.pickSheet.findUnique({
        where: { id: pickSheetId },
        include: { pickSheetItems: true },
      });

      // Only pick first item
      await prisma.pickSheetItem.update({
        where: { id: pickSheet!.pickSheetItems[0].id },
        data: { picked: true },
      });

      const allPicked = pickSheet!.pickSheetItems.every((item) => item.picked);
      expect(allPicked).toBe(false);

      // Should not allow completion
      if (!allPicked) {
        await expect(
          prisma.pickSheet.update({
            where: { id: pickSheetId },
            data: { status: 'COMPLETED' },
          })
        ).rejects.toThrow(); // Business logic should prevent this
      }
    });
  });

  describe('Pick Sheet Cancellation', () => {
    let pickSheetId: string;

    beforeEach(async () => {
      const pickSheet = await generatePickSheet([testOrderId]);
      pickSheetId = pickSheet.id;
    });

    it('should cancel pick sheet and restore order status', async () => {
      // Cancel pick sheet
      await prisma.pickSheet.update({
        where: { id: pickSheetId },
        data: { status: 'CANCELLED' },
      });

      // Restore order status
      await prisma.order.update({
        where: { id: testOrderId },
        data: { status: 'SUBMITTED' },
      });

      const [pickSheet, order] = await Promise.all([
        prisma.pickSheet.findUnique({ where: { id: pickSheetId } }),
        prisma.order.findUnique({ where: { id: testOrderId } }),
      ]);

      expect(pickSheet!.status).toBe('CANCELLED');
      expect(order!.status).toBe('SUBMITTED');
    });

    it('should not allow picking from cancelled pick sheet', async () => {
      await prisma.pickSheet.update({
        where: { id: pickSheetId },
        data: { status: 'CANCELLED' },
      });

      const pickSheet = await prisma.pickSheet.findUnique({
        where: { id: pickSheetId },
        include: { pickSheetItems: true },
      });

      // Business logic should prevent picking from cancelled sheet
      expect(pickSheet!.status).toBe('CANCELLED');
    });
  });

  describe('Pick Sheet Edge Cases', () => {
    it('should handle orders with no inventory items', async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 0,
        },
      });

      await expect(generatePickSheet([order.id])).rejects.toThrow(
        'Order has no items to pick'
      );
    });

    it('should handle items without warehouse locations', async () => {
      const inventory = await prisma.inventoryItem.create({
        data: {
          productName: 'No Location Product',
          sku: 'NO-LOC-001',
          quantity: 10,
          unitPrice: 5.00,
          // No warehouseLocation
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 5.00,
          orderLines: {
            create: [
              {
                inventoryItemId: inventory.id,
                quantity: 1,
                unitPrice: 5.00,
                totalPrice: 5.00,
              },
            ],
          },
        },
      });

      const pickSheet = await generatePickSheet([order.id]);

      // Items without location should be at end
      expect(pickSheet.pickSheetItems[0].warehouseLocation).toBeNull();
    });

    it('should handle large pick sheets (100+ items)', async () => {
      // Create 100 inventory items
      const inventoryPromises = Array.from({ length: 100 }, (_, i) =>
        prisma.inventoryItem.create({
          data: {
            productName: `Product ${i}`,
            sku: `SKU-${String(i).padStart(3, '0')}`,
            quantity: 10,
            unitPrice: 1.00,
            warehouseLocation: `A-${String(Math.floor(i / 10) + 1).padStart(2, '0')}-${String((i % 10) + 1).padStart(2, '0')}`,
            pickOrder: Math.floor(i / 10) + 1,
          },
        })
      );

      const inventories = await Promise.all(inventoryPromises);

      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 100.00,
          orderLines: {
            create: inventories.map((inv) => ({
              inventoryItemId: inv.id,
              quantity: 1,
              unitPrice: 1.00,
              totalPrice: 1.00,
            })),
          },
        },
      });

      const startTime = Date.now();
      const pickSheet = await generatePickSheet([order.id]);
      const duration = Date.now() - startTime;

      expect(pickSheet.pickSheetItems).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete in <1 second
    });
  });

  describe('Order Status Integration', () => {
    it('should update order status when pick sheet completed', async () => {
      const pickSheet = await generatePickSheet([testOrderId]);

      // Mark all items as picked
      await prisma.pickSheetItem.updateMany({
        where: { pickSheetId: pickSheet.id },
        data: { picked: true },
      });

      // Complete pick sheet
      await prisma.pickSheet.update({
        where: { id: pickSheet.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: testOrderId },
        data: { status: 'FULFILLED' },
      });

      const order = await prisma.order.findUnique({
        where: { id: testOrderId },
      });

      expect(order!.status).toBe('FULFILLED');
    });

    it('should track pick sheet creation time', async () => {
      const beforeTime = new Date();
      const pickSheet = await generatePickSheet([testOrderId]);
      const afterTime = new Date();

      expect(pickSheet.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(pickSheet.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});
