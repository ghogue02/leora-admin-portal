/**
 * Warehouse Performance Tests
 *
 * Performance benchmarks for warehouse operations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';

describe('Warehouse Performance Tests', () => {
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

  describe('Pick Sheet Generation Performance', () => {
    it('should generate pick sheet for 100 items in <1 second', async () => {
      // Create customer
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Perf',
          lastName: 'Test',
          email: 'perf@example.com',
          phone: '555-3000',
        },
      });

      // Create 100 inventory items
      const inventories = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `Perf Product ${i}`,
              sku: `PERF-${String(i).padStart(3, '0')}`,
              quantity: 100,
              unitPrice: 10.00,
              warehouseLocation: `A-${String(Math.floor(i / 10) + 1).padStart(2, '0')}-${String((i % 10) + 1).padStart(2, '0')}`,
              pickOrder: Math.floor(i / 10) + 1,
            },
          })
        )
      );

      // Create order with 100 lines
      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 1000.00,
          orderLines: {
            create: inventories.map((inv) => ({
              inventoryItemId: inv.id,
              quantity: 1,
              unitPrice: 10.00,
              totalPrice: 10.00,
            })),
          },
        },
        include: { orderLines: true },
      });

      // Measure pick sheet generation
      const startTime = Date.now();

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

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // <1 second
      expect(pickSheet.pickSheetItems).toHaveLength(100);
    });

    it('should sort 100 items by pickOrder efficiently', async () => {
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Sort',
          lastName: 'Test',
          email: 'sort@example.com',
          phone: '555-3001',
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(),
          status: 'SUBMITTED',
          totalAmount: 1000.00,
        },
      });

      // Create 100 pick sheet items with random pickOrder
      const pickSheet = await prisma.pickSheet.create({
        data: {
          status: 'PENDING',
        },
      });

      await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          prisma.pickSheetItem.create({
            data: {
              pickSheetId: pickSheet.id,
              orderId: order.id,
              productName: `Product ${i}`,
              sku: `SKU-${i}`,
              quantity: 1,
              warehouseLocation: `A-${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}-01`,
              pickOrder: Math.floor(Math.random() * 10) + 1,
              picked: false,
            },
          })
        )
      );

      // Measure sorting
      const startTime = Date.now();

      const sortedItems = await prisma.pickSheetItem.findMany({
        where: { pickSheetId: pickSheet.id },
        orderBy: [
          { pickOrder: 'asc' },
          { warehouseLocation: 'asc' },
        ],
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // <500ms
      expect(sortedItems).toHaveLength(100);

      // Verify sort order
      for (let i = 1; i < sortedItems.length; i++) {
        expect(sortedItems[i].pickOrder!).toBeGreaterThanOrEqual(
          sortedItems[i - 1].pickOrder!
        );
      }
    });
  });

  describe('Location CSV Import Performance', () => {
    it('should import 1000 locations in <5 seconds', async () => {
      // Create 1000 inventory items
      const inventories = await Promise.all(
        Array.from({ length: 1000 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `CSV Product ${i}`,
              sku: `CSV-${String(i).padStart(4, '0')}`,
              quantity: 100,
              unitPrice: 10.00,
            },
          })
        )
      );

      // Prepare updates
      const updates = inventories.map((inv, i) => ({
        id: inv.id,
        location: `A-${String(Math.floor(i / 100) + 1).padStart(2, '0')}-${String((i % 100) + 1).padStart(2, '0')}`,
        pickOrder: Math.floor(i / 100) + 1,
      }));

      // Measure bulk update
      const startTime = Date.now();

      await prisma.$transaction(
        updates.map((update) =>
          prisma.inventoryItem.update({
            where: { id: update.id },
            data: {
              warehouseLocation: update.location,
              pickOrder: update.pickOrder,
            },
          })
        )
      );

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // <5 seconds

      const updatedItems = await prisma.inventoryItem.findMany({
        where: { id: { in: inventories.map((i) => i.id) } },
      });

      expect(updatedItems.every((item) => item.warehouseLocation !== null)).toBe(true);
    });

    it('should handle concurrent location updates', async () => {
      const inventories = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `Concurrent Product ${i}`,
              sku: `CONC-${String(i).padStart(3, '0')}`,
              quantity: 100,
              unitPrice: 10.00,
            },
          })
        )
      );

      const startTime = Date.now();

      // Concurrent updates
      await Promise.all(
        inventories.map((inv, i) =>
          prisma.inventoryItem.update({
            where: { id: inv.id },
            data: {
              warehouseLocation: `A-${String(i + 1).padStart(2, '0')}-01`,
              pickOrder: i + 1,
            },
          })
        )
      );

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000); // <3 seconds
    });
  });

  describe('Warehouse Map Rendering Performance', () => {
    it('should load warehouse map data in <2 seconds', async () => {
      // Create 500 inventory items with locations
      await Promise.all(
        Array.from({ length: 500 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `Map Product ${i}`,
              sku: `MAP-${String(i).padStart(3, '0')}`,
              quantity: 100,
              unitPrice: 10.00,
              warehouseLocation: `${String.fromCharCode(65 + (i % 26))}-${String(Math.floor(i / 26) + 1).padStart(2, '0')}-01`,
              pickOrder: i + 1,
            },
          })
        )
      );

      const startTime = Date.now();

      // Simulate warehouse map query
      const mapData = await prisma.inventoryItem.groupBy({
        by: ['warehouseLocation'],
        _count: { id: true },
        _sum: { quantity: true },
        where: { warehouseLocation: { not: null } },
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // <2 seconds
      expect(mapData.length).toBeGreaterThan(0);
    });

    it('should aggregate location statistics efficiently', async () => {
      await Promise.all(
        Array.from({ length: 200 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `Stats Product ${i}`,
              sku: `STATS-${String(i).padStart(3, '0')}`,
              quantity: Math.floor(Math.random() * 100) + 1,
              unitPrice: 10.00,
              warehouseLocation: `A-${String((i % 20) + 1).padStart(2, '0')}-01`,
              pickOrder: (i % 20) + 1,
            },
          })
        )
      );

      const startTime = Date.now();

      const stats = await prisma.inventoryItem.groupBy({
        by: ['pickOrder'],
        _count: { id: true },
        _sum: { quantity: true },
        where: { warehouseLocation: { not: null } },
        orderBy: { pickOrder: 'asc' },
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // <1 second
      expect(stats.length).toBeGreaterThan(0);
    });
  });

  describe('Azuga Export Performance', () => {
    it('should export 50 orders in <3 seconds', async () => {
      // Create 50 customers and orders
      const customers = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          prisma.customer.create({
            data: {
              firstName: `Export${i}`,
              lastName: `Customer${i}`,
              email: `export${i}@example.com`,
              phone: `555-${String(i + 4000).padStart(4, '0')}`,
              address: `${i + 1} Export St`,
              city: 'ExportCity',
              state: 'CA',
              zipCode: '90000',
            },
          })
        )
      );

      const orders = await Promise.all(
        customers.map((customer) =>
          prisma.order.create({
            data: {
              customerId: customer.id,
              orderDate: new Date(),
              status: 'FULFILLED',
              totalAmount: 100.00,
            },
          })
        )
      );

      const startTime = Date.now();

      // Simulate CSV generation
      const ordersWithCustomers = await prisma.order.findMany({
        where: { id: { in: orders.map((o) => o.id) } },
        include: { customer: true },
      });

      const csvRows = ordersWithCustomers.map((order) => [
        `${order.customer.firstName} ${order.customer.lastName}`,
        order.customer.address,
        order.customer.city,
        order.customer.state,
        order.customer.zipCode,
        order.customer.phone,
        '',
      ]);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000); // <3 seconds
      expect(csvRows).toHaveLength(50);
    });
  });

  describe('Route Import Performance', () => {
    it('should import route with 20 stops in <2 seconds', async () => {
      const startTime = Date.now();

      // Create route with 20 stops
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Perf-Route-20',
          routeDate: new Date(),
          status: 'PLANNED',
          routeStops: {
            create: Array.from({ length: 20 }, (_, i) => ({
              stopOrder: i + 1,
              customerName: `Customer ${i}`,
              address: `${i + 1} Stop St`,
              city: 'StopCity',
              state: 'CA',
              zipCode: '90000',
              estimatedArrival: `${9 + i}:00 AM`,
              status: 'PENDING',
            })),
          },
        },
        include: { routeStops: true },
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // <2 seconds
      expect(route.routeStops).toHaveLength(20);
    });

    it('should query route with stops efficiently', async () => {
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Query-Route',
          routeDate: new Date(),
          status: 'PLANNED',
          routeStops: {
            create: Array.from({ length: 30 }, (_, i) => ({
              stopOrder: i + 1,
              customerName: `Customer ${i}`,
              address: `${i + 1} Query St`,
              city: 'QueryCity',
              state: 'CA',
              zipCode: '90000',
              estimatedArrival: `${9 + i}:00 AM`,
              status: 'PENDING',
            })),
          },
        },
      });

      const startTime = Date.now();

      const routeWithStops = await prisma.deliveryRoute.findUnique({
        where: { id: route.id },
        include: {
          routeStops: {
            orderBy: { stopOrder: 'asc' },
            include: { order: true },
          },
        },
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500); // <500ms
      expect(routeWithStops!.routeStops).toHaveLength(30);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle 10 concurrent pick sheet generations', async () => {
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Concurrent',
          lastName: 'Test',
          email: 'concurrent@example.com',
          phone: '555-5000',
        },
      });

      const orders = await Promise.all(
        Array.from({ length: 10 }, () =>
          prisma.order.create({
            data: {
              customerId: customer.id,
              orderDate: new Date(),
              status: 'SUBMITTED',
              totalAmount: 100.00,
            },
          })
        )
      );

      const startTime = Date.now();

      await Promise.all(
        orders.map((order) =>
          prisma.pickSheet.create({
            data: {
              status: 'PENDING',
              pickSheetItems: {
                create: [
                  {
                    orderId: order.id,
                    productName: 'Product',
                    sku: 'SKU',
                    quantity: 1,
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

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000); // <2 seconds

      const pickSheets = await prisma.pickSheet.findMany({});
      expect(pickSheets.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle 20 concurrent location updates', async () => {
      const inventories = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `Update Product ${i}`,
              sku: `UPD-${String(i).padStart(3, '0')}`,
              quantity: 100,
              unitPrice: 10.00,
            },
          })
        )
      );

      const startTime = Date.now();

      await Promise.all(
        inventories.map((inv, i) =>
          prisma.inventoryItem.update({
            where: { id: inv.id },
            data: {
              warehouseLocation: `A-${String(i + 1).padStart(2, '0')}-01`,
              pickOrder: i + 1,
            },
          })
        )
      );

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1500); // <1.5 seconds
    });
  });

  describe('Database Query Optimization', () => {
    it('should use indexes for location queries', async () => {
      await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `Index Product ${i}`,
              sku: `IDX-${String(i).padStart(3, '0')}`,
              quantity: 100,
              unitPrice: 10.00,
              warehouseLocation: `A-${String((i % 50) + 1).padStart(2, '0')}-01`,
              pickOrder: (i % 50) + 1,
            },
          })
        )
      );

      const startTime = Date.now();

      const items = await prisma.inventoryItem.findMany({
        where: { warehouseLocation: 'A-25-01' },
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // <100ms with index
      expect(items.length).toBeGreaterThan(0);
    });

    it('should efficiently query by pickOrder range', async () => {
      await Promise.all(
        Array.from({ length: 200 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `Range Product ${i}`,
              sku: `RNG-${String(i).padStart(3, '0')}`,
              quantity: 100,
              unitPrice: 10.00,
              pickOrder: i + 1,
            },
          })
        )
      );

      const startTime = Date.now();

      const items = await prisma.inventoryItem.findMany({
        where: {
          pickOrder: {
            gte: 50,
            lte: 100,
          },
        },
        orderBy: { pickOrder: 'asc' },
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(200); // <200ms
      expect(items.length).toBe(51); // 50 through 100 inclusive
    });
  });
});
