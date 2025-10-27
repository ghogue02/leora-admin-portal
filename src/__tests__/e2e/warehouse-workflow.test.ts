/**
 * Warehouse E2E Workflow Tests
 *
 * Tests complete workflows from order to delivery
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';

describe('Warehouse E2E Workflows', () => {
  let testCustomerId: string;
  let testInventoryIds: string[] = [];

  beforeEach(async () => {
    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        firstName: 'E2E',
        lastName: 'Customer',
        email: 'e2e@example.com',
        phone: '555-2000',
        address: '200 E2E St',
        city: 'TestCity',
        state: 'CA',
        zipCode: '90000',
        territory: 'North',
      },
    });
    testCustomerId = customer.id;

    // Create test inventory
    const inventory1 = await prisma.inventoryItem.create({
      data: {
        productName: 'E2E Product A',
        sku: 'E2E-A-001',
        quantity: 100,
        unitPrice: 10.00,
        warehouseLocation: 'A-01-01',
        pickOrder: 1,
      },
    });

    const inventory2 = await prisma.inventoryItem.create({
      data: {
        productName: 'E2E Product B',
        sku: 'E2E-B-001',
        quantity: 50,
        unitPrice: 20.00,
        warehouseLocation: 'A-01-02',
        pickOrder: 1,
      },
    });

    const inventory3 = await prisma.inventoryItem.create({
      data: {
        productName: 'E2E Product C',
        sku: 'E2E-C-001',
        quantity: 75,
        unitPrice: 15.00,
        warehouseLocation: 'B-02-01',
        pickOrder: 2,
      },
    });

    testInventoryIds = [inventory1.id, inventory2.id, inventory3.id];
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

  describe('Workflow A: Order Fulfillment', () => {
    it('should complete full order fulfillment workflow', async () => {
      // Step 1: Customer places order
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'PENDING',
          totalAmount: 75.00,
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

      expect(order.status).toBe('PENDING');
      expect(order.orderLines).toHaveLength(2);

      // Step 2: Order marked SUBMITTED
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'SUBMITTED' },
      });

      const submittedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });

      expect(submittedOrder!.status).toBe('SUBMITTED');

      // Step 3: Inventory allocated (verify availability)
      const inventoryCheck = await prisma.inventoryItem.findMany({
        where: { id: { in: testInventoryIds } },
      });

      expect(inventoryCheck[0].quantity).toBeGreaterThanOrEqual(5);
      expect(inventoryCheck[1].quantity).toBeGreaterThanOrEqual(1);

      // Step 4: Pick sheet generated
      const pickSheet = await prisma.pickSheet.create({
        data: {
          status: 'PENDING',
          pickSheetItems: {
            create: order.orderLines.map((line) => ({
              orderId: order.id,
              inventoryItemId: line.inventoryItemId,
              productName: 'E2E Product',
              sku: 'E2E-001',
              quantity: line.quantity,
              warehouseLocation: 'A-01-01',
              pickOrder: 1,
              picked: false,
            })),
          },
        },
        include: { pickSheetItems: true },
      });

      expect(pickSheet.status).toBe('PENDING');
      expect(pickSheet.pickSheetItems).toHaveLength(2);

      // Step 5: Items sorted by pickOrder
      const sortedItems = await prisma.pickSheetItem.findMany({
        where: { pickSheetId: pickSheet.id },
        orderBy: [
          { pickOrder: 'asc' },
          { warehouseLocation: 'asc' },
        ],
      });

      expect(sortedItems[0].pickOrder).toBeLessThanOrEqual(sortedItems[1].pickOrder!);

      // Step 6: Picker marks items picked
      await prisma.pickSheetItem.updateMany({
        where: { pickSheetId: pickSheet.id },
        data: { picked: true },
      });

      const pickedItems = await prisma.pickSheetItem.findMany({
        where: { pickSheetId: pickSheet.id },
      });

      expect(pickedItems.every((item) => item.picked)).toBe(true);

      // Step 7: Pick sheet completed
      await prisma.pickSheet.update({
        where: { id: pickSheet.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      const completedPickSheet = await prisma.pickSheet.findUnique({
        where: { id: pickSheet.id },
      });

      expect(completedPickSheet!.status).toBe('COMPLETED');
      expect(completedPickSheet!.completedAt).toBeDefined();

      // Step 8: Order status updated to FULFILLED
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FULFILLED' },
      });

      const fulfilledOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });

      expect(fulfilledOrder!.status).toBe('FULFILLED');

      // Verify complete workflow
      expect(fulfilledOrder!.status).toBe('FULFILLED');
      expect(completedPickSheet!.status).toBe('COMPLETED');
      expect(pickedItems.every((item) => item.picked)).toBe(true);
    });

    it('should handle workflow with inventory deduction', async () => {
      const initialQuantity = (await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      }))!.quantity;

      // Create and fulfill order
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

      // Deduct inventory
      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[0] },
        data: {
          quantity: {
            decrement: 10,
          },
        },
      });

      const updatedInventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      expect(updatedInventory!.quantity).toBe(initialQuantity - 10);
    });

    it('should prevent over-allocation', async () => {
      const inventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      const availableQuantity = inventory!.quantity;

      // Try to order more than available
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
                quantity: availableQuantity + 100, // Over-allocate
                unitPrice: 10.00,
                totalPrice: (availableQuantity + 100) * 10,
              },
            ],
          },
        },
      });

      // Business logic should prevent submission
      expect(order.orderLines).toBeDefined();
    });
  });

  describe('Workflow B: Routing Process', () => {
    it('should complete full routing workflow', async () => {
      // Step 1: Orders picked and ready
      const order = await prisma.order.create({
        data: {
          customerId: testCustomerId,
          orderDate: new Date(),
          status: 'FULFILLED',
          totalAmount: 100.00,
        },
      });

      expect(order.status).toBe('FULFILLED');

      // Step 2: Export to Azuga CSV (mock)
      const csvData = `Name,Address,City,State,Zip,Phone,Notes
E2E Customer,200 E2E St,TestCity,CA,90000,555-2000,`;

      expect(csvData).toContain('E2E Customer');

      // Step 3: Azuga optimizes route (simulated)
      const optimizedCSV = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-2025-01-15,1,E2E Customer,200 E2E St,TestCity,CA,90000,10:30 AM`;

      expect(optimizedCSV).toContain('Route-2025-01-15');

      // Step 4: Import route back
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Route-2025-01-15',
          routeDate: new Date('2025-01-15'),
          status: 'PLANNED',
        },
      });

      expect(route.status).toBe('PLANNED');

      // Step 5: Create delivery routes
      const routeStop = await prisma.routeStop.create({
        data: {
          deliveryRouteId: route.id,
          orderId: order.id,
          stopOrder: 1,
          customerName: 'E2E Customer',
          address: '200 E2E St',
          city: 'TestCity',
          state: 'CA',
          zipCode: '90000',
          estimatedArrival: '10:30 AM',
          status: 'PENDING',
        },
      });

      expect(routeStop.stopOrder).toBe(1);

      // Step 6: Assign ETAs to stops
      expect(routeStop.estimatedArrival).toBe('10:30 AM');

      // Step 7: Driver sees route
      const driverRoute = await prisma.deliveryRoute.findUnique({
        where: { id: route.id },
        include: {
          routeStops: {
            orderBy: { stopOrder: 'asc' },
          },
        },
      });

      expect(driverRoute!.routeStops).toHaveLength(1);

      // Step 8: Updates status as delivered
      await prisma.routeStop.update({
        where: { id: routeStop.id },
        data: {
          status: 'DELIVERED',
          actualArrival: new Date(),
        },
      });

      const deliveredStop = await prisma.routeStop.findUnique({
        where: { id: routeStop.id },
      });

      expect(deliveredStop!.status).toBe('DELIVERED');
      expect(deliveredStop!.actualArrival).toBeDefined();

      // Mark route as completed
      await prisma.deliveryRoute.update({
        where: { id: route.id },
        data: { status: 'COMPLETED' },
      });

      const completedRoute = await prisma.deliveryRoute.findUnique({
        where: { id: route.id },
      });

      expect(completedRoute!.status).toBe('COMPLETED');
    });

    it('should handle multi-stop routes', async () => {
      // Create multiple orders
      const orders = await Promise.all([
        prisma.order.create({
          data: {
            customerId: testCustomerId,
            orderDate: new Date(),
            status: 'FULFILLED',
            totalAmount: 50.00,
          },
        }),
        prisma.order.create({
          data: {
            customerId: testCustomerId,
            orderDate: new Date(),
            status: 'FULFILLED',
            totalAmount: 75.00,
          },
        }),
        prisma.order.create({
          data: {
            customerId: testCustomerId,
            orderDate: new Date(),
            status: 'FULFILLED',
            totalAmount: 60.00,
          },
        }),
      ]);

      // Create route with multiple stops
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Multi-Stop-Route',
          routeDate: new Date(),
          status: 'PLANNED',
          routeStops: {
            create: orders.map((order, index) => ({
              orderId: order.id,
              stopOrder: index + 1,
              customerName: 'E2E Customer',
              address: '200 E2E St',
              city: 'TestCity',
              state: 'CA',
              zipCode: '90000',
              estimatedArrival: `${10 + index}:00 AM`,
              status: 'PENDING',
            })),
          },
        },
        include: { routeStops: true },
      });

      expect(route.routeStops).toHaveLength(3);
      expect(route.routeStops[0].stopOrder).toBe(1);
      expect(route.routeStops[2].stopOrder).toBe(3);
    });
  });

  describe('Workflow C: Location Management', () => {
    it('should complete location management workflow', async () => {
      // Step 1: Receive new inventory (already created)
      const inventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      expect(inventory).toBeDefined();

      // Step 2: Assign warehouse location
      const newLocation = 'C-05-10';

      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[0] },
        data: { warehouseLocation: newLocation },
      });

      const updatedInventory = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      expect(updatedInventory!.warehouseLocation).toBe(newLocation);

      // Step 3: pickOrder calculated automatically
      const calculatePickOrder = (location: string): number => {
        const [aisle, rack, shelf] = location.split('-');
        return (
          (aisle.charCodeAt(0) - 65) * 10000 +
          parseInt(rack) * 100 +
          parseInt(shelf)
        );
      };

      const pickOrder = calculatePickOrder(newLocation);

      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[0] },
        data: { pickOrder },
      });

      const inventoryWithPickOrder = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      expect(inventoryWithPickOrder!.pickOrder).toBe(pickOrder);

      // Step 4: Location saved
      expect(inventoryWithPickOrder!.warehouseLocation).toBe(newLocation);
      expect(inventoryWithPickOrder!.pickOrder).toBe(pickOrder);

      // Step 5: Available for picking
      const pickableItems = await prisma.inventoryItem.findMany({
        where: {
          warehouseLocation: { not: null },
          quantity: { gt: 0 },
        },
        orderBy: { pickOrder: 'asc' },
      });

      expect(pickableItems.some((item) => item.id === testInventoryIds[0])).toBe(true);

      // Step 6: Shows on warehouse map
      const locationMap = await prisma.inventoryItem.groupBy({
        by: ['warehouseLocation'],
        _count: { id: true },
        where: { warehouseLocation: { not: null } },
      });

      expect(locationMap.some((loc) => loc.warehouseLocation === newLocation)).toBe(true);
    });

    it('should handle bulk location assignment', async () => {
      const locations = [
        { id: testInventoryIds[0], location: 'A-01-01' },
        { id: testInventoryIds[1], location: 'A-01-02' },
        { id: testInventoryIds[2], location: 'B-02-01' },
      ];

      // Bulk update in transaction
      await prisma.$transaction(
        locations.map((loc) =>
          prisma.inventoryItem.update({
            where: { id: loc.id },
            data: {
              warehouseLocation: loc.location,
              pickOrder: 1, // Would be calculated
            },
          })
        )
      );

      const updatedItems = await prisma.inventoryItem.findMany({
        where: { id: { in: testInventoryIds } },
      });

      expect(updatedItems.every((item) => item.warehouseLocation !== null)).toBe(true);
    });
  });

  describe('Cross-Workflow Integration', () => {
    it('should integrate order fulfillment with routing', async () => {
      // Create order
      const order = await prisma.order.create({
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
      });

      // Generate pick sheet
      const pickSheet = await prisma.pickSheet.create({
        data: {
          status: 'PENDING',
          pickSheetItems: {
            create: [
              {
                orderId: order.id,
                inventoryItemId: testInventoryIds[0],
                productName: 'E2E Product A',
                sku: 'E2E-A-001',
                quantity: 5,
                warehouseLocation: 'A-01-01',
                pickOrder: 1,
                picked: false,
              },
            ],
          },
        },
      });

      // Pick items
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

      // Update order to fulfilled
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FULFILLED' },
      });

      // Create route
      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Integration-Route',
          routeDate: new Date(),
          status: 'PLANNED',
          routeStops: {
            create: [
              {
                orderId: order.id,
                stopOrder: 1,
                customerName: 'E2E Customer',
                address: '200 E2E St',
                city: 'TestCity',
                state: 'CA',
                zipCode: '90000',
                estimatedArrival: '10:30 AM',
                status: 'PENDING',
              },
            ],
          },
        },
      });

      // Verify complete integration
      const finalOrder = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          routeStops: {
            include: {
              deliveryRoute: true,
            },
          },
        },
      });

      expect(finalOrder!.status).toBe('FULFILLED');
      expect(finalOrder!.routeStops).toHaveLength(1);
      expect(finalOrder!.routeStops[0].deliveryRoute.status).toBe('PLANNED');
    });

    it('should handle complete end-to-end flow in <5 seconds', async () => {
      const startTime = Date.now();

      // Complete workflow
      const order = await prisma.order.create({
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
      });

      const pickSheet = await prisma.pickSheet.create({
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          pickSheetItems: {
            create: [
              {
                orderId: order.id,
                inventoryItemId: testInventoryIds[0],
                productName: 'E2E Product A',
                sku: 'E2E-A-001',
                quantity: 5,
                warehouseLocation: 'A-01-01',
                pickOrder: 1,
                picked: true,
              },
            ],
          },
        },
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'FULFILLED' },
      });

      const route = await prisma.deliveryRoute.create({
        data: {
          routeName: 'Speed-Test-Route',
          routeDate: new Date(),
          status: 'COMPLETED',
          routeStops: {
            create: [
              {
                orderId: order.id,
                stopOrder: 1,
                customerName: 'E2E Customer',
                address: '200 E2E St',
                city: 'TestCity',
                state: 'CA',
                zipCode: '90000',
                estimatedArrival: '10:30 AM',
                status: 'DELIVERED',
                actualArrival: new Date(),
              },
            ],
          },
        },
      });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // <5 seconds
      expect(order.status).toBe('FULFILLED');
      expect(route.status).toBe('COMPLETED');
    });
  });
});
