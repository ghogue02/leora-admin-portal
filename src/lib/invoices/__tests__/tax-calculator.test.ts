/**
 * Tax Calculator Tests
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import {
  calculateVAExciseTax,
  calculateSalesTax,
  VA_TAX_RATES,
} from '@/lib/invoices/tax-calculator';

describe('Tax Calculator', () => {
  describe('calculateVAExciseTax', () => {
    it('should calculate VA wine excise tax at $0.40/liter', () => {
      const tax = calculateVAExciseTax(100, true);
      expect(tax.toNumber()).toBe(40.0); // 100 liters × $0.40
    });

    it('should return zero for out-of-state sales', () => {
      const tax = calculateVAExciseTax(100, false);
      expect(tax.toNumber()).toBe(0);
    });

    it('should handle Decimal input', () => {
      const tax = calculateVAExciseTax(new Decimal('858.000'), true);
      expect(tax.toNumber()).toBe(343.2); // 858 × $0.40
    });

    it('should match Total Wine invoice scenario', () => {
      // Total Wine invoice: 18.000 liters
      const tax = calculateVAExciseTax(18.0, true);
      expect(tax.toNumber()).toBe(7.2); // 18 × $0.40
    });

    it('should match Cask & Cork invoice scenario (tax-exempt)', () => {
      // Cask & Cork invoice: 858.000 liters, but tax-exempt
      const tax = calculateVAExciseTax(858.0, false);
      expect(tax.toNumber()).toBe(0); // Tax-exempt = $0
    });
  });

  describe('calculateSalesTax', () => {
    it('should calculate VA sales tax at 5.3%', () => {
      const tax = calculateSalesTax(100, VA_TAX_RATES.SALES_TAX_RATE);
      expect(tax.toNumber()).toBe(5.3);
    });

    it('should use default VA rate when not specified', () => {
      const tax = calculateSalesTax(100);
      expect(tax.toNumber()).toBe(5.3);
    });

    it('should handle Decimal input', () => {
      const tax = calculateSalesTax(new Decimal('256.08'));
      expect(tax.toNumber()).toBeCloseTo(13.57, 2);
    });

    it('should calculate custom tax rates', () => {
      const tax = calculateSalesTax(100, 0.06); // 6% tax
      expect(tax.toNumber()).toBe(6.0);
    });
  });

  describe('VA_TAX_RATES constants', () => {
    it('should have correct wine excise tax rate', () => {
      expect(VA_TAX_RATES.WINE_EXCISE.toNumber()).toBe(0.40);
    });

    it('should have correct sales tax rate', () => {
      expect(VA_TAX_RATES.SALES_TAX_RATE.toNumber()).toBe(0.053);
    });
  });
});
