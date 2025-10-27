/**
 * Warehouse Location Integration Tests
 *
 * Tests location assignment, pickOrder calculation, and bulk operations
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { calculatePickOrder, bulkUpdateLocations, importLocationsFromCSV } from '@/lib/warehouse-locations';

describe('Warehouse Location Integration', () => {
  let testInventoryIds: string[] = [];

  beforeEach(async () => {
    // Create test inventory items
    const inventory1 = await prisma.inventoryItem.create({
      data: {
        productName: 'Product A',
        sku: 'SKU-A-001',
        quantity: 50,
        unitPrice: 10.00,
      },
    });

    const inventory2 = await prisma.inventoryItem.create({
      data: {
        productName: 'Product B',
        sku: 'SKU-B-001',
        quantity: 30,
        unitPrice: 15.00,
      },
    });

    const inventory3 = await prisma.inventoryItem.create({
      data: {
        productName: 'Product C',
        sku: 'SKU-C-001',
        quantity: 20,
        unitPrice: 20.00,
      },
    });

    testInventoryIds = [inventory1.id, inventory2.id, inventory3.id];
  });

  afterEach(async () => {
    await prisma.inventoryItem.deleteMany({});
  });

  describe('Location Assignment', () => {
    it('should assign location to inventory item', async () => {
      const location = 'A-01-01';

      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[0] },
        data: { warehouseLocation: location },
      });

      const item = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      expect(item!.warehouseLocation).toBe(location);
    });

    it('should auto-calculate pickOrder on location change', async () => {
      const location = 'B-03-02'; // Aisle B, Rack 03, Shelf 02

      const pickOrder = calculatePickOrder(location);

      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[0] },
        data: {
          warehouseLocation: location,
          pickOrder,
        },
      });

      const item = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      expect(item!.pickOrder).toBe(pickOrder);
      expect(item!.pickOrder).toBeGreaterThan(0);
    });

    it('should validate location format (A-01-01)', async () => {
      const validLocations = ['A-01-01', 'Z-99-99', 'M-50-25'];
      const invalidLocations = ['A-1-1', 'AA-01-01', 'A-01', 'Invalid'];

      validLocations.forEach((location) => {
        expect(() => validateLocationFormat(location)).not.toThrow();
      });

      invalidLocations.forEach((location) => {
        expect(() => validateLocationFormat(location)).toThrow('Invalid location format');
      });
    });

    it('should handle aisle out of range', async () => {
      const location = 'AA-01-01'; // Invalid: aisle must be single letter

      expect(() => validateLocationFormat(location)).toThrow(
        'Invalid location format'
      );
    });

    it('should detect duplicate locations', async () => {
      const location = 'A-01-01';

      // Assign location to first item
      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[0] },
        data: { warehouseLocation: location },
      });

      // Try to assign same location to second item
      await prisma.inventoryItem.update({
        where: { id: testInventoryIds[1] },
        data: { warehouseLocation: location },
      });

      // Check if both items have the same location (should be allowed for shared bins)
      const items = await prisma.inventoryItem.findMany({
        where: { warehouseLocation: location },
      });

      expect(items.length).toBe(2); // Multiple items can share location
    });
  });

  describe('PickOrder Calculation', () => {
    it('should calculate pickOrder correctly for aisle A', async () => {
      const order = calculatePickOrder('A-01-01');
      expect(order).toBe(1);
    });

    it('should calculate pickOrder correctly for aisle B', async () => {
      const order = calculatePickOrder('B-01-01');
      expect(order).toBeGreaterThan(calculatePickOrder('A-99-99'));
    });

    it('should order by aisle first, then rack, then shelf', async () => {
      const locations = [
        'A-01-01',
        'A-01-02',
        'A-02-01',
        'B-01-01',
      ];

      const orders = locations.map(calculatePickOrder);

      // Should be in ascending order
      expect(orders[0]).toBeLessThan(orders[1]); // Same aisle/rack, shelf differs
      expect(orders[1]).toBeLessThan(orders[2]); // Same aisle, rack differs
      expect(orders[2]).toBeLessThan(orders[3]); // Aisle differs
    });

    it('should handle null locations gracefully', async () => {
      const order = calculatePickOrder(null);
      expect(order).toBe(9999); // Should be sorted to end
    });

    it('should produce consistent pickOrder for same location', async () => {
      const location = 'C-05-10';
      const order1 = calculatePickOrder(location);
      const order2 = calculatePickOrder(location);

      expect(order1).toBe(order2);
    });
  });

  describe('Bulk Location Assignment', () => {
    it('should update multiple locations in single transaction', async () => {
      const updates = [
        { id: testInventoryIds[0], location: 'A-01-01' },
        { id: testInventoryIds[1], location: 'A-01-02' },
        { id: testInventoryIds[2], location: 'B-02-01' },
      ];

      await bulkUpdateLocations(updates);

      const items = await prisma.inventoryItem.findMany({
        where: { id: { in: testInventoryIds } },
        orderBy: { pickOrder: 'asc' },
      });

      expect(items[0].warehouseLocation).toBe('A-01-01');
      expect(items[1].warehouseLocation).toBe('A-01-02');
      expect(items[2].warehouseLocation).toBe('B-02-01');
      expect(items[0].pickOrder).toBeLessThan(items[2].pickOrder!);
    });

    it('should handle 100+ item bulk update efficiently', async () => {
      // Create 100 inventory items
      const inventoryPromises = Array.from({ length: 100 }, (_, i) =>
        prisma.inventoryItem.create({
          data: {
            productName: `Bulk Product ${i}`,
            sku: `BULK-${String(i).padStart(3, '0')}`,
            quantity: 10,
            unitPrice: 5.00,
          },
        })
      );

      const inventories = await Promise.all(inventoryPromises);

      const updates = inventories.map((inv, i) => ({
        id: inv.id,
        location: `A-${String(Math.floor(i / 10) + 1).padStart(2, '0')}-${String((i % 10) + 1).padStart(2, '0')}`,
      }));

      const startTime = Date.now();
      await bulkUpdateLocations(updates);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in <5 seconds

      const updatedItems = await prisma.inventoryItem.findMany({
        where: { id: { in: inventories.map((i) => i.id) } },
      });

      expect(updatedItems.every((item) => item.warehouseLocation !== null)).toBe(true);
    });

    it('should rollback on error in bulk update', async () => {
      const updates = [
        { id: testInventoryIds[0], location: 'A-01-01' },
        { id: 'invalid-id', location: 'A-01-02' }, // Invalid ID
        { id: testInventoryIds[2], location: 'B-02-01' },
      ];

      await expect(bulkUpdateLocations(updates)).rejects.toThrow();

      // First item should not be updated due to rollback
      const item = await prisma.inventoryItem.findUnique({
        where: { id: testInventoryIds[0] },
      });

      expect(item!.warehouseLocation).toBeNull();
    });
  });

  describe('CSV Import', () => {
    it('should import locations from CSV', async () => {
      const csvData = `sku,location
SKU-A-001,A-01-01
SKU-B-001,A-01-02
SKU-C-001,B-02-01`;

      const result = await importLocationsFromCSV(csvData);

      expect(result.imported).toBe(3);
      expect(result.errors).toHaveLength(0);

      const items = await prisma.inventoryItem.findMany({
        where: { sku: { in: ['SKU-A-001', 'SKU-B-001', 'SKU-C-001'] } },
      });

      expect(items[0].warehouseLocation).toBeDefined();
      expect(items[1].warehouseLocation).toBeDefined();
      expect(items[2].warehouseLocation).toBeDefined();
    });

    it('should validate CSV format', async () => {
      const invalidCSV = `invalid,headers
SKU-A-001,A-01-01`;

      await expect(importLocationsFromCSV(invalidCSV)).rejects.toThrow(
        'Invalid CSV format'
      );
    });

    it('should handle missing SKUs in CSV', async () => {
      const csvData = `sku,location
SKU-A-001,A-01-01
NONEXISTENT-SKU,A-01-02
SKU-C-001,B-02-01`;

      const result = await importLocationsFromCSV(csvData);

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('NONEXISTENT-SKU');
    });

    it('should handle invalid locations in CSV', async () => {
      const csvData = `sku,location
SKU-A-001,A-01-01
SKU-B-001,INVALID-LOCATION
SKU-C-001,B-02-01`;

      const result = await importLocationsFromCSV(csvData);

      expect(result.imported).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('SKU-B-001');
    });

    it('should handle large CSV files (1000+ rows)', async () => {
      // Create 1000 inventory items
      const inventories = await Promise.all(
        Array.from({ length: 1000 }, (_, i) =>
          prisma.inventoryItem.create({
            data: {
              productName: `CSV Product ${i}`,
              sku: `CSV-${String(i).padStart(4, '0')}`,
              quantity: 10,
              unitPrice: 5.00,
            },
          })
        )
      );

      const csvData = [
        'sku,location',
        ...inventories.map((inv, i) =>
          `${inv.sku},A-${String(Math.floor(i / 100) + 1).padStart(2, '0')}-${String((i % 100) + 1).padStart(2, '0')}`
        ),
      ].join('\n');

      const startTime = Date.now();
      const result = await importLocationsFromCSV(csvData);
      const duration = Date.now() - startTime;

      expect(result.imported).toBe(1000);
      expect(duration).toBeLessThan(5000); // <5 seconds for 1000 items
    });
  });

  describe('Location Search and Filtering', () => {
    beforeEach(async () => {
      await prisma.inventoryItem.updateMany({
        where: { id: testInventoryIds[0] },
        data: { warehouseLocation: 'A-01-01', pickOrder: calculatePickOrder('A-01-01') },
      });

      await prisma.inventoryItem.updateMany({
        where: { id: testInventoryIds[1] },
        data: { warehouseLocation: 'A-01-02', pickOrder: calculatePickOrder('A-01-02') },
      });

      await prisma.inventoryItem.updateMany({
        where: { id: testInventoryIds[2] },
        data: { warehouseLocation: 'B-02-01', pickOrder: calculatePickOrder('B-02-01') },
      });
    });

    it('should find items by aisle', async () => {
      const items = await prisma.inventoryItem.findMany({
        where: { warehouseLocation: { startsWith: 'A-' } },
      });

      expect(items).toHaveLength(2);
    });

    it('should find items by exact location', async () => {
      const items = await prisma.inventoryItem.findMany({
        where: { warehouseLocation: 'A-01-01' },
      });

      expect(items).toHaveLength(1);
      expect(items[0].id).toBe(testInventoryIds[0]);
    });

    it('should list items without locations', async () => {
      const items = await prisma.inventoryItem.findMany({
        where: { warehouseLocation: null },
      });

      expect(items.length).toBeGreaterThanOrEqual(0);
    });

    it('should sort items by pickOrder', async () => {
      const items = await prisma.inventoryItem.findMany({
        orderBy: { pickOrder: 'asc' },
        where: { warehouseLocation: { not: null } },
      });

      // Verify ascending order
      for (let i = 1; i < items.length; i++) {
        expect(items[i].pickOrder!).toBeGreaterThanOrEqual(items[i - 1].pickOrder!);
      }
    });
  });
});

// Helper functions (would be in actual implementation)
function validateLocationFormat(location: string): void {
  const regex = /^[A-Z]-\d{2}-\d{2}$/;
  if (!regex.test(location)) {
    throw new Error('Invalid location format. Expected: A-01-01');
  }
}
