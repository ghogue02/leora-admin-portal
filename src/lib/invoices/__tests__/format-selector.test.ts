/**
 * Format Selector Tests
 */

import { describe, it, expect } from 'vitest';
import {
  determineInvoiceFormat,
  getFormatDescription,
  getRequiredFields,
} from '@/lib/invoices/format-selector';
describe('Invoice Format Selector', () => {
  describe('determineInvoiceFormat', () => {
    it('should return VA_ABC_INSTATE for VA to VA sales', () => {
      const result = determineInvoiceFormat({
        customerState: 'VA',
        distributorState: 'VA',
      });

      expect(result).toBe('VA_ABC_INSTATE');
    });

    it('should return VA_ABC_TAX_EXEMPT for VA to out-of-state sales', () => {
      const result = determineInvoiceFormat({
        customerState: 'IA',
        distributorState: 'VA',
      });

      expect(result).toBe('VA_ABC_TAX_EXEMPT');
    });

    it('should return STANDARD for non-VA distributor', () => {
      const result = determineInvoiceFormat({
        customerState: 'MD',
        distributorState: 'MD',
      });

      expect(result).toBe('STANDARD');
    });

    it('should use manual override when provided', () => {
      const result = determineInvoiceFormat({
        customerState: 'VA',
        distributorState: 'VA',
        manualOverride: 'STANDARD',
      });

      expect(result).toBe('STANDARD');
    });

    it('should return STANDARD when customer state is null', () => {
      const result = determineInvoiceFormat({
        customerState: null,
        distributorState: 'VA',
      });

      expect(result).toBe('STANDARD');
    });
  });

  describe('getFormatDescription', () => {
    it('should return correct description for each format', () => {
      expect(getFormatDescription('VA_ABC_INSTATE')).toContain('In-State');
      expect(getFormatDescription('VA_ABC_TAX_EXEMPT')).toContain('Tax-Exempt');
      expect(getFormatDescription('STANDARD')).toContain('Standard');
    });
  });

  describe('getRequiredFields', () => {
    it('should return extended fields for VA_ABC_INSTATE', () => {
      const fields = getRequiredFields('VA_ABC_INSTATE');

      expect(fields).toContain('salesperson');
      expect(fields).toContain('totalLiters');
      expect(fields).toContain('wholesalerLicenseNumber');
      expect(fields).toContain('shippingMethod');
    });

    it('should return tax-exempt fields for VA_ABC_TAX_EXEMPT', () => {
      const fields = getRequiredFields('VA_ABC_TAX_EXEMPT');

      expect(fields).toContain('poNumber');
      expect(fields).toContain('complianceNotice');
    });

    it('should return base fields for STANDARD', () => {
      const fields = getRequiredFields('STANDARD');

      expect(fields).toContain('invoiceNumber');
      expect(fields).toContain('customer');
      expect(fields.length).toBeLessThan(10); // Minimal fields
    });
  });
});
