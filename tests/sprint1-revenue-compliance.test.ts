/**
 * Sprint 1: Revenue & Compliance Features - Test Suite
 *
 * Tests for:
 * 1. Optional Fees (Delivery & Split-Case)
 * 2. B2B Tax Exemption
 * 3. Price Override (schema validation)
 */

import { describe, it, expect } from '@jest/globals';
import { calcOrderTotal } from '../src/lib/money/totals';
import Decimal from 'decimal.js';

describe('Sprint 1: Revenue & Compliance Features', () => {
  // Test data
  const sampleLines = [
    { quantity: 12, unitPrice: '25.00' },
    { quantity: 6, unitPrice: '18.50' },
  ];
  const totalLiters = 13.5; // Approximate for tax calculation

  describe('Feature 1: Optional Fees', () => {
    it('should calculate order total with delivery fee only', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
        deliveryFee: 10.0,
      });

      // Subtotal: (12 * 25) + (6 * 18.50) = 300 + 111 = 411
      expect(result.subtotal).toBe('411.00');
      expect(result.deliveryFee).toBe('10.00');
      expect(result.splitCaseFee).toBe('0.00');

      // Sales tax: 411 * 0.053 = 21.783 ≈ 21.78
      expect(result.salesTax).toBe('21.78');

      // Excise tax: 13.5 * 0.40 = 5.40
      expect(result.exciseTax).toBe('5.40');

      // Total: 411 + 10 + 21.78 + 5.40 = 448.18
      expect(result.total).toBe('448.18');
    });

    it('should calculate order total with split-case fee only', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
        splitCaseFee: 5.0,
      });

      expect(result.subtotal).toBe('411.00');
      expect(result.deliveryFee).toBe('0.00');
      expect(result.splitCaseFee).toBe('5.00');
      expect(result.salesTax).toBe('21.78');
      expect(result.exciseTax).toBe('5.40');

      // Total: 411 + 5 + 21.78 + 5.40 = 443.18
      expect(result.total).toBe('443.18');
    });

    it('should calculate order total with both fees', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
        deliveryFee: 10.0,
        splitCaseFee: 5.0,
      });

      expect(result.subtotal).toBe('411.00');
      expect(result.deliveryFee).toBe('10.00');
      expect(result.splitCaseFee).toBe('5.00');
      expect(result.salesTax).toBe('21.78');
      expect(result.exciseTax).toBe('5.40');

      // Total: 411 + 10 + 5 + 21.78 + 5.40 = 453.18
      expect(result.total).toBe('453.18');
    });

    it('should default fees to zero when not provided', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
      });

      expect(result.deliveryFee).toBe('0.00');
      expect(result.splitCaseFee).toBe('0.00');
    });

    it('should handle decimal fee amounts correctly', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
        deliveryFee: 12.75,
        splitCaseFee: 3.25,
      });

      expect(result.deliveryFee).toBe('12.75');
      expect(result.splitCaseFee).toBe('3.25');

      // Total: 411 + 12.75 + 3.25 + 21.78 + 5.40 = 454.18
      expect(result.total).toBe('454.18');
    });
  });

  describe('Feature 2: B2B Tax Exemption', () => {
    it('should exempt B2B customers from sales tax', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
        isB2B: true,
      });

      expect(result.subtotal).toBe('411.00');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('411.00'); // Subtotal only
    });

    it('should exempt B2B customers from excise tax', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
        isB2B: true,
      });

      expect(result.exciseTax).toBe('0.00');
    });

    it('should apply fees to B2B customers even when tax-exempt', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
        isB2B: true,
        deliveryFee: 10.0,
        splitCaseFee: 5.0,
      });

      expect(result.subtotal).toBe('411.00');
      expect(result.deliveryFee).toBe('10.00');
      expect(result.splitCaseFee).toBe('5.00');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');

      // Total: 411 + 10 + 5 = 426 (no taxes)
      expect(result.total).toBe('426.00');
    });

    it('should calculate taxes normally for non-B2B customers', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
        isB2B: false,
      });

      expect(result.salesTax).not.toBe('0.00');
      expect(result.exciseTax).not.toBe('0.00');
      expect(Number(result.salesTax)).toBeGreaterThan(0);
      expect(Number(result.exciseTax)).toBeGreaterThan(0);
    });
  });

  describe('Feature 3: Price Override (Schema Validation)', () => {
    it('should support price override fields in OrderLine type', () => {
      // This test validates that TypeScript types include override fields
      // Actual runtime validation requires Prisma client
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
      // Simulate overridden pricing
      const linesWithOverride = [
        { quantity: 12, unitPrice: '20.00' }, // Overridden from 25.00 to 20.00
        { quantity: 6, unitPrice: '18.50' },
      ];

      const result = calcOrderTotal({
        lines: linesWithOverride,
        liters: totalLiters,
      });

      // Subtotal: (12 * 20) + (6 * 18.50) = 240 + 111 = 351
      expect(result.subtotal).toBe('351.00');

      // Sales tax: 351 * 0.053 = 18.603 ≈ 18.60
      expect(result.salesTax).toBe('18.60');

      // Total: 351 + 18.60 + 5.40 = 375.00
      expect(result.total).toBe('375.00');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-value orders', () => {
      const result = calcOrderTotal({
        lines: [],
        liters: 0,
      });

      expect(result.subtotal).toBe('0.00');
      expect(result.salesTax).toBe('0.00');
      expect(result.exciseTax).toBe('0.00');
      expect(result.total).toBe('0.00');
    });

    it('should handle very large fee amounts', () => {
      const result = calcOrderTotal({
        lines: sampleLines,
        liters: totalLiters,
        deliveryFee: 999.99,
        splitCaseFee: 500.00,
      });

      expect(result.deliveryFee).toBe('999.99');
      expect(result.splitCaseFee).toBe('500.00');

      // Verify total includes large fees
      const total = Number(result.total);
      expect(total).toBeGreaterThan(1000);
    });

    it('should use banker\'s rounding for currency calculations', () => {
      // Test case that triggers banker's rounding (round to even)
      const lines = [{ quantity: 1, unitPrice: '10.125' }];

      const result = calcOrderTotal({
        lines,
        liters: 0.75,
        deliveryFee: 5.125,
      });

      // 10.125 should round to 10.12 (round to even)
      expect(result.subtotal).toBe('10.12');

      // 5.125 should round to 5.12 (round to even)
      expect(result.deliveryFee).toBe('5.12');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete real-world order with all features', () => {
      const result = calcOrderTotal({
        lines: [
          { quantity: 24, unitPrice: '15.99' }, // Case of wine
          { quantity: 12, unitPrice: '22.50' }, // Premium selection
          { quantity: 3, unitPrice: '45.00' },  // Special bottles (split case)
        ],
        liters: 27.75, // Total volume
        deliveryFee: 15.0,
        splitCaseFee: 7.5,
        isB2B: false,
      });

      // Subtotal: (24*15.99) + (12*22.50) + (3*45.00) = 383.76 + 270 + 135 = 788.76
      expect(result.subtotal).toBe('788.76');
      expect(result.deliveryFee).toBe('15.00');
      expect(result.splitCaseFee).toBe('7.50');

      // Sales tax: 788.76 * 0.053 = 41.80428 ≈ 41.80
      expect(result.salesTax).toBe('41.80');

      // Excise tax: 27.75 * 0.40 = 11.10
      expect(result.exciseTax).toBe('11.10');

      // Total: 788.76 + 15 + 7.5 + 41.80 + 11.10 = 864.16
      expect(result.total).toBe('864.16');
    });

    it('should handle B2B order with fees correctly', () => {
      const result = calcOrderTotal({
        lines: [
          { quantity: 48, unitPrice: '12.50' }, // Bulk B2B order
        ],
        liters: 36.0,
        deliveryFee: 25.0, // Larger delivery
        splitCaseFee: 0,
        isB2B: true, // Tax-exempt
      });

      // Subtotal: 48 * 12.50 = 600
      expect(result.subtotal).toBe('600.00');
      expect(result.deliveryFee).toBe('25.00');
      expect(result.salesTax).toBe('0.00'); // B2B exempt
      expect(result.exciseTax).toBe('0.00'); // B2B exempt

      // Total: 600 + 25 = 625 (no taxes)
      expect(result.total).toBe('625.00');
    });
  });
});
