/**
 * Case/Bottle Converter Tests
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import {
  bottlesToCases,
  casesToBottles,
  formatCasesForInvoice,
  calculateCasesAndBottles,
  getDisplayFormat,
} from '@/lib/invoices/case-converter';

describe('Case/Bottle Converter', () => {
  describe('bottlesToCases', () => {
    it('should convert bottles to full cases', () => {
      const cases = bottlesToCases(24, 12);
      expect(cases.toNumber()).toBe(2.0);
    });

    it('should handle fractional cases', () => {
      const cases = bottlesToCases(106, 12);
      expect(cases.toNumber()).toBeCloseTo(8.83, 2); // From Cask & Cork invoice
    });

    it('should use default 12 bottles per case when null', () => {
      const cases = bottlesToCases(24, null);
      expect(cases.toNumber()).toBe(2.0);
    });

    it('should handle edge case of 0 bottles', () => {
      const cases = bottlesToCases(0, 12);
      expect(cases.toNumber()).toBe(0);
    });

    it('should match invoice examples', () => {
      // From Cask & Cork: 7 cases = 84 bottles
      expect(bottlesToCases(84, 12).toNumber()).toBe(7.0);

      // From Cask & Cork: 15 cases = 180 bottles
      expect(bottlesToCases(180, 12).toNumber()).toBe(15.0);

      // From Cask & Cork: 8.83 cases = 106 bottles (fractional)
      expect(bottlesToCases(106, 12).toNumber()).toBeCloseTo(8.83, 2);
    });
  });

  describe('casesToBottles', () => {
    it('should convert full cases to bottles', () => {
      const bottles = casesToBottles(5, 12);
      expect(bottles).toBe(60);
    });

    it('should handle fractional cases', () => {
      const bottles = casesToBottles(new Decimal('8.83'), 12);
      expect(bottles).toBeCloseTo(105.96, 0); // Rounds to 106
    });

    it('should use default bottles per case', () => {
      const bottles = casesToBottles(2, null);
      expect(bottles).toBe(24);
    });
  });

  describe('formatCasesForInvoice', () => {
    it('should format to 2 decimal places', () => {
      expect(formatCasesForInvoice(new Decimal('8.83'))).toBe('8.83');
      expect(formatCasesForInvoice(new Decimal('15.00'))).toBe('15.00');
    });

    it('should handle null values', () => {
      expect(formatCasesForInvoice(null)).toBe('0.00');
    });

    it('should format whole numbers correctly', () => {
      expect(formatCasesForInvoice(7)).toBe('7.00');
    });
  });

  describe('calculateCasesAndBottles', () => {
    it('should calculate both cases and bottles', () => {
      const result = calculateCasesAndBottles(106, 12);

      expect(result.bottles).toBe(106);
      expect(result.cases.toNumber()).toBeCloseTo(8.83, 2);
      expect(result.fullCases).toBe(8);
      expect(result.partialBottles).toBe(10); // 106 - (8 × 12)
    });

    it('should handle exact full cases', () => {
      const result = calculateCasesAndBottles(84, 12);

      expect(result.bottles).toBe(84);
      expect(result.cases.toNumber()).toBe(7.0);
      expect(result.fullCases).toBe(7);
      expect(result.partialBottles).toBe(0);
    });
  });

  describe('getDisplayFormat', () => {
    it('should show both for full cases', () => {
      const format = getDisplayFormat(84, 12);

      expect(format.showCases).toBe(true);
      expect(format.showBottles).toBe(true);
      expect(format.cases.toNumber()).toBe(7.0);
      expect(format.bottles).toBe(84);
    });

    it('should show both for fractional cases', () => {
      const format = getDisplayFormat(106, 12);

      expect(format.showCases).toBe(true);
      expect(format.showBottles).toBe(true);
      expect(format.cases.toNumber()).toBeCloseTo(8.83, 2);
    });

    it('should show bottles only for less than 1 case', () => {
      const format = getDisplayFormat(6, 12);

      expect(format.showCases).toBe(false);
      expect(format.showBottles).toBe(true);
      expect(format.bottles).toBe(6);
    });
  });
});
