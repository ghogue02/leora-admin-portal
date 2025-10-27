/**
 * Azuga Export Tests
 *
 * Tests CSV export functionality for Azuga routing integration
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { exportToAzugaCSV, formatAzugaAddress } from '@/lib/azuga-export';

describe('Azuga Export Integration', () => {
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
        territory: 'SF-North',
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
        deliveryInstructions: 'Leave at front door',
      },
    });

    const order2 = await prisma.order.create({
      data: {
        customerId: testCustomerId,
        orderDate: new Date('2025-01-15'),
        status: 'FULFILLED',
        totalAmount: 50.00,
        deliveryInstructions: 'Ring doorbell',
      },
    });

    testOrderIds = [order1.id, order2.id];
  });

  afterEach(async () => {
    await prisma.order.deleteMany({});
    await prisma.customer.deleteMany({});
  });

  describe('CSV Export', () => {
    it('should export orders to Azuga CSV format', async () => {
      const csv = await exportToAzugaCSV({
        orderIds: testOrderIds,
      });

      expect(csv).toBeDefined();
      expect(csv).toContain('Name,Address,City,State,Zip,Phone,Notes');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('123 Main St');
      expect(csv).toContain('San Francisco');
      expect(csv).toContain('CA');
      expect(csv).toContain('94102');
    });

    it('should format CSV with exact column headers', async () => {
      const csv = await exportToAzugaCSV({
        orderIds: testOrderIds,
      });

      const lines = csv.split('\n');
      const headers = lines[0];

      expect(headers).toBe('Name,Address,City,State,Zip,Phone,Notes');
    });

    it('should format each row correctly', async () => {
      const csv = await exportToAzugaCSV({
        orderIds: testOrderIds,
      });

      const lines = csv.split('\n');
      const dataRow = lines[1];

      const columns = dataRow.split(',');
      expect(columns).toHaveLength(7); // 7 columns
      expect(columns[0]).toBe('John Doe'); // Name
      expect(columns[1]).toBe('123 Main St'); // Address
      expect(columns[2]).toBe('San Francisco'); // City
      expect(columns[3]).toBe('CA'); // State
      expect(columns[4]).toBe('94102'); // Zip
      expect(columns[5]).toBe('555-0100'); // Phone
    });

    it('should handle delivery instructions in notes', async () => {
      const csv = await exportToAzugaCSV({
        orderIds: [testOrderIds[0]],
      });

      expect(csv).toContain('Leave at front door');
    });

    it('should handle special characters in addresses', async () => {
      const customer = await prisma.customer.create({
        data: {
          firstName: "O'Brien",
          lastName: 'Smith',
          email: 'obrien@example.com',
          phone: '555-0200',
          address: '456 "Main" St, Apt #2',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(),
          status: 'FULFILLED',
          totalAmount: 75.00,
        },
      });

      const csv = await exportToAzugaCSV({
        orderIds: [order.id],
      });

      // CSV should escape special characters
      expect(csv).toContain("O'Brien Smith");
      expect(csv).toContain('"456 ""Main"" St, Apt #2"'); // Quoted and escaped
    });

    it('should handle long delivery instructions with truncation', async () => {
      const longInstructions = 'A'.repeat(500); // 500 characters

      const customer = await prisma.customer.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0300',
          address: '789 Oak St',
          city: 'Seattle',
          state: 'WA',
          zipCode: '98101',
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(),
          status: 'FULFILLED',
          totalAmount: 60.00,
          deliveryInstructions: longInstructions,
        },
      });

      const csv = await exportToAzugaCSV({
        orderIds: [order.id],
      });

      // Notes should be truncated to 200 characters
      const lines = csv.split('\n');
      const dataRow = lines[1];
      const notes = dataRow.split(',')[6];

      expect(notes.length).toBeLessThanOrEqual(200);
    });
  });

  describe('Territory Filtering', () => {
    it('should filter orders by territory', async () => {
      // Create another customer in different territory
      const customer2 = await prisma.customer.create({
        data: {
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice@example.com',
          phone: '555-0400',
          address: '321 Pine St',
          city: 'Oakland',
          state: 'CA',
          zipCode: '94601',
          territory: 'SF-East',
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer2.id,
          orderDate: new Date(),
          status: 'FULFILLED',
          totalAmount: 80.00,
        },
      });

      const csv = await exportToAzugaCSV({
        territory: 'SF-North',
      });

      expect(csv).toContain('John Doe'); // SF-North territory
      expect(csv).not.toContain('Alice Johnson'); // SF-East territory
    });

    it('should export all territories when not specified', async () => {
      const customer2 = await prisma.customer.create({
        data: {
          firstName: 'Bob',
          lastName: 'Williams',
          email: 'bob@example.com',
          phone: '555-0500',
          address: '654 Elm St',
          city: 'Berkeley',
          state: 'CA',
          zipCode: '94704',
          territory: 'SF-East',
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer2.id,
          orderDate: new Date(),
          status: 'FULFILLED',
          totalAmount: 90.00,
        },
      });

      const csv = await exportToAzugaCSV({});

      expect(csv).toContain('John Doe');
      expect(csv).toContain('Bob Williams');
    });
  });

  describe('Date Filtering', () => {
    it('should filter orders by date range', async () => {
      const csv = await exportToAzugaCSV({
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
      });

      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(1); // Has data rows
    });

    it('should exclude orders outside date range', async () => {
      const csv = await exportToAzugaCSV({
        startDate: new Date('2025-01-20'),
        endDate: new Date('2025-01-25'),
      });

      const lines = csv.split('\n');
      expect(lines.length).toBe(1); // Only header row
    });

    it('should handle single day export', async () => {
      const today = new Date('2025-01-15');

      const csv = await exportToAzugaCSV({
        startDate: today,
        endDate: today,
      });

      expect(csv).toContain('John Doe');
    });
  });

  describe('Empty Export Handling', () => {
    it('should handle export with no orders', async () => {
      const csv = await exportToAzugaCSV({
        orderIds: [],
      });

      const lines = csv.split('\n');
      expect(lines.length).toBe(1); // Only header
      expect(lines[0]).toBe('Name,Address,City,State,Zip,Phone,Notes');
    });

    it('should handle export with no fulfilled orders', async () => {
      await prisma.order.updateMany({
        where: { id: { in: testOrderIds } },
        data: { status: 'PENDING' },
      });

      const csv = await exportToAzugaCSV({
        status: 'FULFILLED',
      });

      const lines = csv.split('\n');
      expect(lines.length).toBe(1); // Only header
    });
  });

  describe('Address Formatting', () => {
    it('should format complete addresses correctly', async () => {
      const address = formatAzugaAddress({
        address: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
      });

      expect(address).toContain('123 Main St');
    });

    it('should handle missing address components', async () => {
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          phone: '555-0600',
          address: '999 Test St',
          city: 'TestCity',
          state: 'CA',
          // No zipCode
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(),
          status: 'FULFILLED',
          totalAmount: 100.00,
        },
      });

      const csv = await exportToAzugaCSV({
        orderIds: [order.id],
      });

      const lines = csv.split('\n');
      const dataRow = lines[1];
      const columns = dataRow.split(',');

      expect(columns[4]).toBe(''); // Empty zip code
    });

    it('should handle apartment numbers', async () => {
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Apt',
          lastName: 'Resident',
          email: 'apt@example.com',
          phone: '555-0700',
          address: '100 Complex Dr, Apt 5B',
          city: 'San Jose',
          state: 'CA',
          zipCode: '95101',
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(),
          status: 'FULFILLED',
          totalAmount: 55.00,
        },
      });

      const csv = await exportToAzugaCSV({
        orderIds: [order.id],
      });

      expect(csv).toContain('100 Complex Dr, Apt 5B');
    });
  });

  describe('CSV Format Validation', () => {
    it('should use CRLF line endings', async () => {
      const csv = await exportToAzugaCSV({
        orderIds: testOrderIds,
        lineEnding: 'CRLF',
      });

      expect(csv).toContain('\r\n');
    });

    it('should use LF line endings when specified', async () => {
      const csv = await exportToAzugaCSV({
        orderIds: testOrderIds,
        lineEnding: 'LF',
      });

      expect(csv).not.toContain('\r\n');
      expect(csv).toContain('\n');
    });

    it('should use UTF-8 encoding', async () => {
      const customer = await prisma.customer.create({
        data: {
          firstName: 'José',
          lastName: 'García',
          email: 'jose@example.com',
          phone: '555-0800',
          address: '200 Cañón Rd',
          city: 'San Diego',
          state: 'CA',
          zipCode: '92101',
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(),
          status: 'FULFILLED',
          totalAmount: 45.00,
        },
      });

      const csv = await exportToAzugaCSV({
        orderIds: [order.id],
      });

      expect(csv).toContain('José García');
      expect(csv).toContain('Cañón');
    });

    it('should escape commas in fields', async () => {
      const customer = await prisma.customer.create({
        data: {
          firstName: 'Company',
          lastName: 'LLC',
          email: 'company@example.com',
          phone: '555-0900',
          address: '300 Business Park, Suite 100',
          city: 'Palo Alto',
          state: 'CA',
          zipCode: '94301',
        },
      });

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          orderDate: new Date(),
          status: 'FULFILLED',
          totalAmount: 120.00,
        },
      });

      const csv = await exportToAzugaCSV({
        orderIds: [order.id],
      });

      // Address with comma should be quoted
      expect(csv).toContain('"300 Business Park, Suite 100"');
    });
  });

  describe('Performance', () => {
    it('should export 50 orders in less than 3 seconds', async () => {
      // Create 50 customers and orders
      const customers = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
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
      const csv = await exportToAzugaCSV({
        orderIds: orders.map((o) => o.id),
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(3000); // <3 seconds
      expect(csv.split('\n').length).toBe(51); // 50 data rows + 1 header
    });
  });
});
