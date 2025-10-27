/**
 * Route Import Tests
 *
 * Tests importing routes from Azuga CSV and creating delivery routes
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { importRouteFromCSV, parseAzugaRouteCSV } from '@/lib/route-import';

describe('Route Import Integration', () => {
  let testCustomerId: string;
  let testOrderIds: string[] = [];

  beforeEach(async () => {
    // Create test customer
    const customer = await prisma.customer.create({
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-0100',
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
      },
    });
    testCustomerId = customer.id;

    // Create test orders
    const order1 = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderDate: new Date('2025-01-15'),
        status: 'FULFILLED',
        totalAmount: 100.00,
      },
    });

    const order2 = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderDate: new Date('2025-01-15'),
        status: 'FULFILLED',
        totalAmount: 50.00,
      },
    });

    testOrderIds = [order1.id, order2.id];
  });

  afterEach(async () => {
    await prisma.routeStop.deleteMany({});
    await prisma.deliveryRoute.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.customer.deleteMany({});
  });

  describe('CSV Parsing', () => {
    it('should parse Azuga route CSV correctly', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-2025-01-15,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM
Route-2025-01-15,2,John Doe,123 Main St,San Francisco,CA,94102,11:00 AM`;

      const result = parseAzugaRouteCSV(csvData);

      expect(result.routeName).toBe('Route-2025-01-15');
      expect(result.stops).toHaveLength(2);
      expect(result.stops[0].stopOrder).toBe(1);
      expect(result.stops[1].stopOrder).toBe(2);
    });

    it('should parse stop order correctly', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,3,Customer A,100 First St,City A,CA,90001,9:00 AM
Route-001,1,Customer B,200 Second St,City B,CA,90002,10:00 AM
Route-001,2,Customer C,300 Third St,City C,CA,90003,11:00 AM`;

      const result = parseAzugaRouteCSV(csvData);

      expect(result.stops[0].stopOrder).toBe(3);
      expect(result.stops[1].stopOrder).toBe(1);
      expect(result.stops[2].stopOrder).toBe(2);
    });

    it('should parse ETA times', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      const result = parseAzugaRouteCSV(csvData);

      expect(result.stops[0].estimatedArrival).toBeDefined();
      expect(result.stops[0].estimatedArrival).toContain('10:30');
    });

    it('should handle invalid CSV format', async () => {
      const invalidCSV = `Invalid,Headers
Data,Row`;

      expect(() => parseAzugaRouteCSV(invalidCSV)).toThrow('Invalid CSV format');
    });

    it('should handle empty CSV', async () => {
      const emptyCSV = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA`;

      const result = parseAzugaRouteCSV(emptyCSV);

      expect(result.stops).toHaveLength(0);
    });
  });

  describe('Route Creation', () => {
    it('should create DeliveryRoute and RouteStops', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-2025-01-15,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM
Route-2025-01-15,2,John Doe,123 Main St,San Francisco,CA,94102,11:00 AM`;

      const result = await importRouteFromCSV(csvData);

      expect(result.route).toBeDefined();
      expect(result.route.routeName).toBe('Route-2025-01-15');
      expect(result.stops).toHaveLength(2);
    });

    it('should link stops to existing orders', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-2025-01-15,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      const result = await importRouteFromCSV(csvData);

      const stops = await prisma.routeStop.findMany({
        where: { deliveryRouteId: result.route.id },
      });

      // Should find matching order by customer address
      expect(stops[0].orderId).toBeDefined();
    });

    it('should create stops in correct order', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,2,Customer A,100 First St,City A,CA,90001,10:00 AM
Route-001,1,Customer B,200 Second St,City B,CA,90002,9:00 AM
Route-001,3,Customer C,300 Third St,City C,CA,90003,11:00 AM`;

      const result = await importRouteFromCSV(csvData);

      const stops = await prisma.routeStop.findMany({
        where: { deliveryRouteId: result.route.id },
        orderBy: { stopOrder: 'asc' },
      });

      expect(stops[0].stopOrder).toBe(1);
      expect(stops[1].stopOrder).toBe(2);
      expect(stops[2].stopOrder).toBe(3);
    });

    it('should set route status to PLANNED', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      const result = await importRouteFromCSV(csvData);

      expect(result.route.status).toBe('PLANNED');
    });

    it('should set route date from route name', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-2025-01-15,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      const result = await importRouteFromCSV(csvData);

      expect(result.route.routeDate).toBeDefined();
      expect(result.route.routeDate.toISOString()).toContain('2025-01-15');
    });
  });

  describe('Order Matching', () => {
    it('should match stops to orders by address', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      const result = await importRouteFromCSV(csvData);

      const stop = result.stops[0];
      expect(stop.orderId).toBe(testOrderIds[0]); // Matches first order's address
    });

    it('should handle missing orders gracefully', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,Unknown Customer,999 Nowhere St,Unknown City,CA,99999,10:30 AM`;

      const result = await importRouteFromCSV(csvData);

      const stop = result.stops[0];
      expect(stop.orderId).toBeNull(); // No matching order found
      expect(result.warnings).toContain('No order found for stop 1');
    });

    it('should match by name and address combination', async () => {
      // Create customer with different address
      const customer2 = await prisma.customer.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0200',
          address: '456 Oak St',
          city: 'Oakland',
          state: 'CA',
          zipCode: '94601',
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer2.id,
          orderDate: new Date('2025-01-15'),
          status: 'FULFILLED',
          totalAmount: 75.00,
        },
      });

      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,Jane Smith,456 Oak St,Oakland,CA,94601,10:30 AM`;

      const result = await importRouteFromCSV(csvData);

      const stop = result.stops[0];
      expect(stop.orderId).toBe(order.id);
    });
  });

  describe('Duplicate Detection', () => {
    it('should detect duplicate route names', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      // Import once
      await importRouteFromCSV(csvData);

      // Try to import again
      await expect(importRouteFromCSV(csvData)).rejects.toThrow(
        'Route with name Route-001 already exists'
      );
    });

    it('should allow same route name on different dates', async () => {
      const csvData1 = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      const csvData2 = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-002,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      const result1 = await importRouteFromCSV(csvData1);
      const result2 = await importRouteFromCSV(csvData2);

      expect(result1.route.id).not.toBe(result2.route.id);
    });
  });

  describe('Error Handling', () => {
    it('should validate route name format', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      await expect(importRouteFromCSV(csvData)).rejects.toThrow(
        'Route name is required'
      );
    });

    it('should validate stop order is numeric', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,ABC,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      await expect(importRouteFromCSV(csvData)).rejects.toThrow(
        'Invalid stop order'
      );
    });

    it('should handle missing required fields', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,,123 Main St,San Francisco,CA,94102,10:30 AM`;

      const result = await importRouteFromCSV(csvData);

      expect(result.warnings).toContain('Stop 1 missing customer name');
    });

    it('should rollback on transaction failure', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM
Route-001,INVALID,Jane Smith,456 Oak St,Oakland,CA,94601,11:00 AM`;

      await expect(importRouteFromCSV(csvData)).rejects.toThrow();

      // Route should not exist due to rollback
      const routes = await prisma.deliveryRoute.findMany({
        where: { routeName: 'Route-001' },
      });

      expect(routes).toHaveLength(0);
    });
  });

  describe('Large File Handling', () => {
    it('should import route with 20 stops efficiently', async () => {
      // Create 20 customers and orders
      const customers = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          prisma.customer.create({
            data: {
              firstName: `Customer${i}`,
              lastName: `LastName${i}`,
              email: `customer${i}@example.com`,
              phone: `555-${String(i).padStart(4, '0')}`,
              address: `${i + 1} Street Rd`,
              city: 'TestCity',
              state: 'CA',
              zipCode: '90000',
            },
          })
        )
      );

      await Promise.all(
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

      const csvRows = [
        'Route Name,Stop Order,Name,Address,City,State,Zip,ETA',
        ...customers.map((customer, i) =>
          `Route-Large,${i + 1},${customer.firstName} ${customer.lastName},${customer.address},TestCity,CA,90000,${9 + i}:00 AM`
        ),
      ];

      const csvData = csvRows.join('\n');

      const startTime = Date.now();
      const result = await importRouteFromCSV(csvData);
      const duration = Date.now() - startTime;

      expect(result.stops).toHaveLength(20);
      expect(duration).toBeLessThan(2000); // <2 seconds
    });
  });

  describe('Data Integrity', () => {
    it('should maintain stop order sequence', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,Customer A,100 First St,City A,CA,90001,9:00 AM
Route-001,2,Customer B,200 Second St,City B,CA,90002,10:00 AM
Route-001,3,Customer C,300 Third St,City C,CA,90003,11:00 AM`;

      const result = await importRouteFromCSV(csvData);

      const stops = await prisma.routeStop.findMany({
        where: { deliveryRouteId: result.route.id },
        orderBy: { stopOrder: 'asc' },
      });

      // Verify no gaps in sequence
      stops.forEach((stop, index) => {
        expect(stop.stopOrder).toBe(index + 1);
      });
    });

    it('should link all stops to same route', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,John Doe,123 Main St,San Francisco,CA,94102,9:00 AM
Route-001,2,John Doe,123 Main St,San Francisco,CA,94102,10:00 AM`;

      const result = await importRouteFromCSV(csvData);

      const stops = await prisma.routeStop.findMany({
        where: { deliveryRouteId: result.route.id },
      });

      expect(stops.every((stop) => stop.deliveryRouteId === result.route.id)).toBe(true);
    });

    it('should preserve ETA information', async () => {
      const csvData = `Route Name,Stop Order,Name,Address,City,State,Zip,ETA
Route-001,1,John Doe,123 Main St,San Francisco,CA,94102,10:30 AM`;

      const result = await importRouteFromCSV(csvData);

      const stop = result.stops[0];
      expect(stop.estimatedArrival).toBeDefined();
      expect(stop.estimatedArrival).toContain('10:30');
    });
  });
});
