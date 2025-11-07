/**
 * Sprint 1: Revenue & Compliance Features - Test Suite
 *
 * Tests for:
 * 1. Optional Fees (Delivery & Split-Case)
 * 2. Taxes disabled across all orders
 * 3. Price Override (schema validation)
 */

import { describe, it, expect } from '@jest/globals';
import { calcOrderTotal } from '../src/lib/money/totals';
import Decimal from 'decimal.js';

describe('Sprint 1: Revenue & Compliance Features', () => {
  const sampleLines = [
    { quantity: 12, unitPrice: '25.00' },
    { quantity: 6, unitPrice: '18.50' },
  ];

  describe('Feature 1: Optional Fees', () => {
    it('should calculate order total with delivery fee only', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        deliveryFee: 10.0,
      });

      expect(result.subtotal).toBe('411.00');
      expect(result.deliveryFee).toBe('10.00');
      expect(result.splitCaseFee).toBe('0.00');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('421.00');
    });

    it('should calculate order total with split-case fee only', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        splitCaseFee: 5.0,
      });

      expect(result.subtotal).toBe('411.00');
      expect(result.deliveryFee).toBe('0.00');
      expect(result.splitCaseFee).toBe('5.00');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('416.00');
    });

    it('should calculate order total with both fees', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        deliveryFee: 10.0,
        splitCaseFee: 5.0,
      });

      expect(result.subtotal).toBe('411.00');
      expect(result.deliveryFee).toBe('10.00');
      expect(result.splitCaseFee).toBe('5.00');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('426.00');
    });

    it('should default fees to zero when not provided', () => {
      const result = calcOrderTotal({ lines: sampleLines });

      expect(result.deliveryFee).toBe('0.00');
      expect(result.splitCaseFee).toBe('0.00');
      expect(result.total).toBe('411.00');
    });

    it('should handle decimal fee amounts correctly', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        deliveryFee: 12.75,
        splitCaseFee: 3.25,
      });

      expect(result.deliveryFee).toBe('12.75');
      expect(result.splitCaseFee).toBe('3.25');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('427.00');
    });
  });

  describe('Feature 2: Taxes are disabled', () => {
    it('always returns zero tax values', () => {
      const result = calcOrderTotal({ lines: sampleLines });

      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
    });

    it('keeps taxes at zero even with optional fees', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        deliveryFee: 10,
        splitCaseFee: 5,
      });

      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('426.00');
    });
  });

  describe('Feature 3: Price Override (schema validation)', () => {
    it('should support price override fields in OrderLine type', () => {
      const mockOrderLine = {
        id: 'test-id',
        tenantId: 'test-tenant',
        orderId: 'test-order',
        skuId: 'test-sku',
        quantity: 12,
        unitPrice: new Decimal('25.00'),
        priceOverridden: true,
        overridePrice: new Decimal('20.00'),
        overrideReason: 'Volume discount negotiation',
        overriddenBy: 'manager@example.com',
        overriddenAt: new Date('2025-11-06T15:00:00Z'),
      };

      expect(mockOrderLine.priceOverridden).toBe(true);
      expect(mockOrderLine.overridePrice?.toString()).toBe('20');
      expect(mockOrderLine.overrideReason).toBe('Volume discount negotiation');
      expect(mockOrderLine.overriddenBy).toBe('manager@example.com');
      expect(mockOrderLine.overriddenAt).toBeInstanceOf(Date);
    });

    it('should calculate correct total when price is overridden', () => {
      const linesWithOverride = [
        { quantity: 12, unitPrice: '20.00' },
        { quantity: 6, unitPrice: '18.50' },
      ];

      const result = calcOrderTotal({
        lines: linesWithOverride,
      });

      expect(result.subtotal).toBe('351.00');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('351.00');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-value orders', () => {
      const result = calcOrderTotal({ lines: [] });

      expect(result.subtotal).toBe('0.00');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('0.00');
    });

    it('should handle very large fee amounts', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        deliveryFee: 999.99,
        splitCaseFee: 500.0,
      });

      expect(result.deliveryFee).toBe('999.99');
      expect(result.splitCaseFee).toBe('500.00');
      expect(result.total).toBe('1910.99'); // 411 + 999.99 + 500
    });

    it("should use banker's rounding for currency calculations", () => {
      const lines = [{ quantity: 1, unitPrice: '10.125' }];

      const result = calcOrderTotal({
        lines,
        deliveryFee: 5.125,
      });

      expect(result.subtotal).toBe('10.12');
      expect(result.deliveryFee).toBe('5.12');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete real-world order with all features', () => {
      const result = calcOrderTotal({
        lines: [
          { quantity: 24, unitPrice: '15.99' },
          { quantity: 12, unitPrice: '22.50' },
          { quantity: 3, unitPrice: '45.00' },
        ],
        deliveryFee: 15.0,
        splitCaseFee: 7.5,
      });

      expect(result.subtotal).toBe('788.76');
      expect(result.deliveryFee).toBe('15.00');
      expect(result.splitCaseFee).toBe('7.50');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('811.26');
    });

    it('should handle high-volume orders with large delivery fees', () => {
      const result = calcOrderTotal({
        lines: [{ quantity: 48, unitPrice: '12.50' }],
        deliveryFee: 25.0,
      });

      expect(result.subtotal).toBe('600.00');
      expect(result.deliveryFee).toBe('25.00');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('625.00');
    });
  });
});
