/**
 * Tests for SAGE Export Validation System
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import {
  validateOrdersForExport,
  validateCustomer,
  validateSku,
  validateSalesRep,
  validateAmount,
  validateDate,
  formatValidationErrors,
  groupErrorsByOrder,
  groupErrorsByType,
  SageErrorType,
  type OrderToValidate,
  type ValidationError,
} from './validation';

// Mock Prisma Client
const mockPrisma = {
  customer: {
    findMany: jest.fn(),
  },
  sku: {
    findMany: jest.fn(),
  },
  salesRep: {
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

describe('SAGE Validation System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateOrdersForExport', () => {
    it('should validate valid orders successfully', async () => {
      const orders: OrderToValidate[] = [
        {
          id: 'order-1',
          customerId: 'customer-1',
          orderedAt: new Date('2025-01-01'),
          total: 100.50,
          orderLines: [
            {
              id: 'line-1',
              skuId: 'sku-1',
              quantity: 10,
              unitPrice: 10.05,
            },
          ],
        },
      ];

      mockPrisma.customer.findMany = jest.fn().mockResolvedValue([
        { id: 'customer-1', paymentTerms: 'Net 30', salesRepId: 'rep-1' },
      ]);

      mockPrisma.sku.findMany = jest.fn().mockResolvedValue([
        { id: 'sku-1', code: 'SKU-001', isActive: true },
      ]);

      mockPrisma.salesRep.findMany = jest.fn().mockResolvedValue([
        { id: 'rep-1', isActive: true, userId: 'user-1' },
      ]);

      const result = await validateOrdersForExport(orders, mockPrisma);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalOrders).toBe(1);
      expect(result.summary.validOrders).toBe(1);
      expect(result.summary.invalidOrders).toBe(0);
    });

    it('should detect missing customer', async () => {
      const orders: OrderToValidate[] = [
        {
          id: 'order-1',
          customerId: 'missing-customer',
          orderedAt: new Date('2025-01-01'),
          total: 100.00,
          orderLines: [
            {
              id: 'line-1',
              skuId: 'sku-1',
              quantity: 10,
              unitPrice: 10.00,
            },
          ],
        },
      ];

      mockPrisma.customer.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.sku.findMany = jest.fn().mockResolvedValue([
        { id: 'sku-1', code: 'SKU-001', isActive: true },
      ]);
      mockPrisma.salesRep.findMany = jest.fn().mockResolvedValue([]);

      const result = await validateOrdersForExport(orders, mockPrisma);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe(SageErrorType.CUSTOMER_NOT_FOUND);
      expect(result.errors[0].customerId).toBe('missing-customer');
    });

    it('should detect missing payment terms', async () => {
      const orders: OrderToValidate[] = [
        {
          id: 'order-1',
          customerId: 'customer-1',
          orderedAt: new Date('2025-01-01'),
          total: 100.00,
          orderLines: [
            {
              id: 'line-1',
              skuId: 'sku-1',
              quantity: 10,
              unitPrice: 10.00,
            },
          ],
        },
      ];

      mockPrisma.customer.findMany = jest.fn().mockResolvedValue([
        { id: 'customer-1', paymentTerms: null, salesRepId: null },
      ]);
      mockPrisma.sku.findMany = jest.fn().mockResolvedValue([
        { id: 'sku-1', code: 'SKU-001', isActive: true },
      ]);
      mockPrisma.salesRep.findMany = jest.fn().mockResolvedValue([]);

      const result = await validateOrdersForExport(orders, mockPrisma);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === SageErrorType.CUSTOMER_MISSING_PAYMENT_TERMS)).toBe(true);
    });

    it('should detect inactive SKU', async () => {
      const orders: OrderToValidate[] = [
        {
          id: 'order-1',
          customerId: 'customer-1',
          orderedAt: new Date('2025-01-01'),
          total: 100.00,
          orderLines: [
            {
              id: 'line-1',
              skuId: 'sku-1',
              quantity: 10,
              unitPrice: 10.00,
            },
          ],
        },
      ];

      mockPrisma.customer.findMany = jest.fn().mockResolvedValue([
        { id: 'customer-1', paymentTerms: 'Net 30', salesRepId: null },
      ]);
      mockPrisma.sku.findMany = jest.fn().mockResolvedValue([
        { id: 'sku-1', code: 'SKU-001', isActive: false },
      ]);
      mockPrisma.salesRep.findMany = jest.fn().mockResolvedValue([]);

      const result = await validateOrdersForExport(orders, mockPrisma);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === SageErrorType.SKU_INACTIVE)).toBe(true);
    });

    it('should warn about inactive sales rep but not block export', async () => {
      const orders: OrderToValidate[] = [
        {
          id: 'order-1',
          customerId: 'customer-1',
          orderedAt: new Date('2025-01-01'),
          total: 100.00,
          orderLines: [
            {
              id: 'line-1',
              skuId: 'sku-1',
              quantity: 10,
              unitPrice: 10.00,
            },
          ],
        },
      ];

      mockPrisma.customer.findMany = jest.fn().mockResolvedValue([
        { id: 'customer-1', paymentTerms: 'Net 30', salesRepId: 'rep-1' },
      ]);
      mockPrisma.sku.findMany = jest.fn().mockResolvedValue([
        { id: 'sku-1', code: 'SKU-001', isActive: true },
      ]);
      mockPrisma.salesRep.findMany = jest.fn().mockResolvedValue([
        { id: 'rep-1', isActive: false, userId: 'user-1' },
      ]);

      const result = await validateOrdersForExport(orders, mockPrisma);

      expect(result.isValid).toBe(true); // Warnings don't block
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe(SageErrorType.SALES_REP_INACTIVE);
      expect(result.warnings[0].isWarning).toBe(true);
    });

    it('should validate multiple orders efficiently with batch queries', async () => {
      const orders: OrderToValidate[] = [
        {
          id: 'order-1',
          customerId: 'customer-1',
          orderedAt: new Date('2025-01-01'),
          total: 100.00,
          orderLines: [
            { id: 'line-1', skuId: 'sku-1', quantity: 10, unitPrice: 10.00 },
          ],
        },
        {
          id: 'order-2',
          customerId: 'customer-2',
          orderedAt: new Date('2025-01-02'),
          total: 200.00,
          orderLines: [
            { id: 'line-2', skuId: 'sku-2', quantity: 20, unitPrice: 10.00 },
          ],
        },
      ];

      mockPrisma.customer.findMany = jest.fn().mockResolvedValue([
        { id: 'customer-1', paymentTerms: 'Net 30', salesRepId: null },
        { id: 'customer-2', paymentTerms: 'Net 60', salesRepId: null },
      ]);
      mockPrisma.sku.findMany = jest.fn().mockResolvedValue([
        { id: 'sku-1', code: 'SKU-001', isActive: true },
        { id: 'sku-2', code: 'SKU-002', isActive: true },
      ]);
      mockPrisma.salesRep.findMany = jest.fn().mockResolvedValue([]);

      const result = await validateOrdersForExport(orders, mockPrisma);

      // Should only make one call per entity type (batch queries)
      expect(mockPrisma.customer.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.sku.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.salesRep.findMany).toHaveBeenCalledTimes(1);

      expect(result.isValid).toBe(true);
      expect(result.summary.totalOrders).toBe(2);
    });

    it('should detect empty order lines', async () => {
      const orders: OrderToValidate[] = [
        {
          id: 'order-1',
          customerId: 'customer-1',
          orderedAt: new Date('2025-01-01'),
          total: 100.00,
          orderLines: [],
        },
      ];

      mockPrisma.customer.findMany = jest.fn().mockResolvedValue([
        { id: 'customer-1', paymentTerms: 'Net 30', salesRepId: null },
      ]);
      mockPrisma.sku.findMany = jest.fn().mockResolvedValue([]);
      mockPrisma.salesRep.findMany = jest.fn().mockResolvedValue([]);

      const result = await validateOrdersForExport(orders, mockPrisma);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === SageErrorType.EMPTY_ORDER_LINES)).toBe(true);
    });

    it('should allow negative amounts (for returns/credits)', async () => {
      const orders: OrderToValidate[] = [
        {
          id: 'order-1',
          customerId: 'customer-1',
          orderedAt: new Date('2025-01-01'),
          total: -50.00, // Negative total (credit)
          orderLines: [
            {
              id: 'line-1',
              skuId: 'sku-1',
              quantity: 5,
              unitPrice: -10.00, // Negative price (return)
            },
          ],
        },
      ];

      mockPrisma.customer.findMany = jest.fn().mockResolvedValue([
        { id: 'customer-1', paymentTerms: 'Net 30', salesRepId: null },
      ]);
      mockPrisma.sku.findMany = jest.fn().mockResolvedValue([
        { id: 'sku-1', code: 'SKU-001', isActive: true },
      ]);
      mockPrisma.salesRep.findMany = jest.fn().mockResolvedValue([]);

      const result = await validateOrdersForExport(orders, mockPrisma);

      expect(result.isValid).toBe(true); // Negative amounts are valid
    });
  });

  describe('validateAmount', () => {
    it('should accept valid positive amounts', () => {
      const errors: ValidationError[] = [];
      validateAmount('order-1', 'total', 100.50, errors);
      expect(errors).toHaveLength(0);
    });

    it('should accept negative amounts', () => {
      const errors: ValidationError[] = [];
      validateAmount('order-1', 'total', -50.00, errors);
      expect(errors).toHaveLength(0);
    });

    it('should accept zero', () => {
      const errors: ValidationError[] = [];
      validateAmount('order-1', 'total', 0, errors);
      expect(errors).toHaveLength(0);
    });

    it('should reject null amounts', () => {
      const errors: ValidationError[] = [];
      validateAmount('order-1', 'total', null, errors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(SageErrorType.INVALID_AMOUNT);
    });

    it('should reject NaN', () => {
      const errors: ValidationError[] = [];
      validateAmount('order-1', 'total', NaN, errors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(SageErrorType.INVALID_AMOUNT);
    });
  });

  describe('validateDate', () => {
    it('should accept valid dates', () => {
      const errors: ValidationError[] = [];
      validateDate('order-1', 'orderedAt', new Date('2025-01-01'), errors, true);
      expect(errors).toHaveLength(0);
    });

    it('should reject null dates when required', () => {
      const errors: ValidationError[] = [];
      validateDate('order-1', 'orderedAt', null, errors, true);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(SageErrorType.INVALID_DATE);
    });

    it('should accept null dates when not required', () => {
      const errors: ValidationError[] = [];
      validateDate('order-1', 'deliveredAt', null, errors, false);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid dates', () => {
      const errors: ValidationError[] = [];
      validateDate('order-1', 'orderedAt', new Date('invalid'), errors, true);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe(SageErrorType.INVALID_DATE);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation results nicely', () => {
      const result = {
        isValid: false,
        errors: [
          {
            type: SageErrorType.CUSTOMER_NOT_FOUND,
            message: 'Customer not found: customer-1',
            orderId: 'order-1',
            customerId: 'customer-1',
          },
        ],
        warnings: [
          {
            type: SageErrorType.SALES_REP_INACTIVE,
            message: 'Sales rep rep-1 is inactive',
            orderId: 'order-1',
            salesRepId: 'rep-1',
            isWarning: true,
          },
        ],
        summary: {
          totalOrders: 1,
          validOrders: 0,
          invalidOrders: 1,
          totalErrors: 1,
          totalWarnings: 1,
          errorsByType: {
            [SageErrorType.CUSTOMER_NOT_FOUND]: 1,
          },
        },
      };

      const formatted = formatValidationErrors(result);

      expect(formatted).toContain('Total Orders: 1');
      expect(formatted).toContain('Valid Orders: 0');
      expect(formatted).toContain('Invalid Orders: 1');
      expect(formatted).toContain('CUSTOMER_NOT_FOUND');
      expect(formatted).toContain('SALES_REP_INACTIVE');
    });
  });

  describe('groupErrorsByOrder', () => {
    it('should group errors by order ID', () => {
      const errors: ValidationError[] = [
        {
          type: SageErrorType.CUSTOMER_NOT_FOUND,
          message: 'Error 1',
          orderId: 'order-1',
        },
        {
          type: SageErrorType.SKU_NOT_FOUND,
          message: 'Error 2',
          orderId: 'order-1',
        },
        {
          type: SageErrorType.INVALID_AMOUNT,
          message: 'Error 3',
          orderId: 'order-2',
        },
      ];

      const grouped = groupErrorsByOrder(errors);

      expect(grouped.size).toBe(2);
      expect(grouped.get('order-1')).toHaveLength(2);
      expect(grouped.get('order-2')).toHaveLength(1);
    });
  });

  describe('groupErrorsByType', () => {
    it('should group errors by type', () => {
      const errors: ValidationError[] = [
        {
          type: SageErrorType.CUSTOMER_NOT_FOUND,
          message: 'Error 1',
          orderId: 'order-1',
        },
        {
          type: SageErrorType.CUSTOMER_NOT_FOUND,
          message: 'Error 2',
          orderId: 'order-2',
        },
        {
          type: SageErrorType.SKU_NOT_FOUND,
          message: 'Error 3',
          orderId: 'order-3',
        },
      ];

      const grouped = groupErrorsByType(errors);

      expect(grouped.size).toBe(2);
      expect(grouped.get(SageErrorType.CUSTOMER_NOT_FOUND)).toHaveLength(2);
      expect(grouped.get(SageErrorType.SKU_NOT_FOUND)).toHaveLength(1);
    });
  });
});
