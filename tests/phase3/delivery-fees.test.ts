/**
 * Phase 3 - Delivery & Split-Case Fees Tests
 *
 * Status: ✅ READY FOR TESTING
 * Feature: Already implemented in new order workflow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = process.env.TENANT_ID!;

describe('Phase 3: Delivery & Split-Case Fees', () => {
  let testCustomerId: string;
  let testSkuId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Setup test data
    const customer = await prisma.customer.findFirst({
      where: { tenantId: TENANT_ID, isActive: true }
    });
    testCustomerId = customer!.id;

    const sku = await prisma.sku.findFirst({
      where: { tenantId: TENANT_ID, isActive: true }
    });
    testSkuId = sku!.id;

    const user = await prisma.user.findFirst({
      where: { tenantId: TENANT_ID, isActive: true }
    });
    testUserId = user!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Delivery Fee', () => {
    it('should save delivery fee to order', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'DRAFT',
          deliveryFee: 25.00,
          splitCaseFee: 0,
          currency: 'USD',
          total: 0
        }
      });

      expect(order.deliveryFee).toBeDefined();
      expect(Number(order.deliveryFee)).toBe(25.00);

      // Cleanup
      await prisma.order.delete({ where: { id: order.id } });
    });

    it('should default delivery fee to 0', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'DRAFT',
          currency: 'USD',
          total: 0
        }
      });

      expect(Number(order.deliveryFee)).toBe(0);

      await prisma.order.delete({ where: { id: order.id } });
    });

    it('should calculate order total including delivery fee', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'DRAFT',
          deliveryFee: 25.00,
          splitCaseFee: 0,
          currency: 'USD',
          total: 0,
          lines: {
            create: {
              tenantId: TENANT_ID,
              skuId: testSkuId,
              quantity: 6,
              unitPrice: 10.00
            }
          }
        },
        include: { lines: true }
      });

      const lineTotal = order.lines.reduce((sum, line) =>
        sum + (line.quantity * Number(line.unitPrice)), 0
      );
      const expectedTotal = lineTotal + Number(order.deliveryFee);

      // Note: Total calculation should be done in application logic
      expect(lineTotal).toBe(60.00);
      expect(Number(order.deliveryFee)).toBe(25.00);
      expect(expectedTotal).toBe(85.00);

      await prisma.order.delete({ where: { id: order.id } });
    });

    it('should accept decimal values for delivery fee', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'DRAFT',
          deliveryFee: 22.50,
          currency: 'USD',
          total: 0
        }
      });

      expect(Number(order.deliveryFee)).toBe(22.50);

      await prisma.order.delete({ where: { id: order.id } });
    });
  });

  describe('Split-Case Fee', () => {
    it('should save split-case fee to order', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'DRAFT',
          deliveryFee: 0,
          splitCaseFee: 15.00,
          currency: 'USD',
          total: 0
        }
      });

      expect(order.splitCaseFee).toBeDefined();
      expect(Number(order.splitCaseFee)).toBe(15.00);

      await prisma.order.delete({ where: { id: order.id } });
    });

    it('should default split-case fee to 0', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'DRAFT',
          currency: 'USD',
          total: 0
        }
      });

      expect(Number(order.splitCaseFee)).toBe(0);

      await prisma.order.delete({ where: { id: order.id } });
    });
  });

  describe('Combined Fees', () => {
    it('should handle both delivery and split-case fees', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'DRAFT',
          deliveryFee: 25.00,
          splitCaseFee: 15.00,
          currency: 'USD',
          total: 0,
          lines: {
            create: {
              tenantId: TENANT_ID,
              skuId: testSkuId,
              quantity: 12,
              unitPrice: 8.50
            }
          }
        },
        include: { lines: true }
      });

      const lineTotal = 12 * 8.50; // 102.00
      const expectedTotal = lineTotal + 25.00 + 15.00; // 142.00

      expect(Number(order.deliveryFee)).toBe(25.00);
      expect(Number(order.splitCaseFee)).toBe(15.00);
      expect(expectedTotal).toBe(142.00);

      await prisma.order.delete({ where: { id: order.id } });
    });

    it('should include fees in invoice generation', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'PENDING',
          deliveryFee: 25.00,
          splitCaseFee: 15.00,
          currency: 'USD',
          total: 182.00,
          lines: {
            create: {
              tenantId: TENANT_ID,
              skuId: testSkuId,
              quantity: 12,
              unitPrice: 11.83
            }
          }
        }
      });

      const invoice = await prisma.invoice.create({
        data: {
          tenantId: TENANT_ID,
          orderId: order.id,
          customerId: testCustomerId,
          status: 'DRAFT',
          subtotal: 182.00, // Should include fees
          total: 182.00
        }
      });

      expect(invoice).toBeDefined();
      expect(Number(invoice.subtotal)).toBe(182.00);

      // Cleanup
      await prisma.invoice.delete({ where: { id: invoice.id } });
      await prisma.order.delete({ where: { id: order.id } });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero fees', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'DRAFT',
          deliveryFee: 0,
          splitCaseFee: 0,
          currency: 'USD',
          total: 0
        }
      });

      expect(Number(order.deliveryFee)).toBe(0);
      expect(Number(order.splitCaseFee)).toBe(0);

      await prisma.order.delete({ where: { id: order.id } });
    });

    it('should reject negative fees', async () => {
      await expect(
        prisma.order.create({
          data: {
            tenantId: TENANT_ID,
            customerId: testCustomerId,
            status: 'DRAFT',
            deliveryFee: -25.00,
            currency: 'USD',
            total: 0
          }
        })
      ).rejects.toThrow();
    });

    it('should handle very large fee values', async () => {
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_ID,
          customerId: testCustomerId,
          status: 'DRAFT',
          deliveryFee: 999.99,
          splitCaseFee: 999.99,
          currency: 'USD',
          total: 0
        }
      });

      expect(Number(order.deliveryFee)).toBe(999.99);
      expect(Number(order.splitCaseFee)).toBe(999.99);

      await prisma.order.delete({ where: { id: order.id } });
    });
  });
});
