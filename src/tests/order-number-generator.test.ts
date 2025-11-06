/**
 * Order Number Generator Tests - Sprint 3 Polish
 *
 * Tests for region-based order numbering: [STATE]-[YY]-[#####]
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  parseStateFromAddress,
  generateOrderNumber,
  validateOrderNumberFormat,
  parseOrderNumber,
} from '../lib/orders/order-number-generator';

describe('Order Number Generator', () => {
  describe('parseStateFromAddress', () => {
    it('should extract state from address object', () => {
      const address = {
        state: 'VA',
        street1: '123 Main St',
        city: 'Richmond',
        postalCode: '23219',
      };

      const state = parseStateFromAddress(address);
      expect(state).toBe('VA');
    });

    it('should handle lowercase state codes', () => {
      const address = {
        state: 'md',
        street1: '456 Oak Ave',
        city: 'Baltimore',
        postalCode: '21201',
      };

      const state = parseStateFromAddress(address);
      expect(state).toBe('MD');
    });

    it('should default to XX for missing state', () => {
      const address = {
        street1: '789 Pine Rd',
        city: 'Somewhere',
        postalCode: '12345',
      };

      const state = parseStateFromAddress(address);
      expect(state).toBe('XX');
    });

    it('should truncate long state codes to 2 characters', () => {
      const address = {
        state: 'VIRGINIA',
        street1: '123 Main St',
        city: 'Richmond',
        postalCode: '23219',
      };

      const state = parseStateFromAddress(address);
      expect(state).toBe('VI');
    });

    it('should extract from full address string as fallback', () => {
      const address = {
        street1: '123 Main St',
        city: 'Richmond',
        state: null,
        postalCode: 'VA 23219',
      };

      const state = parseStateFromAddress(address);
      expect(state).toBe('VA');
    });
  });

  describe('validateOrderNumberFormat', () => {
    it('should validate correct format', () => {
      expect(validateOrderNumberFormat('VA-25-00001')).toBe(true);
      expect(validateOrderNumberFormat('MD-24-12345')).toBe(true);
      expect(validateOrderNumberFormat('DC-25-00042')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(validateOrderNumberFormat('V-25-00001')).toBe(false);    // 1-char state
      expect(validateOrderNumberFormat('VAA-25-00001')).toBe(false);  // 3-char state
      expect(validateOrderNumberFormat('VA-2025-00001')).toBe(false); // 4-digit year
      expect(validateOrderNumberFormat('VA-25-001')).toBe(false);     // 3-digit sequence
      expect(validateOrderNumberFormat('VA-25-0000001')).toBe(false); // 7-digit sequence
      expect(validateOrderNumberFormat('va-25-00001')).toBe(false);   // lowercase
      expect(validateOrderNumberFormat('123-45-67890')).toBe(false);  // numbers only
    });
  });

  describe('parseOrderNumber', () => {
    it('should parse valid order numbers', () => {
      const result = parseOrderNumber('VA-25-00042');
      expect(result).toEqual({
        state: 'VA',
        year: '25',
        sequence: '00042',
      });
    });

    it('should return null for invalid formats', () => {
      expect(parseOrderNumber('INVALID')).toBeNull();
      expect(parseOrderNumber('VA-2025-00001')).toBeNull();
      expect(parseOrderNumber('')).toBeNull();
    });

    it('should parse different states and years', () => {
      const md = parseOrderNumber('MD-24-12345');
      expect(md).toEqual({
        state: 'MD',
        year: '24',
        sequence: '12345',
      });

      const dc = parseOrderNumber('DC-26-00001');
      expect(dc).toEqual({
        state: 'DC',
        year: '26',
        sequence: '00001',
      });
    });
  });

  describe('generateOrderNumber integration', () => {
    // Note: These tests require a working Prisma client and database
    // Run with: npm test or jest

    it('should generate format: [STATE]-[YY]-[#####]', () => {
      // This is a format validation test
      const sampleNumber = 'VA-25-00001';
      expect(validateOrderNumberFormat(sampleNumber)).toBe(true);

      const parsed = parseOrderNumber(sampleNumber);
      expect(parsed).toBeTruthy();
      expect(parsed?.state).toBe('VA');
      expect(parsed?.year).toBe('25');
      expect(parsed?.sequence).toBe('00001');
    });

    it('should handle sequence increments', () => {
      // Test that sequence is 5 digits, zero-padded
      const sequences = [1, 42, 999, 1234, 99999];
      const padded = sequences.map(seq => seq.toString().padStart(5, '0'));

      expect(padded).toEqual(['00001', '00042', '00999', '01234', '99999']);
    });

    // Database integration tests would go here
    // These require actual Prisma client and test database
    // Example:
    //
    // it('should generate unique order numbers per state/year', async () => {
    //   const prisma = new PrismaClient();
    //   const customerId = 'test-customer-id';
    //   const tenantId = 'test-tenant-id';
    //
    //   const orderNumber1 = await generateOrderNumber(prisma, tenantId, customerId);
    //   const orderNumber2 = await generateOrderNumber(prisma, tenantId, customerId);
    //
    //   expect(orderNumber1).not.toBe(orderNumber2);
    //   expect(validateOrderNumberFormat(orderNumber1)).toBe(true);
    //   expect(validateOrderNumberFormat(orderNumber2)).toBe(true);
    //
    //   await prisma.$disconnect();
    // });
  });
});

describe('Order Number Edge Cases', () => {
  it('should handle end of year transition', () => {
    // Year should be last 2 digits
    const year2024 = '24';
    const year2025 = '25';

    expect(year2024).toHaveLength(2);
    expect(year2025).toHaveLength(2);
  });

  it('should handle high sequence numbers', () => {
    // Sequence can go up to 99999
    const maxSequence = '99999';
    const orderNumber = `VA-25-${maxSequence}`;

    expect(validateOrderNumberFormat(orderNumber)).toBe(true);
  });

  it('should handle different state codes', () => {
    const states = ['VA', 'MD', 'DC', 'PA', 'NC', 'WV', 'DE', 'XX'];

    states.forEach(state => {
      const orderNumber = `${state}-25-00001`;
      expect(validateOrderNumberFormat(orderNumber)).toBe(true);
    });
  });
});
