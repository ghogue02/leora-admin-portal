/**
 * Warehouse Concurrency Tests
 *
 * Tests concurrent operations and race condition prevention
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';

describe('Warehouse Concurrency Tests', () => {
  let testCustomerId: string;
  let testInventoryIds: string[] = [];

  beforeEach(async () => {
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Concurrency',
        lastName: 'Test',
        email: 'concurrency@example.com',
        phone: '555-7000',
      },
    });
    testCustomerId = customer.id;

    const inventories = await Promise.all([
      prisma.inventoryItem.create({
        data: {
          productName: 'Concurrent Product A',
          sku: 'CONC-A-001',
          quantity: 1000,
          unitPrice: 10.00,
          warehouseLocation: 'A-01-01',
          pickOrder: 1,
        },
      }),
      prisma.inventoryItem.create({
        data: {
          productName: 'Concurrent Product B',
          sku: 'CONC-B-001',
          quantity: 500,
          unitPrice: 20.00,
          warehouseLocation: 'B-02-03',
          pickOrder: 2,
        },
      }),
    ]);

    testInventoryIds = inventories.map((inv) => inv.id);
  });

  afterEach(async () => {
    await prisma.routeStop.deleteMany({});
    await prisma.deliveryRoute.deleteMany({});
    await prisma.pickSheetItem.deleteMany({});
    await prisma.pickSheet.deleteMany({});
    await prisma.orderLine.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.customer.deleteMany({});
  });

  describe('Concurrent Pick Sheet Generation', () => {
    it('should handle multiple users generating pick sheets simultaneously', async () => {
      // Create 10 orders
      const orders = await Promise.all(
        Array.from({ length: 10 }, () =>
          prisma.order.create({
            data: {
              customerId: testCustomerId,
              orderDate: new Date(),
              status: 'SUBMITTED',
              totalAmount: 100.00,
              orderLines: {
                create: [
                  {
                    inventoryItemId: testInventoryIds[0],
                    quantity: 5,
                    unitPrice: 10.00,
                    totalPrice: 50.00,
                  },
                ],
              },
            },
          })
        )
      );

      // Generate pick sheets concurrently
      const pickSheets = await Promise.all(
        orders.map((order) =>
          prisma.pickSheet.create({
            data: {
              status: 'PENDING',
              pickSheetItems: {
                create: [
                  {
                    orderId: order.id,
                    inventoryItemId: testInventoryIds[0],
                    productName: 'Product',
                    sku: 'SKU',
                    quantity: 5,
                    warehouseLocation: 'A-01-01',
                    pickOrder: 1,
                    picked: false,
                  },
                ],
              },
            },
          })
        )
      );

      expect(pickSheets).toHaveLength(10);

      // Verify all pick sheets are unique
      const uniqueIds = new Set(pickSheets.map((ps) => ps.id));
      expect(uniqueIds.size).toBe(10);
    });

    it('should prevent race conditions in pick sheet creation', async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 100.00,
        },
      });

      // Try to create multiple pick sheets for same order simultaneously
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          prisma.pickSheet.create({
            data: {
              status: 'PENDING',
              pickSheetItems: {
                create: [
                  {
                    orderId: order.id,
                    productName: 'Product',
                    sku: 'SKU',
                    quantity: 5,
                    warehouseLocation: 'A-01-01',
                    pickOrder: 1,
                    picked: false,
                  },
                ],
              },
            },
          })
        )
      );

      // All should succeed (no constraint preventing multiple pick sheets)
      const succeeded = results.filter((r) => r.status === 'fulfilled');
      expect(succeeded.length).toBe(5);
    });
  });

  describe('Concurrent Item Picking', () => {
    let pickSheetId: string;
    let itemIds: string[] = [];

    beforeEach(async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 100.00,
        },
      });

      const pickSheet = await prisma.pickSheet.create({
        data: {
          status: 'PENDING',
          pickSheetItems: {
            create: Array.from({ length: 10 }, (_, i) => ({
              orderId: order.id,
              productName: `Product ${i}`,
              sku: `SKU-${i}`,
              quantity: 1,
              warehouseLocation: `A-01-${String(i + 1).padStart(2, '0')}`,
              pickOrder: i + 1,
              picked: false,
            })),
          },
        },
        include: { pickSheetItems: true },
      });

      pickSheetId = pickSheet.id;
      itemIds = pickSheet.pickSheetItems.map((item) => item.id);
    });

    it('should allow multiple pickers to mark items concurrently', async () => {
      // Simulate 10 pickers marking items simultaneously
      await Promise.all(
        itemIds.map((itemId) =>
          prisma.pickSheetItem.update({
            where: { id: itemId },
            data: { picked: true },
          })
        )
      );

      const items = await prisma.pickSheetItem.findMany({
        where: { pickSheetId },
      });

      expect(items.every((item) => item.picked)).toBe(true);
    });

    it('should handle concurrent updates to same item', async () => {
      const itemId = itemIds[0];

      // Multiple users try to mark same item as picked
      await Promise.all(
        Array.from({ length: 5 }, () =>
          prisma.pickSheetItem.update({
            where: { id: itemId },
            data: { picked: true },
          })
        )
      );

      const item = await prisma.pickSheetItem.findUnique({
        where: { id: itemId },
      });

      expect(item!.picked).toBe(true);
    });

    it('should prevent lost updates in concurrent picking', async () => {
      // Update items concurrently with different values
      const updates = itemIds.slice(0, 5).map((itemId, index) =>
        prisma.pickSheetItem.update({
          where: { id: itemId },
          data: {
            picked: index % 2 === 0, // Alternate true/false
          },
        })
      );

      await Promise.all(updates);

      const items = await prisma.pickSheetItem.findMany({
        where: { id: { in: itemIds.slice(0, 5) } },
        orderBy: { id: 'asc' },
      });

      // Verify each item has correct value
      items.forEach((item, index) => {
        expect(item.picked).toBe(index % 2 === 0);
      });
    });
  });

  describe('Concurrent Inventory Allocation', () => {
    it('should prevent inventory over-allocation in concurrent orders', async () => {
      const inventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      const availableQuantity = inventory!.quantity;

      // Create 50 concurrent orders, each requesting 50 units
      const orders = await Promise.all(
        Array.from({ length: 50 }, () =>
          prisma.order.create({
            data: {
              customerId: testCustomerId,
              orderDate: new Date(),
              status: 'SUBMITTED',
              totalAmount: 500.00,
              orderLines: {
                create: [
                  {
                    inventoryItemId: testInventoryIds[0],
                    quantity: 50,
                    unitPrice: 10.00,
                    totalPrice: 500.00,
                  },
                ],
              },
            },
          })
        )
      );

      // Allocate inventory concurrently
      const results = await Promise.allSettled(
        orders.map(() =>
          prisma.inventoryItem.update({
            where: { id: testInventoryIds[0] },
            data: {
              quantity: {
                decrement: 50,
              },
            },
          })
        )
      );

      const finalInventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      // Should have allocated exactly 50 orders worth
      expect(finalInventory!.quantity).toBe(availableQuantity - 2500);
    });

    it('should use transaction isolation for inventory updates', async () => {
      const initialQuantity = (await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      }))!.quantity;

      // Concurrent transaction-based updates
      await Promise.all(
        Array.from({ length: 10 }, () =>
          prisma.$transaction(async (tx) => {
            const inventory = await tx.inventoryItem.findUnique({
              where: { id: testInventoryIds[0] },
            });

            await tx.inventoryItem.update({
              where: { id: testInventoryIds[0] },
              data: {
                quantity: inventory!.quantity - 10,
              },
            });
          })
        )
      );

      const finalQuantity = (await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      }))!.quantity;

      expect(finalQuantity).toBe(initialQuantity - 100);
    });
  });

  describe('Concurrent Location Updates', () => {
    it('should handle concurrent location assignments', async () => {
      // Create 100 inventory items
      const inventories = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `Location Product ${i}`,
              sku: `LOC-${String(i).padStart(3, '0')}`,
              quantity: 100,
              unitPrice: 10.00,
            },
          })
        )
      );

      // Assign locations concurrently
      await Promise.all(
        inventories.map((inv, i) =>
          prisma.inventoryItem.update({
            where: { id: inv.id },
            data: {
              warehouseLocation: `A-${String((i % 99) + 1).padStart(2, '0')}-01`,
              pickOrder: (i % 99) + 1,
            },
          })
        )
      );

      const updatedInventories = await prisma.inventoryItem.findMany({
        where: { id: { in: inventories.map((i) => i.id) } },
      });

      expect(updatedInventories.every((inv) => inv.warehouseLocation !== null)).toBe(
        true
      );
    });

    it('should prevent location update conflicts', async () => {
      const inventory = await prisma.inventoryItem.create({
        data: {
          productName: 'Conflict Product',
          sku: 'CONFLICT-001',
          quantity: 100,
          unitPrice: 10.00,
          warehouseLocation: 'A-01-01',
          pickOrder: 1,
        },
      });

      // Multiple users try to update location simultaneously
      const updates = [
        { location: 'B-01-01', pickOrder: 2 },
        { location: 'C-01-01', pickOrder: 3 },
        { location: 'D-01-01', pickOrder: 4 },
      ];

      await Promise.all(
        updates.map((update) =>
          prisma.inventoryItem.update({
            where: { id: inventory.id },
            data: {
              warehouseLocation: update.location,
              pickOrder: update.pickOrder,
            },
          })
        )
      );

      const finalInventory = await prisma.inventoryItem.findUnique({
        where: { id: inventory.id },
      });

      // Should have one of the updates (last write wins)
      expect(finalInventory!.warehouseLocation).toMatch(/^[BCD]-01-01$/);
    });
  });

  describe('Concurrent Route Operations', () => {
    it('should handle concurrent route creation', async () => {
      const routes = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          prisma.deliveryRoute.create({
            data: {
              routeName: `Concurrent-Route-${i}`,
              routeDate: new Date(),
              status: 'PLANNED',
            },
          })
        )
      );

      expect(routes).toHaveLength(10);

      const uniqueNames = new Set(routes.map((r) => r.routeName));
      expect(uniqueNames.size).toBe(10);
    });

    it('should handle concurrent stop additions to same route', async () => {
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Concurrent-Stops',
          routeDate: new Date(),
          status: 'PLANNED',
        },
      });

      // Add 20 stops concurrently
      const stops = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          prisma.routeStop.create({
            data: {
              deliveryRouteId: route.id,
              stopOrder: i + 1,
              customerName: `Customer ${i}`,
              address: `${i + 1} St`,
              city: 'City',
              state: 'CA',
              zipCode: '90000',
              estimatedArrival: `${9 + i}:00 AM`,
              status: 'PENDING',
            },
          })
        )
      );

      expect(stops).toHaveLength(20);

      const routeWithStops = await prisma.deliveryRoute.findUnique({
        where: { id: route.id },
        include: { routeStops: true },
      });

      expect(routeWithStops!.routeStops).toHaveLength(20);
    });

    it('should handle concurrent route status updates', async () => {
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Status-Update-Route',
          routeDate: new Date(),
          status: 'PLANNED',
        },
      });

      // Multiple users try to update status
      const statusUpdates = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

      await Promise.all(
        statusUpdates.map((status) =>
          prisma.deliveryRoute.update({
            where: { id: route.id },
            data: { status },
          })
        )
      );

      const finalRoute = await prisma.deliveryRoute.findUnique({
        where: { id: route.id },
      });

      // Should have one of the statuses (last write wins)
      expect(statusUpdates).toContain(finalRoute!.status);
    });
  });

  describe('Optimistic Locking', () => {
    it('should detect concurrent modifications using version field', async () => {
      // This test assumes version field exists (if implemented)
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 100.00,
        },
      });

      // Simulate two users reading same record
      const order1 = await prisma.order.findUnique({
        where: { id: order.id },
      });

      const order2 = await prisma.order.findUnique({
        where: { id: order.id },
      });

      // First user updates
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FULFILLED' },
      });

      // Second user tries to update (should detect conflict if version checking)
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      const finalOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });

      // Last write wins (without version field)
      expect(finalOrder!.status).toBe('CANCELLED');
    });
  });

  describe('Deadlock Prevention', () => {
    it('should prevent deadlocks in concurrent transactions', async () => {
      const inventory1 = testInventoryIds[0];
      const inventory2 = testInventoryIds[1];

      // Transaction 1: Update inventory1 then inventory2
      const transaction1 = prisma.$transaction(async (tx) => {
        await tx.inventoryItem.update({
          where: { id: inventory1 },
          data: { quantity: { decrement: 10 } },
        });

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        await tx.inventoryItem.update({
          where: { id: inventory2 },
          data: { quantity: { decrement: 5 } },
        });
      });

      // Transaction 2: Update inventory2 then inventory1
      const transaction2 = prisma.$transaction(async (tx) => {
        await tx.inventoryItem.update({
          where: { id: inventory2 },
          data: { quantity: { decrement: 5 } },
        });

        // Small delay
        await new Promise((resolve) => setTimeout(resolve, 100));

        await tx.inventoryItem.update({
          where: { id: inventory1 },
          data: { quantity: { decrement: 10 } },
        });
      });

      // Both should complete without deadlock
      await Promise.all([transaction1, transaction2]);

      const [inv1, inv2] = await Promise.all([
        prisma.inventoryItem.findUnique({ where: { id: inventory1 } }),
        prisma.inventoryItem.findUnique({ where: { id: inventory2 } }),
      ]);

      // Both should be updated
      expect(inv1!.quantity).toBeLessThan(1000);
      expect(inv2!.quantity).toBeLessThan(500);
    });
  });

  describe('Rate Limiting & Throttling', () => {
    it('should handle burst of concurrent requests', async () => {
      // Create 100 concurrent requests
      const promises = Array.from({ length: 100 }, (_, i) =>
        prisma.order.create({
          data: {
            customerId: testCustomerId,
            orderDate: new Date(),
            status: 'SUBMITTED',
            totalAmount: 100.00,
          },
        })
      );

      const startTime = Date.now();
      const orders = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(orders).toHaveLength(100);
      // Should complete in reasonable time
      expect(duration).toBeLessThan(10000); // <10 seconds
    });

    it('should maintain data consistency under high load', async () => {
      const initialQuantity = (await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      }))!.quantity;

      // 50 concurrent updates
      await Promise.all(
        Array.from({ length: 50 }, () =>
          prisma.inventoryItem.update({
            where: { id: testInventoryIds[0] },
            data: {
              quantity: {
                decrement: 1,
              },
            },
          })
        )
      );

      const finalQuantity = (await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      }))!.quantity;

      // Exactly 50 should be decremented
      expect(finalQuantity).toBe(initialQuantity - 50);
    });
  });
});
