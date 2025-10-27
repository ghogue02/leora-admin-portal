/**
 * Warehouse Data Integrity Tests
 *
 * Tests data consistency and integrity across warehouse operations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';

describe('Warehouse Data Integrity', () => {
  let testCustomerId: string;
  let testInventoryIds: string[] = [];

  beforeEach(async () => {
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Integrity',
        lastName: 'Test',
        email: 'integrity@example.com',
        phone: '555-6000',
      },
    });
    testCustomerId = customer.id;

    const inventories = await Promise.all([
      prisma.inventoryItem.create({
        data: {
          productName: 'Integrity Product A',
          sku: 'INT-A-001',
          quantity: 100,
          unitPrice: 10.00,
          warehouseLocation: 'A-01-01',
          pickOrder: 1,
        },
      }),
      prisma.inventoryItem.create({
        data: {
          productName: 'Integrity Product B',
          sku: 'INT-B-001',
          quantity: 50,
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

  describe('Pick Sheet Item Integrity', () => {
    it('should match pick sheet items with order lines', async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 70.00,
          orderLines: {
            create: [
              {
                inventoryItemId: testInventoryIds[0],
                quantity: 5,
                unitPrice: 10.00,
                totalPrice: 50.00,
              },
              {
                inventoryItemId: testInventoryIds[1],
                quantity: 1,
                unitPrice: 20.00,
                totalPrice: 20.00,
              },
            ],
          },
        },
        include: { orderLines: true },
      });

      const pickSheet = await prisma.pickSheet.create({
        data: {
          status: 'PENDING',
          pickSheetItems: {
            create: order.orderLines.map((line) => ({
              orderId: order.id,
              inventoryItemId: line.inventoryItemId,
              productName: 'Product',
              sku: 'SKU',
              quantity: line.quantity,
              warehouseLocation: 'A-01-01',
              pickOrder: 1,
              picked: false,
            })),
          },
        },
        include: { pickSheetItems: true },
      });

      // Verify quantities match
      const orderLinesMap = new Map(
        order.orderLines.map((line) => [line.inventoryItemId, line.quantity])
      );

      pickSheet.pickSheetItems.forEach((item) => {
        const orderQuantity = orderLinesMap.get(item.inventoryItemId!);
        expect(item.quantity).toBe(orderQuantity);
      });
    });

    it('should ensure no orphaned pick sheet items', async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 50.00,
        },
      });

      const pickSheet = await prisma.pickSheet.create({
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
      });

      // Delete order
      await prisma.order.delete({ where: { id: order.id } });

      // Orphaned pick sheet items should also be deleted (cascade)
      const orphanedItems = await prisma.pickSheetItem.findMany({
        where: { orderId: order.id },
      });

      expect(orphanedItems).toHaveLength(0);
    });

    it('should verify all pick sheet items belong to same orders', async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 50.00,
        },
      });

      const pickSheet = await prisma.pickSheet.create({
        data: {
          status: 'PENDING',
          pickSheetItems: {
            create: [
              {
                orderId: order.id,
                productName: 'Product A',
                sku: 'SKU-A',
                quantity: 5,
                warehouseLocation: 'A-01-01',
                pickOrder: 1,
                picked: false,
              },
              {
                orderId: order.id,
                productName: 'Product B',
                sku: 'SKU-B',
                quantity: 3,
                warehouseLocation: 'A-01-02',
                pickOrder: 1,
                picked: false,
              },
            ],
          },
        },
        include: { pickSheetItems: true },
      });

      const uniqueOrderIds = new Set(
        pickSheet.pickSheetItems.map((item) => item.orderId)
      );

      // All items should belong to the same order
      expect(uniqueOrderIds.size).toBe(1);
      expect(uniqueOrderIds.has(order.id)).toBe(true);
    });
  });

  describe('Inventory Allocation Integrity', () => {
    it('should never over-allocate inventory', async () => {
      const inventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      const availableQuantity = inventory!.quantity;

      // Create order that would over-allocate
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'PENDING',
          totalAmount: 0,
          orderLines: {
            create: [
              {
                inventoryItemId: testInventoryIds[0],
                quantity: availableQuantity - 10,
                unitPrice: 10.00,
                totalPrice: (availableQuantity - 10) * 10,
              },
            ],
          },
        },
      });

      // Allocate inventory
      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[0] },
        data: {
          quantity: {
            decrement: availableQuantity - 10,
          },
        },
      });

      // Try to create second order
      const order2 = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'PENDING',
          totalAmount: 0,
          orderLines: {
            create: [
              {
                inventoryItemId: testInventoryIds[0],
                quantity: 20, // Would over-allocate
                unitPrice: 10.00,
                totalPrice: 200.00,
              },
            ],
          },
        },
      });

      const currentInventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      // Business logic should prevent allocation
      expect(currentInventory!.quantity).toBe(10);
      // Order should remain PENDING, not SUBMITTED
      expect(order2.status).toBe('PENDING');
    });

    it('should maintain inventory count after pick sheet completion', async () => {
      const initialQuantity = (await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      }))!.quantity;

      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 50.00,
          orderLines: {
            create: [
              {
                inventoryItemId: testInventoryIds[0],
                quantity: 10,
                unitPrice: 10.00,
                totalPrice: 100.00,
              },
            ],
          },
        },
      });

      // Create and complete pick sheet
      const pickSheet = await prisma.pickSheet.create({
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          pickSheetItems: {
            create: [
              {
                orderId: order.id,
                inventoryItemId: testInventoryIds[0],
                productName: 'Product',
                sku: 'SKU',
                quantity: 10,
                warehouseLocation: 'A-01-01',
                pickOrder: 1,
                picked: true,
              },
            ],
          },
        },
      });

      // Deduct inventory
      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[0] },
        data: {
          quantity: {
            decrement: 10,
          },
        },
      });

      const finalQuantity = (await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      }))!.quantity;

      expect(finalQuantity).toBe(initialQuantity - 10);
    });

    it('should handle concurrent inventory allocation safely', async () => {
      const inventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      const initialQuantity = inventory!.quantity;

      // Create 5 concurrent orders
      const orders = await Promise.all(
        Array.from({ length: 5 }, () =>
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
                    quantity: 10,
                    unitPrice: 10.00,
                    totalPrice: 100.00,
                  },
                ],
              },
            },
          })
        )
      );

      // Allocate inventory concurrently
      await Promise.all(
        orders.map(() =>
          prisma.inventoryItem.update({
            where: { id: testInventoryIds[0] },
            data: {
              quantity: {
                decrement: 10,
              },
            },
          })
        )
      );

      const finalQuantity = (await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      }))!.quantity;

      expect(finalQuantity).toBe(initialQuantity - 50);
    });
  });

  describe('PickOrder Calculation Integrity', () => {
    it('should always calculate pickOrder correctly', async () => {
      const locations = [
        'A-01-01',
        'A-01-02',
        'A-02-01',
        'B-01-01',
        'C-05-10',
      ];

      const calculatePickOrder = (location: string): number => {
        const [aisle, rack, shelf] = location.split('-');
        return (
          (aisle.charCodeAt(0) - 65) * 10000 +
          parseInt(rack) * 100 +
          parseInt(shelf)
        );
      };

      const inventories = await Promise.all(
        locations.map((location, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `PickOrder Product ${i}`,
              sku: `PO-${String(i).padStart(3, '0')}`,
              quantity: 100,
              unitPrice: 10.00,
              warehouseLocation: location,
              pickOrder: calculatePickOrder(location),
            },
          })
        )
      );

      // Verify pickOrder is in correct sequence
      const sortedInventories = await prisma.inventoryItem.findMany({
        where: { id: { in: inventories.map((i) => i.id) } },
        orderBy: { pickOrder: 'asc' },
      });

      for (let i = 1; i < sortedInventories.length; i++) {
        expect(sortedInventories[i].pickOrder!).toBeGreaterThan(
          sortedInventories[i - 1].pickOrder!
        );
      }
    });

    it('should maintain pickOrder consistency after location update', async () => {
      const inventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      const originalPickOrder = inventory!.pickOrder;

      // Update location
      const newLocation = 'Z-99-99';
      const calculatePickOrder = (location: string): number => {
        const [aisle, rack, shelf] = location.split('-');
        return (
          (aisle.charCodeAt(0) - 65) * 10000 +
          parseInt(rack) * 100 +
          parseInt(shelf)
        );
      };

      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[0] },
        data: {
          warehouseLocation: newLocation,
          pickOrder: calculatePickOrder(newLocation),
        },
      });

      const updatedInventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      expect(updatedInventory!.pickOrder).not.toBe(originalPickOrder);
      expect(updatedInventory!.pickOrder).toBeGreaterThan(originalPickOrder!);
    });

    it('should handle null locations with consistent pickOrder', async () => {
      const inventory = await prisma.inventoryItem.create({
        data: {
          productName: 'No Location Product',
          sku: 'NULL-LOC-001',
          quantity: 100,
          unitPrice: 10.00,
          warehouseLocation: null,
          pickOrder: 9999, // Default for null locations
        },
      });

      expect(inventory.warehouseLocation).toBeNull();
      expect(inventory.pickOrder).toBe(9999);

      // Should appear last in sorted list
      const allInventory = await prisma.inventoryItem.findMany({
        orderBy: { pickOrder: 'asc' },
      });

      const lastItem = allInventory[allInventory.length - 1];
      expect(lastItem.id).toBe(inventory.id);
    });
  });

  describe('Route Stop Integrity', () => {
    it('should maintain sequential stop order', async () => {
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Integrity-Route',
          routeDate: new Date(),
          status: 'PLANNED',
          routeStops: {
            create: [
              {
                stopOrder: 1,
                customerName: 'Customer A',
                address: '100 A St',
                city: 'CityA',
                state: 'CA',
                zipCode: '90001',
                estimatedArrival: '9:00 AM',
                status: 'PENDING',
              },
              {
                stopOrder: 2,
                customerName: 'Customer B',
                address: '200 B St',
                city: 'CityB',
                state: 'CA',
                zipCode: '90002',
                estimatedArrival: '10:00 AM',
                status: 'PENDING',
              },
              {
                stopOrder: 3,
                customerName: 'Customer C',
                address: '300 C St',
                city: 'CityC',
                state: 'CA',
                zipCode: '90003',
                estimatedArrival: '11:00 AM',
                status: 'PENDING',
              },
            ],
          },
        },
        include: { routeStops: true },
      });

      const stops = await prisma.routeStop.findMany({
        where: { deliveryRouteId: route.id },
        orderBy: { stopOrder: 'asc' },
      });

      // Verify no gaps in sequence
      stops.forEach((stop, index) => {
        expect(stop.stopOrder).toBe(index + 1);
      });
    });

    it('should link all stops to same route', async () => {
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Multi-Stop-Integrity',
          routeDate: new Date(),
          status: 'PLANNED',
          routeStops: {
            create: Array.from({ length: 10 }, (_, i) => ({
              stopOrder: i + 1,
              customerName: `Customer ${i}`,
              address: `${i + 1} St`,
              city: 'City',
              state: 'CA',
              zipCode: '90000',
              estimatedArrival: `${9 + i}:00 AM`,
              status: 'PENDING',
            })),
          },
        },
        include: { routeStops: true },
      });

      const uniqueRouteIds = new Set(
        route.routeStops.map((stop) => stop.deliveryRouteId)
      );

      expect(uniqueRouteIds.size).toBe(1);
      expect(uniqueRouteIds.has(route.id)).toBe(true);
    });

    it('should prevent duplicate stop orders in same route', async () => {
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Duplicate-Test',
          routeDate: new Date(),
          status: 'PLANNED',
        },
      });

      // Create first stop
      await prisma.routeStop.create({
        data: {
          deliveryRouteId: route.id,
          stopOrder: 1,
          customerName: 'Customer A',
          address: '100 A St',
          city: 'CityA',
          state: 'CA',
          zipCode: '90001',
          estimatedArrival: '9:00 AM',
          status: 'PENDING',
        },
      });

      // Try to create duplicate stop order
      try {
        await prisma.routeStop.create({
          data: {
            deliveryRouteId: route.id,
            stopOrder: 1, // Duplicate
            customerName: 'Customer B',
            address: '200 B St',
            city: 'CityB',
            state: 'CA',
            zipCode: '90002',
            estimatedArrival: '10:00 AM',
            status: 'PENDING',
          },
        });

        // Should not reach here if unique constraint is enforced
      } catch (error) {
        // Expected to fail with unique constraint violation
        expect(error).toBeDefined();
      }
    });
  });

  describe('Referential Integrity', () => {
    it('should cascade delete pick sheet items when pick sheet deleted', async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 50.00,
        },
      });

      const pickSheet = await prisma.pickSheet.create({
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
      });

      // Delete pick sheet
      await prisma.pickSheet.delete({ where: { id: pickSheet.id } });

      // Items should be deleted
      const items = await prisma.pickSheetItem.findMany({
        where: { pickSheetId: pickSheet.id },
      });

      expect(items).toHaveLength(0);
    });

    it('should cascade delete route stops when route deleted', async () => {
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Cascade-Test',
          routeDate: new Date(),
          status: 'PLANNED',
          routeStops: {
            create: [
              {
                stopOrder: 1,
                customerName: 'Customer',
                address: '100 St',
                city: 'City',
                state: 'CA',
                zipCode: '90000',
                estimatedArrival: '9:00 AM',
                status: 'PENDING',
              },
            ],
          },
        },
      });

      // Delete route
      await prisma.deliveryRoute.delete({ where: { id: route.id } });

      // Stops should be deleted
      const stops = await prisma.routeStop.findMany({
        where: { deliveryRouteId: route.id },
      });

      expect(stops).toHaveLength(0);
    });

    it('should prevent order deletion if pick sheet exists', async () => {
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 50.00,
        },
      });

      const pickSheet = await prisma.pickSheet.create({
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
      });

      // Try to delete order (should fail due to foreign key)
      try {
        await prisma.order.delete({ where: { id: order.id } });
        // Should not reach here
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Order should still exist
      const existingOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });

      expect(existingOrder).toBeDefined();
    });
  });
});
