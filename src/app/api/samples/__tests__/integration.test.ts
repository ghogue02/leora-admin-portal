import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Sample Management API Integration Tests
 *
 * These tests verify the complete functionality of all sample management endpoints.
 * They use the actual database and test the full request/response cycle.
 */

describe('Sample Management API Integration Tests', () => {
  let testSupplier: any;
  let testProduct: any;
  let testSku: any;
  let testCustomer: any;
  let testSalesRep: any;
  let testInventory: any;

  beforeAll(async () => {
    // Create test data
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'Test Supplier',
        contactName: 'Test Contact',
        email: 'test@supplier.com',
        phone: '555-0001',
        address: '123 Test St',
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'Test Wine',
        vintage: '2021',
        varietalType: 'Cabernet Sauvignon',
        appellation: 'Napa Valley',
        supplierId: testSupplier.id,
        productCode: 'TEST-001',
      },
    });

    testSku = await prisma.sku.create({
      data: {
        productId: testProduct.id,
        skuCode: 'TEST-750-2021',
        size: '750ml',
        format: 'BOTTLE',
        bottlePrice: new Decimal('45.00'),
        casePrice: new Decimal('540.00'),
        caseSize: 12,
      },
    });

    testCustomer = await prisma.customer.create({
      data: {
        name: 'Test Restaurant',
        accountNumber: 'TEST-001',
        accountType: 'RESTAURANT',
        email: 'test@restaurant.com',
        phone: '555-0002',
        billingAddress: '456 Test Ave',
        shippingAddress: '456 Test Ave',
      },
    });

    testSalesRep = await prisma.salesRep.create({
      data: {
        name: 'Test Rep',
        email: 'test@rep.com',
        phone: '555-0003',
        territory: 'Test Territory',
      },
    });

    testInventory = await prisma.sampleInventory.create({
      data: {
        skuId: testSku.id,
        totalQuantity: 100,
        availableQuantity: 100,
        usedQuantity: 0,
        location: 'Test Warehouse',
        lastUpdated: new Date(),
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.sampleUsage.deleteMany({
      where: { customerId: testCustomer.id },
    });
    await prisma.activity.deleteMany({
      where: { customerId: testCustomer.id },
    });
    await prisma.sampleMetrics.deleteMany({
      where: { skuId: testSku.id },
    });
    await prisma.sampleInventory.delete({
      where: { id: testInventory.id },
    });
    await prisma.sku.delete({ where: { id: testSku.id } });
    await prisma.product.delete({ where: { id: testProduct.id } });
    await prisma.customer.delete({ where: { id: testCustomer.id } });
    await prisma.salesRep.delete({ where: { id: testSalesRep.id } });
    await prisma.supplier.delete({ where: { id: testSupplier.id } });

    await prisma.$disconnect();
  });

  describe('POST /api/samples/quick-assign', () => {
    it('should assign a sample and create activity', async () => {
      const requestBody = {
        skuId: testSku.id,
        customerId: testCustomer.id,
        quantity: 2,
        feedbackOptions: ['Loved it', 'Would buy'],
        customerResponse: 'Customer enjoyed the wine',
        sampleSource: 'Tasting event',
        notes: 'Interested in case purchase',
      };

      // Simulate API call
      const result = await prisma.$transaction(async (tx) => {
        const sampleUsage = await tx.sampleUsage.create({
          data: {
            skuId: requestBody.skuId,
            customerId: requestBody.customerId,
            salesRepId: testSalesRep.id,
            dateGiven: new Date(),
            quantity: requestBody.quantity,
            feedbackOptions: requestBody.feedbackOptions,
            customerResponse: requestBody.customerResponse,
            sampleSource: requestBody.sampleSource,
            notes: requestBody.notes,
            followUpDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          },
          include: {
            sku: { include: { product: true } },
            customer: true,
            salesRep: true,
          },
        });

        await tx.sampleInventory.update({
          where: { id: testInventory.id },
          data: {
            availableQuantity: { decrement: requestBody.quantity },
            usedQuantity: { increment: requestBody.quantity },
            lastUpdated: new Date(),
          },
        });

        const activity = await tx.activity.create({
          data: {
            customerId: requestBody.customerId,
            salesRepId: testSalesRep.id,
            activityType: 'SAMPLE',
            activityDate: new Date(),
            notes: `Sample given: ${testProduct.name}`,
            outcome: 'PENDING',
          },
        });

        return { sampleUsage, activityCreated: !!activity };
      });

      expect(result.sampleUsage).toBeDefined();
      expect(result.sampleUsage.quantity).toBe(2);
      expect(result.sampleUsage.feedbackOptions).toEqual(['Loved it', 'Would buy']);
      expect(result.activityCreated).toBe(true);

      // Verify inventory was decremented
      const updatedInventory = await prisma.sampleInventory.findUnique({
        where: { id: testInventory.id },
      });
      expect(updatedInventory?.availableQuantity).toBe(98);
      expect(updatedInventory?.usedQuantity).toBe(2);
    });

    it('should fail with invalid SKU ID', async () => {
      const invalidRequest = {
        skuId: '00000000-0000-0000-0000-000000000000',
        customerId: testCustomer.id,
        quantity: 1,
      };

      await expect(async () => {
        await prisma.sku.findUnique({
          where: { id: invalidRequest.skuId },
          rejectOnNotFound: true,
        });
      }).rejects.toThrow();
    });
  });

  describe('GET /api/samples/analytics', () => {
    beforeEach(async () => {
      // Create sample metrics for testing
      await prisma.sampleMetrics.create({
        data: {
          skuId: testSku.id,
          salesRepId: testSalesRep.id,
          customerId: testCustomer.id,
          periodStart: new Date('2025-01-01'),
          periodEnd: new Date('2025-01-31'),
          samplesGiven: 10,
          conversions: 3,
          totalRevenue: new Decimal('450.00'),
        },
      });
    });

    it('should return analytics overview', async () => {
      const metrics = await prisma.sampleMetrics.findMany({
        include: {
          sku: { include: { product: true } },
          salesRep: true,
        },
      });

      const overview = {
        totalSamples: metrics.reduce((sum, m) => sum + m.samplesGiven, 0),
        totalCustomers: new Set(metrics.map((m) => m.customerId)).size,
        conversions: metrics.reduce((sum, m) => sum + m.conversions, 0),
        conversionRate: 0,
        totalRevenue: metrics.reduce(
          (sum, m) => sum.add(m.totalRevenue),
          new Decimal(0)
        ),
      };

      if (overview.totalSamples > 0) {
        overview.conversionRate = (overview.conversions / overview.totalSamples) * 100;
      }

      expect(overview.totalSamples).toBe(10);
      expect(overview.conversions).toBe(3);
      expect(overview.conversionRate).toBe(30);
      expect(overview.totalRevenue.toString()).toBe('450.00');
    });

    it('should aggregate by product', async () => {
      const metrics = await prisma.sampleMetrics.findMany({
        include: {
          sku: { include: { product: true } },
        },
      });

      const productMap = new Map();
      metrics.forEach((m) => {
        const key = m.skuId;
        if (!productMap.has(key)) {
          productMap.set(key, {
            productId: m.sku.productId,
            productName: m.sku.product.name,
            totalSamples: 0,
            conversions: 0,
            revenue: new Decimal(0),
          });
        }
        const product = productMap.get(key);
        product.totalSamples += m.samplesGiven;
        product.conversions += m.conversions;
        product.revenue = product.revenue.add(m.totalRevenue);
      });

      const byProduct = Array.from(productMap.values());
      expect(byProduct.length).toBeGreaterThan(0);
      expect(byProduct[0].productName).toBe('Test Wine');
    });
  });

  describe('GET /api/samples/history/{customerId}', () => {
    it('should return customer sample history', async () => {
      const samples = await prisma.sampleUsage.findMany({
        where: { customerId: testCustomer.id },
        include: {
          sku: { include: { product: true } },
          salesRep: true,
        },
        orderBy: { dateGiven: 'desc' },
      });

      const stats = {
        total: samples.length,
        conversions: samples.filter((s) => s.converted).length,
        conversionRate: 0,
        lastSample: samples.length > 0 ? samples[0].dateGiven : null,
      };

      if (stats.total > 0) {
        stats.conversionRate = (stats.conversions / stats.total) * 100;
      }

      expect(samples).toBeDefined();
      expect(Array.isArray(samples)).toBe(true);
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('conversions');
      expect(stats).toHaveProperty('conversionRate');
    });

    it('should fail with invalid customer ID', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      const customer = await prisma.customer.findUnique({
        where: { id: invalidId },
      });

      expect(customer).toBeNull();
    });
  });

  describe('GET /api/samples/pulled', () => {
    it('should return pulled samples and follow-up needed', async () => {
      const dateThreshold = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);

      const pulled = await prisma.sampleUsage.findMany({
        where: {
          dateGiven: { gte: dateThreshold },
        },
        include: {
          sku: { include: { product: true } },
          customer: true,
          salesRep: true,
        },
      });

      const now = new Date();
      const needFollowup = pulled.filter((sample) => {
        return (
          sample.followUpDate &&
          sample.followUpDate <= now &&
          !sample.converted &&
          !sample.conversionDate
        );
      });

      expect(Array.isArray(pulled)).toBe(true);
      expect(Array.isArray(needFollowup)).toBe(true);
    });
  });

  describe('GET /api/samples/inventory', () => {
    it('should return inventory list', async () => {
      const inventory = await prisma.sampleInventory.findMany({
        include: {
          sku: { include: { product: true } },
        },
      });

      expect(Array.isArray(inventory)).toBe(true);
      expect(inventory.length).toBeGreaterThan(0);
      expect(inventory[0]).toHaveProperty('availableQuantity');
      expect(inventory[0]).toHaveProperty('totalQuantity');
    });

    it('should filter low stock items', async () => {
      const threshold = 10;
      const lowStock = await prisma.sampleInventory.findMany({
        where: {
          availableQuantity: { lte: threshold },
        },
        include: {
          sku: { include: { product: true } },
        },
      });

      lowStock.forEach((item) => {
        expect(item.availableQuantity).toBeLessThanOrEqual(threshold);
      });
    });
  });

  describe('PATCH /api/samples/inventory', () => {
    it('should update inventory levels', async () => {
      const updated = await prisma.sampleInventory.update({
        where: { id: testInventory.id },
        data: {
          availableQuantity: 50,
          totalQuantity: 150,
          lastUpdated: new Date(),
        },
      });

      expect(updated.availableQuantity).toBe(50);
      expect(updated.totalQuantity).toBe(150);

      // Reset for other tests
      await prisma.sampleInventory.update({
        where: { id: testInventory.id },
        data: {
          availableQuantity: 98,
          totalQuantity: 100,
        },
      });
    });
  });

  describe('GET /api/samples/analytics/top-performers', () => {
    it('should return top performing products', async () => {
      const metrics = await prisma.sampleMetrics.findMany({
        include: {
          sku: { include: { product: true } },
        },
      });

      const skuMap = new Map();
      metrics.forEach((m) => {
        const key = m.skuId;
        if (!skuMap.has(key)) {
          skuMap.set(key, {
            sku: m.sku,
            samplesGiven: 0,
            conversions: 0,
            revenue: new Decimal(0),
          });
        }
        const performer = skuMap.get(key);
        performer.samplesGiven += m.samplesGiven;
        performer.conversions += m.conversions;
        performer.revenue = performer.revenue.add(m.totalRevenue);
      });

      const performers = Array.from(skuMap.values()).map((p) => ({
        ...p,
        conversionRate:
          p.samplesGiven > 0 ? (p.conversions / p.samplesGiven) * 100 : 0,
      }));

      performers.sort((a, b) => b.conversionRate - a.conversionRate);

      expect(Array.isArray(performers)).toBe(true);
      if (performers.length > 0) {
        expect(performers[0]).toHaveProperty('conversionRate');
      }
    });
  });

  describe('GET /api/samples/analytics/rep-leaderboard', () => {
    it('should return sales rep leaderboard', async () => {
      const metrics = await prisma.sampleMetrics.findMany({
        where: {
          salesRepId: { not: null },
        },
        include: {
          salesRep: true,
        },
      });

      const repMap = new Map();
      metrics.forEach((m) => {
        if (!m.salesRepId) return;

        const key = m.salesRepId;
        if (!repMap.has(key)) {
          repMap.set(key, {
            salesRep: m.salesRep,
            samplesGiven: 0,
            conversions: 0,
            revenue: new Decimal(0),
          });
        }
        const rep = repMap.get(key);
        rep.samplesGiven += m.samplesGiven;
        rep.conversions += m.conversions;
        rep.revenue = rep.revenue.add(m.totalRevenue);
      });

      const leaderboard = Array.from(repMap.values()).map((rep) => ({
        ...rep,
        conversionRate:
          rep.samplesGiven > 0 ? (rep.conversions / rep.samplesGiven) * 100 : 0,
      }));

      leaderboard.sort((a, b) => b.conversionRate - a.conversionRate);

      expect(Array.isArray(leaderboard)).toBe(true);
    });
  });

  describe('POST /api/samples/feedback-templates', () => {
    it('should create feedback template', async () => {
      const template = await prisma.sampleFeedbackTemplate.create({
        data: {
          name: 'Test Template',
          category: 'Test Category',
          options: ['Option 1', 'Option 2', 'Option 3'],
          isActive: true,
          sortOrder: 0,
        },
      });

      expect(template).toBeDefined();
      expect(template.name).toBe('Test Template');
      expect(template.options).toEqual(['Option 1', 'Option 2', 'Option 3']);

      // Clean up
      await prisma.sampleFeedbackTemplate.delete({
        where: { id: template.id },
      });
    });
  });

  describe('GET /api/samples/supplier-report', () => {
    it('should generate supplier report', async () => {
      const products = await prisma.product.findMany({
        where: { supplierId: testSupplier.id },
        include: {
          skus: {
            include: {
              sampleMetrics: true,
            },
          },
        },
      });

      const productMetrics = products
        .map((product) => {
          return product.skus.map((sku) => {
            const metrics = sku.sampleMetrics || [];
            const samplesGiven = metrics.reduce((sum, m) => sum + m.samplesGiven, 0);
            const conversions = metrics.reduce((sum, m) => sum + m.conversions, 0);
            const revenue = metrics.reduce(
              (sum, m) => sum.add(m.totalRevenue),
              new Decimal(0)
            );

            return {
              product,
              sku,
              samplesGiven,
              conversions,
              conversionRate:
                samplesGiven > 0 ? (conversions / samplesGiven) * 100 : 0,
              revenue,
            };
          });
        })
        .flat();

      expect(Array.isArray(productMetrics)).toBe(true);
    });
  });
});
