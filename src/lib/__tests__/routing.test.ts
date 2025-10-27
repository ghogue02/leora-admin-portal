/**
 * Routing System Tests
 * Comprehensive tests for Azuga export/import and route optimization
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  exportToAzuga,
  getExportHistory
} from '../azuga-export';
import {
  importRouteFromAzuga,
  getRouteWithStops
} from '../route-import';
import {
  groupOrdersByTerritory,
  sortByProximity,
  estimateDeliveryTime,
  calculateRouteDistance,
  optimizeRouteOrder,
  calculateEfficiencyScore
} from '../route-optimizer';
import {
  getTodayRoutes,
  getCustomerDeliveryETA,
  updateStopStatus,
  getRouteProgress
} from '../route-visibility';

// Mock database
jest.mock('../db', () => ({
  db: {
    orders: {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      executeTakeFirst: jest.fn(),
      update: jest.fn().mockReturnThis()
    },
    customers: {
      where: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn()
    },
    orderItems: {
      where: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      execute: jest.fn()
    },
    routeExports: {
      insert: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis()
    },
    deliveryRoutes: {
      insert: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      update: jest.fn().mockReturnThis()
    },
    routeStops: {
      insertMany: jest.fn().mockReturnThis(),
      execute: jest.fn(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      returning: jest.fn().mockReturnThis(),
      executeTakeFirst: jest.fn()
    }
  }
}));

describe('Azuga Export', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CSV Format', () => {
    it('should generate correct CSV header', async () => {
      const mockOrders = [{
        id: '1',
        order_number: 'ORD-001',
        status: 'picked',
        delivery_date: new Date('2025-01-15'),
        customer: {
          business_name: 'Test Bistro',
          address: '123 Main St',
          city: 'Baltimore',
          state: 'MD',
          zip_code: '21201',
          phone: '410-555-1234'
        },
        items: [
          { product_name: 'Wine', category: 'Wine', quantity: 6 }
        ]
      }];

      const db = require('../db').db;
      db.orders.execute.mockResolvedValue(mockOrders);
      db.customers.executeTakeFirst.mockResolvedValue(mockOrders[0].customer);
      db.orderItems.execute.mockResolvedValue(mockOrders[0].items);
      db.routeExports.execute.mockResolvedValue({});

      const result = await exportToAzuga('tenant-1', 'user-1', new Date('2025-01-15'));

      expect(result.csv).toContain('Customer Name,Address,City,State,Zip,Phone,Order Number,Items,Delivery Window,Special Instructions');
    });

    it('should format row data correctly', async () => {
      const mockOrders = [{
        id: '1',
        order_number: 'ORD-001',
        status: 'picked',
        delivery_date: new Date('2025-01-15'),
        customer: {
          business_name: 'Test Bistro',
          address: '123 Main St',
          city: 'Baltimore',
          state: 'MD',
          zip_code: '21201',
          phone: '410-555-1234'
        },
        items: [
          { product_name: 'Wine', category: 'Wine', quantity: 6 }
        ],
        delivery_instructions: 'Use back door'
      }];

      const db = require('../db').db;
      db.orders.execute.mockResolvedValue(mockOrders);
      db.customers.executeTakeFirst.mockResolvedValue(mockOrders[0].customer);
      db.orderItems.execute.mockResolvedValue(mockOrders[0].items);
      db.routeExports.execute.mockResolvedValue({});

      const result = await exportToAzuga('tenant-1', 'user-1', new Date('2025-01-15'));

      expect(result.csv).toContain('Test Bistro');
      expect(result.csv).toContain('ORD-001');
      expect(result.csv).toContain('Wine: 6 items');
      expect(result.csv).toContain('Use back door');
    });

    it('should escape special characters in CSV', async () => {
      const mockOrders = [{
        id: '1',
        order_number: 'ORD-001',
        status: 'picked',
        delivery_date: new Date('2025-01-15'),
        customer: {
          business_name: 'Joe\'s "Fine" Wine, LLC',
          address: '123 Main St, Suite 100',
          city: 'Baltimore',
          state: 'MD',
          zip_code: '21201',
          phone: '410-555-1234'
        },
        items: [],
        delivery_instructions: 'Ring bell, don\'t knock'
      }];

      const db = require('../db').db;
      db.orders.execute.mockResolvedValue(mockOrders);
      db.customers.executeTakeFirst.mockResolvedValue(mockOrders[0].customer);
      db.orderItems.execute.mockResolvedValue([]);
      db.routeExports.execute.mockResolvedValue({});

      const result = await exportToAzuga('tenant-1', 'user-1', new Date('2025-01-15'));

      // Should properly escape quotes and commas
      expect(result.csv).toContain('"Joe\'s ""Fine"" Wine, LLC"');
    });
  });

  describe('Filters', () => {
    it('should filter by territory', async () => {
      const db = require('../db').db;
      db.orders.execute.mockResolvedValue([]);

      await exportToAzuga('tenant-1', 'user-1', new Date('2025-01-15'), {
        territory: 'north'
      });

      expect(db.orders.where).toHaveBeenCalledWith('territory', '=', 'north');
    });

    it('should filter by driver', async () => {
      const db = require('../db').db;
      db.orders.execute.mockResolvedValue([]);

      await exportToAzuga('tenant-1', 'user-1', new Date('2025-01-15'), {
        driver: 'driver-123'
      });

      expect(db.orders.where).toHaveBeenCalledWith('assigned_driver', '=', 'driver-123');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid date', async () => {
      await expect(
        exportToAzuga('tenant-1', 'user-1', new Date('invalid'))
      ).rejects.toThrow('Valid delivery date is required');
    });

    it('should throw error when no orders found', async () => {
      const db = require('../db').db;
      db.orders.execute.mockResolvedValue([]);

      await expect(
        exportToAzuga('tenant-1', 'user-1', new Date('2025-01-15'))
      ).rejects.toThrow('No picked orders found');
    });
  });
});

describe('Route Import', () => {
  describe('CSV Parsing', () => {
    it('should parse valid Azuga route CSV', async () => {
      const csv = `Stop,Customer,Order Number,ETA,Address,Status
1,Bistro 123,ORD-001,8:30 AM,"123 Main St, Baltimore MD",Pending
2,Wine Bar,ORD-002,9:15 AM,"456 Oak Ave, Baltimore MD",Pending`;

      const db = require('../db').db;
      db.deliveryRoutes.executeTakeFirst.mockResolvedValue({ id: 'route-1' });
      db.routeStops.execute.mockResolvedValue({});
      db.orders.execute.mockResolvedValue([
        { id: '1', order_number: 'ORD-001' },
        { id: '2', order_number: 'ORD-002' }
      ]);

      const result = await importRouteFromAzuga('tenant-1', csv);

      expect(result.stops).toBe(2);
      expect(result.route).toBeDefined();
    });

    it('should handle quoted values with commas', async () => {
      const csv = `Stop,Customer,Order Number,ETA,Address,Status
1,"Joe's ""Fine"" Wine, LLC",ORD-001,8:30 AM,"123 Main St, Suite 100, Baltimore MD",Pending`;

      const db = require('../db').db;
      db.deliveryRoutes.executeTakeFirst.mockResolvedValue({ id: 'route-1' });
      db.routeStops.execute.mockResolvedValue({});
      db.orders.execute.mockResolvedValue([{ id: '1', order_number: 'ORD-001' }]);

      const result = await importRouteFromAzuga('tenant-1', csv);

      expect(result.stops).toBe(1);
    });

    it('should parse different time formats', async () => {
      const csv = `Stop,Customer,Order Number,ETA,Address,Status
1,Bistro,ORD-001,8:30 AM,"Address",Pending
2,Bar,ORD-002,14:30,"Address",Pending`;

      const db = require('../db').db;
      db.deliveryRoutes.executeTakeFirst.mockResolvedValue({ id: 'route-1' });
      db.routeStops.execute.mockResolvedValue({});
      db.orders.execute.mockResolvedValue([
        { id: '1', order_number: 'ORD-001' },
        { id: '2', order_number: 'ORD-002' }
      ]);

      const result = await importRouteFromAzuga('tenant-1', csv);

      expect(result.stops).toBe(2);
    });
  });

  describe('Validation', () => {
    it('should require sequential stop numbers', async () => {
      const csv = `Stop,Customer,Order Number,ETA,Address,Status
1,Bistro,ORD-001,8:30 AM,"Address",Pending
3,Bar,ORD-002,9:15 AM,"Address",Pending`;

      await expect(
        importRouteFromAzuga('tenant-1', csv)
      ).rejects.toThrow('Stop numbers must be sequential');
    });

    it('should reject duplicate order numbers', async () => {
      const csv = `Stop,Customer,Order Number,ETA,Address,Status
1,Bistro,ORD-001,8:30 AM,"Address",Pending
2,Bar,ORD-001,9:15 AM,"Address",Pending`;

      await expect(
        importRouteFromAzuga('tenant-1', csv)
      ).rejects.toThrow('Duplicate order numbers');
    });

    it('should validate ETA format', async () => {
      const csv = `Stop,Customer,Order Number,ETA,Address,Status
1,Bistro,ORD-001,invalid,"Address",Pending`;

      await expect(
        importRouteFromAzuga('tenant-1', csv)
      ).rejects.toThrow('Invalid ETA format');
    });
  });
});

describe('Route Optimization', () => {
  describe('Territory Grouping', () => {
    it('should group orders by territory', () => {
      const orders = [
        { id: '1', territory: 'north', customer: {} },
        { id: '2', territory: 'south', customer: {} },
        { id: '3', territory: 'north', customer: {} }
      ];

      const groups = groupOrdersByTerritory(orders);

      expect(groups.size).toBe(2);
      expect(groups.get('north')).toHaveLength(2);
      expect(groups.get('south')).toHaveLength(1);
    });

    it('should handle unassigned territory', () => {
      const orders = [
        { id: '1', territory: null, customer: {} }
      ];

      const groups = groupOrdersByTerritory(orders);

      expect(groups.has('unassigned')).toBe(true);
    });
  });

  describe('Proximity Sorting', () => {
    it('should sort by zip code proximity', () => {
      const orders = [
        { id: '1', customer: { zip_code: '21230' } },
        { id: '2', customer: { zip_code: '21201' } },
        { id: '3', customer: { zip_code: '21215' } }
      ];

      const sorted = sortByProximity(orders, { zipCode: '21210' });

      expect(sorted[0].customer.zip_code).toBe('21215'); // Closest to 21210
    });
  });

  describe('Delivery Time Estimation', () => {
    it('should estimate delivery times', () => {
      const orders = [
        { id: '1', customer: { zip_code: '21201', address: 'Address 1' } },
        { id: '2', customer: { zip_code: '21202', address: 'Address 2' } }
      ];

      const stops = estimateDeliveryTime(orders, '08:00');

      expect(stops).toHaveLength(2);
      expect(stops[0].stop_number).toBe(1);
      expect(stops[1].stop_number).toBe(2);

      // Second stop should be after first
      const time1 = new Date(stops[0].estimated_arrival).getTime();
      const time2 = new Date(stops[1].estimated_arrival).getTime();
      expect(time2).toBeGreaterThan(time1);
    });

    it('should account for service time between stops', () => {
      const orders = [
        { id: '1', customer: { zip_code: '21201', address: 'Address 1' } },
        { id: '2', customer: { zip_code: '21201', address: 'Address 2' } }
      ];

      const stops = estimateDeliveryTime(orders, '08:00', { minutesPerStop: 20 });

      const time1 = new Date(stops[0].estimated_arrival).getTime();
      const time2 = new Date(stops[1].estimated_arrival).getTime();
      const diffMinutes = (time2 - time1) / 60000;

      // Should include service time + travel time
      expect(diffMinutes).toBeGreaterThanOrEqual(20);
    });
  });

  describe('Route Distance', () => {
    it('should calculate approximate route distance', () => {
      const stops = [
        { stop_number: 1, address: 'Address, City, ST 21201' },
        { stop_number: 2, address: 'Address, City, ST 21210' },
        { stop_number: 3, address: 'Address, City, ST 21220' }
      ];

      const distance = calculateRouteDistance(stops);

      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('Route Optimization', () => {
    it('should optimize route using nearest neighbor', () => {
      const orders = [
        { id: '1', customer: { zip_code: '21230' } },
        { id: '2', customer: { zip_code: '21201' } },
        { id: '3', customer: { zip_code: '21215' } }
      ];

      const optimized = optimizeRouteOrder(orders, { zipCode: '21210' });

      expect(optimized).toHaveLength(3);
      // First stop should be closest to start location
      expect(optimized[0].customer.zip_code).toBe('21215');
    });
  });

  describe('Efficiency Score', () => {
    it('should calculate high score for well-ordered route', () => {
      const stops = [
        { stop_number: 1, estimated_arrival: new Date('2025-01-15T08:00:00') },
        { stop_number: 2, estimated_arrival: new Date('2025-01-15T08:15:00') },
        { stop_number: 3, estimated_arrival: new Date('2025-01-15T08:30:00') }
      ];

      const score = calculateEfficiencyScore(stops);

      expect(score).toBeGreaterThan(80);
    });

    it('should calculate low score for poorly-ordered route', () => {
      const stops = [
        { stop_number: 1, estimated_arrival: new Date('2025-01-15T08:00:00') },
        { stop_number: 2, estimated_arrival: new Date('2025-01-15T10:00:00') }, // Large gap
        { stop_number: 3, estimated_arrival: new Date('2025-01-15T07:00:00') } // Out of order
      ];

      const score = calculateEfficiencyScore(stops);

      expect(score).toBeLessThan(50);
    });
  });
});

describe('Route Visibility', () => {
  describe('Today Routes', () => {
    it('should return routes for current day', async () => {
      const mockRoutes = [
        { id: 'route-1', delivery_date: new Date(), total_stops: 5 }
      ];

      const db = require('../db').db;
      db.deliveryRoutes.execute.mockResolvedValue(mockRoutes);
      db.routeStops.execute.mockResolvedValue([]);

      const routes = await getTodayRoutes('tenant-1');

      expect(routes).toHaveLength(1);
    });
  });

  describe('Customer ETA', () => {
    it('should calculate real-time ETA', async () => {
      const db = require('../db').db;
      db.orders.executeTakeFirst.mockResolvedValue({
        id: '1',
        order_number: 'ORD-001',
        route_id: 'route-1'
      });
      db.deliveryRoutes.executeTakeFirst.mockResolvedValue({
        id: 'route-1',
        assigned_driver: 'driver-1'
      });
      db.routeStops.executeTakeFirst.mockResolvedValue({
        stop_number: 3,
        estimated_arrival: new Date(),
        status: 'pending'
      });
      db.routeStops.execute.mockResolvedValue([]);

      const eta = await getCustomerDeliveryETA('customer-1');

      expect(eta.route).toBeDefined();
      expect(eta.stop).toBeDefined();
      expect(eta.driver).toBe('driver-1');
    });
  });

  describe('Stop Status Update', () => {
    it('should update stop status and mark order delivered', async () => {
      const db = require('../db').db;
      db.routeStops.executeTakeFirst.mockResolvedValue({
        id: 'stop-1',
        route_id: 'route-1',
        order_number: 'ORD-001',
        status: 'delivered'
      });
      db.routeStops.execute.mockResolvedValue([]);
      db.deliveryRoutes.update.mockReturnThis();
      db.deliveryRoutes.execute.mockResolvedValue({});

      const updated = await updateStopStatus(
        'stop-1',
        'delivered',
        new Date()
      );

      expect(updated.status).toBe('delivered');
      expect(db.orders.update).toHaveBeenCalled();
    });
  });

  describe('Route Progress', () => {
    it('should calculate route progress correctly', async () => {
      const mockStops = [
        { stop_number: 1, status: 'delivered', estimated_arrival: new Date() },
        { stop_number: 2, status: 'delivered', estimated_arrival: new Date() },
        { stop_number: 3, status: 'pending', estimated_arrival: new Date() }
      ];

      const db = require('../db').db;
      db.deliveryRoutes.executeTakeFirst.mockResolvedValue({ id: 'route-1' });
      db.routeStops.execute.mockResolvedValue(mockStops);

      const progress = await getRouteProgress('route-1');

      expect(progress.totalStops).toBe(3);
      expect(progress.completedStops).toBe(2);
      expect(progress.percentComplete).toBe(67); // Rounded
    });
  });
});
