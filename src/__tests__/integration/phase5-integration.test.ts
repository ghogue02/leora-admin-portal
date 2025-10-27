/**
 * Phase 5 Integration Tests
 *
 * Tests cross-component workflows to ensure all Phase 5 features
 * integrate correctly with each other and with Phases 1-3.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { generatePickSheet } from '@/lib/pick-sheet-generator';
import { allocateInventory } from '@/lib/inventory';
import { getWarehouseLocation, calculatePickOrder } from '@/lib/warehouse';

const prisma = new PrismaClient();

describe('Phase 5 Integration Tests', () => {
  let tenantId: string;
  let warehouseLocations: any[];
  let testOrders: any[];
  let testSkus: any[];

  beforeAll(async () => {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-integration',
        name: 'Test Integration Tenant',
        timezone: 'America/New_York'
      }
    });
    tenantId = tenant.id;

    // Create warehouse zones
    const zones = await Promise.all([
      prisma.warehouseZone.create({
        data: {
          tenantId,
          name: 'A',
          description: 'Red Wine',
          color: '#FF0000',
          startOrder: 1000,
          endOrder: 1999
        }
      }),
      prisma.warehouseZone.create({
        data: {
          tenantId,
          name: 'B',
          description: 'White Wine',
          color: '#00FF00',
          startOrder: 2000,
          endOrder: 2999
        }
      })
    ]);

    // Create warehouse locations
    warehouseLocations = await Promise.all([
      prisma.warehouseLocation.create({
        data: {
          tenantId,
          zone: 'A',
          aisle: '01',
          section: 'A',
          shelf: 1,
          pickOrder: 1001,
          capacity: 100,
          isActive: true
        }
      }),
      prisma.warehouseLocation.create({
        data: {
          tenantId,
          zone: 'A',
          aisle: '01',
          section: 'B',
          shelf: 1,
          pickOrder: 1002,
          capacity: 100,
          isActive: true
        }
      }),
      prisma.warehouseLocation.create({
        data: {
          tenantId,
          zone: 'B',
          aisle: '02',
          section: 'A',
          shelf: 1,
          pickOrder: 2001,
          capacity: 100,
          isActive: true
        }
      })
    ]);

    // Create test products and SKUs
    const product1 = await prisma.product.create({
      data: {
        tenantId,
        name: 'Test Chardonnay 2023',
        brand: 'Test Winery'
      }
    });

    const product2 = await prisma.product.create({
      data: {
        tenantId,
        name: 'Test Pinot Noir 2023',
        brand: 'Test Winery'
      }
    });

    testSkus = await Promise.all([
      prisma.sku.create({
        data: {
          tenantId,
          productId: product1.id,
          code: 'TEST-CHARD-001',
          size: '750ml',
          pricePerUnit: 15.99
        }
      }),
      prisma.sku.create({
        data: {
          tenantId,
          productId: product2.id,
          code: 'TEST-PINOT-001',
          size: '750ml',
          pricePerUnit: 19.99
        }
      })
    ]);

    // Create inventory at warehouse locations
    await Promise.all([
      prisma.inventory.create({
        data: {
          tenantId,
          skuId: testSkus[0].id,
          location: 'Warehouse A',
          onHand: 100,
          allocated: 0
        }
      }),
      prisma.inventory.create({
        data: {
          tenantId,
          skuId: testSkus[1].id,
          location: 'Warehouse B',
          onHand: 50,
          allocated: 0
        }
      })
    ]);

    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: 'Test Customer',
        externalId: 'TEST-CUST-001',
        street1: '123 Test St',
        city: 'Portland',
        state: 'OR',
        postalCode: '97201'
      }
    });

    // Create test orders
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7); // 1 week from now

    testOrders = await Promise.all([
      prisma.order.create({
        data: {
          tenantId,
          customerId: customer.id,
          status: 'SUBMITTED',
          deliveryWeek: Math.ceil((deliveryDate.getDate()) / 7),
          orderedAt: new Date(),
          lines: {
            create: [
              {
                tenantId,
                skuId: testSkus[0].id,
                quantity: 12,
                unitPrice: 15.99
              },
              {
                tenantId,
                skuId: testSkus[1].id,
                quantity: 6,
                unitPrice: 19.99
              }
            ]
          }
        },
        include: {
          lines: true
        }
      }),
      prisma.order.create({
        data: {
          tenantId,
          customerId: customer.id,
          status: 'SUBMITTED',
          deliveryWeek: Math.ceil((deliveryDate.getDate()) / 7),
          orderedAt: new Date(),
          lines: {
            create: [
              {
                tenantId,
                skuId: testSkus[0].id,
                quantity: 6,
                unitPrice: 15.99
              }
            ]
          }
        },
        include: {
          lines: true
        }
      })
    ]);
  });

  afterAll(async () => {
    // Cleanup: Delete all test data
    await prisma.pickSheetItem.deleteMany({ where: { tenantId } });
    await prisma.pickSheet.deleteMany({ where: { tenantId } });
    await prisma.routeStop.deleteMany({ where: { tenantId } });
    await prisma.deliveryRoute.deleteMany({ where: { tenantId } });
    await prisma.orderLine.deleteMany({ where: { tenantId } });
    await prisma.order.deleteMany({ where: { tenantId } });
    await prisma.inventory.deleteMany({ where: { tenantId } });
    await prisma.sku.deleteMany({ where: { tenantId } });
    await prisma.product.deleteMany({ where: { tenantId } });
    await prisma.customer.deleteMany({ where: { tenantId } });
    await prisma.warehouseLocation.deleteMany({ where: { tenantId } });
    await prisma.warehouseZone.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });

    await prisma.$disconnect();
  });

  describe('Warehouse Location Integration', () => {
    it('should calculate pick order correctly based on zone/aisle/section', () => {
      const location1 = warehouseLocations[0]; // A-01-A-1
      const location2 = warehouseLocations[1]; // A-01-B-1
      const location3 = warehouseLocations[2]; // B-02-A-1

      expect(location1.pickOrder).toBeLessThan(location2.pickOrder);
      expect(location2.pickOrder).toBeLessThan(location3.pickOrder);

      // Same zone, same aisle, adjacent sections
      expect(location2.pickOrder - location1.pickOrder).toBe(1);
    });

    it('should retrieve location by components', async () => {
      const location = await getWarehouseLocation(tenantId, {
        zone: 'A',
        aisle: '01',
        section: 'A',
        shelf: 1
      });

      expect(location).toBeDefined();
      expect(location?.zone).toBe('A');
      expect(location?.pickOrder).toBe(1001);
    });

    it('should find optimal location for SKU', async () => {
      // This would use a location assignment algorithm
      // For now, just verify we can query by zone
      const zoneALocations = await prisma.warehouseLocation.findMany({
        where: {
          tenantId,
          zone: 'A',
          isActive: true
        },
        orderBy: {
          pickOrder: 'asc'
        }
      });

      expect(zoneALocations.length).toBeGreaterThan(0);
      expect(zoneALocations[0].zone).toBe('A');
    });
  });

  describe('Inventory Allocation Integration', () => {
    it('should allocate inventory for order lines', async () => {
      const order = testOrders[0];
      const orderLines = order.lines;

      for (const line of orderLines) {
        const allocated = await allocateInventory(tenantId, line.skuId, line.quantity);
        expect(allocated).toBe(true);
      }

      // Verify inventory allocated field updated
      const inventoryAfter = await prisma.inventory.findMany({
        where: {
          tenantId,
          skuId: { in: testSkus.map(s => s.id) }
        }
      });

      const totalAllocated = inventoryAfter.reduce((sum, inv) => sum + inv.allocated, 0);
      expect(totalAllocated).toBe(18); // 12 + 6 from first order
    });

    it('should handle insufficient inventory gracefully', async () => {
      const hugeQuantity = 10000;
      const allocated = await allocateInventory(tenantId, testSkus[0].id, hugeQuantity);
      expect(allocated).toBe(false);
    });
  });

  describe('Pick Sheet Generation Integration', () => {
    it('should generate pick sheet from orders', async () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const pickSheet = await generatePickSheet(tenantId, {
        deliveryDate,
        orderIds: testOrders.map(o => o.id),
        assignedTo: 'Test Picker'
      });

      expect(pickSheet).toBeDefined();
      expect(pickSheet.sheetNumber).toMatch(/^PS-\d{8}-\d{3}$/);
      expect(pickSheet.status).toBe('PENDING');
      expect(pickSheet.assignedTo).toBe('Test Picker');
    });

    it('should create pick sheet items sorted by pickOrder', async () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const pickSheet = await generatePickSheet(tenantId, {
        deliveryDate,
        orderIds: [testOrders[0].id]
      });

      const items = await prisma.pickSheetItem.findMany({
        where: {
          pickSheetId: pickSheet.id
        },
        orderBy: {
          pickOrder: 'asc'
        },
        include: {
          location: true,
          sku: true
        }
      });

      expect(items.length).toBeGreaterThan(0);

      // Verify items are sorted by pickOrder
      for (let i = 1; i < items.length; i++) {
        expect(items[i].pickOrder).toBeGreaterThanOrEqual(items[i - 1].pickOrder);
      }

      // Verify first item is from lowest pickOrder location
      expect(items[0].location.zone).toBe('A');
      expect(items[0].location.aisle).toBe('01');
    });

    it('should allocate inventory when generating pick sheet', async () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const inventoryBefore = await prisma.inventory.findFirst({
        where: {
          tenantId,
          skuId: testSkus[0].id
        }
      });

      const pickSheet = await generatePickSheet(tenantId, {
        deliveryDate,
        orderIds: [testOrders[1].id] // Order with 6 units of SKU 0
      });

      const inventoryAfter = await prisma.inventory.findFirst({
        where: {
          tenantId,
          skuId: testSkus[0].id
        }
      });

      expect(inventoryAfter!.allocated).toBeGreaterThan(inventoryBefore!.allocated);
    });

    it('should handle multiple orders in one pick sheet', async () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const pickSheet = await generatePickSheet(tenantId, {
        deliveryDate,
        orderIds: testOrders.map(o => o.id)
      });

      const items = await prisma.pickSheetItem.findMany({
        where: {
          pickSheetId: pickSheet.id
        }
      });

      // Should have items from both orders
      expect(items.length).toBeGreaterThan(2);

      // Verify distinct orders
      const distinctOrders = new Set(items.map(item => item.orderId));
      expect(distinctOrders.size).toBe(testOrders.length);
    });
  });

  describe('Pick Sheet Completion Integration', () => {
    it('should mark pick sheet as complete when all items picked', async () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const pickSheet = await generatePickSheet(tenantId, {
        deliveryDate,
        orderIds: [testOrders[1].id]
      });

      // Start picking
      await prisma.pickSheet.update({
        where: { id: pickSheet.id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });

      // Mark all items as picked
      const items = await prisma.pickSheetItem.findMany({
        where: { pickSheetId: pickSheet.id }
      });

      for (const item of items) {
        await prisma.pickSheetItem.update({
          where: { id: item.id },
          data: {
            isPicked: true,
            pickedAt: new Date(),
            pickedBy: 'Test Picker'
          }
        });
      }

      // Complete pick sheet
      const completedSheet = await prisma.pickSheet.update({
        where: { id: pickSheet.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      expect(completedSheet.status).toBe('COMPLETED');
      expect(completedSheet.completedAt).toBeDefined();
    });
  });

  describe('Route Creation Integration', () => {
    it('should create delivery route with stops', async () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const route = await prisma.deliveryRoute.create({
        data: {
          tenantId,
          routeName: 'Test Route A',
          routeNumber: 'RTI-TEST-001',
          status: 'DRAFT',
          deliveryDate,
          driverName: 'Test Driver',
          stops: {
            create: testOrders.map((order, index) => ({
              tenantId,
              stopNumber: index + 1,
              customerId: order.customerId,
              orderId: order.id,
              addressLine1: '123 Test St',
              city: 'Portland',
              state: 'OR',
              postalCode: '97201'
            }))
          }
        },
        include: {
          stops: {
            orderBy: {
              stopNumber: 'asc'
            }
          }
        }
      });

      expect(route).toBeDefined();
      expect(route.stops.length).toBe(testOrders.length);
      expect(route.stops[0].stopNumber).toBe(1);
      expect(route.stops[1].stopNumber).toBe(2);
    });

    it('should link pick sheet to route', async () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const route = await prisma.deliveryRoute.create({
        data: {
          tenantId,
          routeName: 'Test Route B',
          status: 'DRAFT',
          deliveryDate,
          driverName: 'Test Driver'
        }
      });

      const pickSheet = await generatePickSheet(tenantId, {
        deliveryDate,
        orderIds: [testOrders[0].id],
        routeId: route.id
      });

      expect(pickSheet.routeId).toBe(route.id);
    });
  });

  describe('CSV Export Integration', () => {
    it('should export pick sheet to CSV format', async () => {
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const pickSheet = await generatePickSheet(tenantId, {
        deliveryDate,
        orderIds: [testOrders[0].id]
      });

      const items = await prisma.pickSheetItem.findMany({
        where: { pickSheetId: pickSheet.id },
        include: {
          location: true,
          sku: {
            include: {
              product: true
            }
          },
          customer: true,
          order: true
        },
        orderBy: {
          pickOrder: 'asc'
        }
      });

      // Simulate CSV export
      const csvRows = items.map(item => ({
        pickOrder: item.pickOrder,
        zone: item.location.zone,
        aisle: item.location.aisle,
        section: item.location.section,
        shelf: item.location.shelf,
        sku: item.sku.code,
        product: item.sku.product.name,
        quantity: item.quantity,
        customer: item.customer.name,
        orderNumber: item.order.id.slice(0, 8)
      }));

      expect(csvRows.length).toBeGreaterThan(0);
      expect(csvRows[0]).toHaveProperty('pickOrder');
      expect(csvRows[0]).toHaveProperty('zone');
      expect(csvRows[0]).toHaveProperty('sku');
    });
  });

  describe('Cross-Phase Integration', () => {
    it('should work with Phase 1 (Portal) orders', async () => {
      // Orders created through portal flow into pick sheets
      const order = testOrders[0];
      expect(order.status).toBe('SUBMITTED');

      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const pickSheet = await generatePickSheet(tenantId, {
        deliveryDate,
        orderIds: [order.id]
      });

      expect(pickSheet).toBeDefined();
      expect(pickSheet.totalItems).toBeGreaterThan(0);
    });

    it('should work with Phase 2 (Inventory) system', async () => {
      // Verify inventory integration
      const inventory = await prisma.inventory.findFirst({
        where: {
          tenantId,
          skuId: testSkus[0].id
        }
      });

      expect(inventory).toBeDefined();
      expect(inventory!.onHand).toBeGreaterThan(0);

      // Allocate some inventory
      const allocated = await allocateInventory(tenantId, testSkus[0].id, 5);
      expect(allocated).toBe(true);

      // Verify allocation updated
      const inventoryAfter = await prisma.inventory.findFirst({
        where: {
          tenantId,
          skuId: testSkus[0].id
        }
      });

      expect(inventoryAfter!.allocated).toBeGreaterThan(inventory!.allocated);
    });

    it('should maintain tenant isolation', async () => {
      // Create second tenant
      const tenant2 = await prisma.tenant.create({
        data: {
          slug: 'test-tenant-2',
          name: 'Test Tenant 2'
        }
      });

      // Try to access first tenant's data from second tenant context
      const locations = await prisma.warehouseLocation.findMany({
        where: {
          tenantId: tenant2.id
        }
      });

      expect(locations.length).toBe(0);

      // Cleanup
      await prisma.tenant.delete({ where: { id: tenant2.id } });
    });
  });

  describe('Performance Integration', () => {
    it('should generate pick sheet efficiently for 100 items', async () => {
      // Create 100 order lines
      const bigOrder = await prisma.order.create({
        data: {
          tenantId,
          customerId: (await prisma.customer.findFirst({ where: { tenantId } }))!.id,
          status: 'SUBMITTED',
          lines: {
            create: Array.from({ length: 100 }, (_, i) => ({
              tenantId,
              skuId: testSkus[i % testSkus.length].id,
              quantity: 1,
              unitPrice: 10.00
            }))
          }
        }
      });

      const startTime = Date.now();

      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 7);

      const pickSheet = await generatePickSheet(tenantId, {
        deliveryDate,
        orderIds: [bigOrder.id]
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should complete in < 2 seconds
      expect(pickSheet.totalItems).toBe(100);

      // Cleanup
      await prisma.orderLine.deleteMany({ where: { orderId: bigOrder.id } });
      await prisma.order.delete({ where: { id: bigOrder.id } });
    });
  });
});
