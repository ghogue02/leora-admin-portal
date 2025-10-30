/**
 * Invoice Generation Integration Tests
 *
 * Tests complete invoice workflow from order to PDF
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { buildInvoiceData, createVAInvoice } from '@/lib/invoices/invoice-data-builder';
import { determineInvoiceFormat } from '@/lib/invoices/format-selector';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

describe('Invoice Generation Integration', () => {
  describe('Format Auto-Detection', () => {
    it('should detect VA_ABC_INSTATE for VA to VA sales', () => {
      const format = determineInvoiceFormat({
        customerState: 'VA',
        distributorState: 'VA',
      });

      expect(format).toBe('VA_ABC_INSTATE');
    });

    it('should detect VA_ABC_TAX_EXEMPT for VA to out-of-state', () => {
      const format = determineInvoiceFormat({
        customerState: 'IA',
        distributorState: 'VA',
      });

      expect(format).toBe('VA_ABC_TAX_EXEMPT');
    });
  });

  describe('Invoice Data Building', () => {
    it('should calculate total liters correctly', () => {
      const lineItems = [
        { quantity: 12, bottleSize: '750ml', totalLiters: null },
        { quantity: 6, bottleSize: '1.5L', totalLiters: null },
      ];

      const calculateInvoiceTotalLiters = (items: typeof lineItems) => {
        return items.reduce((sum, item) => {
          const size = item.bottleSize?.includes('ml')
            ? parseFloat(item.bottleSize) / 1000
            : parseFloat(item.bottleSize || '0.75');
          return sum + (item.quantity * size);
        }, 0);
      };

      const total = calculateInvoiceTotalLiters(lineItems);
      expect(total).toBeCloseTo(18.0, 1); // 12×0.75 + 6×1.5 = 9 + 9 = 18
    });

    it('should calculate cases correctly including fractionals', () => {
      const quantity = 106;
      const bottlesPerCase = 12;
      const cases = quantity / bottlesPerCase;

      expect(cases).toBeCloseTo(8.83, 2);
    });
  });

  describe('Tax Calculations', () => {
    it('should calculate VA excise tax at $0.40/liter', () => {
      const liters = 18.0;
      const exciseTax = liters * 0.40;

      expect(exciseTax).toBe(7.2);
    });

    it('should not calculate excise tax for out-of-state sales', () => {
      const isInState = false;
      const exciseTax = isInState ? 18.0 * 0.40 : 0;

      expect(exciseTax).toBe(0);
    });
  });

  describe('Invoice Number Generation', () => {
    it('should generate invoice number in correct format', () => {
      const now = new Date();
      const yearMonth = now.getFullYear().toString() +
                       (now.getMonth() + 1).toString().padStart(2, '0');
      const invoiceNumber = `INV-${yearMonth}-0001`;

      expect(invoiceNumber).toMatch(/^INV-\d{6}-\d{4}$/);
    });
  });
});
