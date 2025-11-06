/**
 * SAGE Export Timezone Tests
 *
 * Critical regression tests to ensure SAGE exports show correct dates
 * without timezone shift bugs.
 *
 * ISSUE: Oct 29 input was showing as "10/28/2025" in CSV due to local timezone
 * FIX: Use UTC-based formatting utilities from /lib/dates.ts
 *
 * These tests verify the fix works correctly across all scenarios.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDateForSAGE, parseUTCDate, formatUTCDate } from '../lib/dates';
import { formatDate, type OrderWithRelations } from '../lib/sage/formatting';
import { Decimal } from '@prisma/client/runtime/library';

// Mock csv-stringify to avoid module loading issues
vi.mock('csv-stringify/sync', () => ({
  stringify: vi.fn((data: any[]) => {
    // Simple CSV implementation for testing
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const headerRow = headers.join(',');
    const dataRows = data.map(row =>
      headers.map(h => {
        const val = (row as any)[h];
        return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
      }).join(',')
    );
    return [headerRow, ...dataRows].join('\n');
  })
}));

describe('SAGE Export - Timezone Handling', () => {
  describe('formatDate utility (SAGE formatting)', () => {
    it('should format Oct 29 as "10/29/2025" (NOT "10/28/2025")', () => {
      const oct29 = new Date('2025-10-29T00:00:00.000Z');
      const formatted = formatDate(oct29);

      expect(formatted).toBe('10/29/2025');
      expect(formatted).not.toBe('10/28/2025'); // Verify no timezone shift
    });

    it('should format Nov 8 as "11/8/2025" (NOT "11/7/2025")', () => {
      const nov8 = new Date('2025-11-08T00:00:00.000Z');
      const formatted = formatDate(nov8);

      expect(formatted).toBe('11/8/2025');
      expect(formatted).not.toBe('11/7/2025'); // Verify no timezone shift
    });

    it('should use formatDateForSAGE from dates.ts', () => {
      const oct29 = new Date('2025-10-29T00:00:00.000Z');

      // Both should produce identical output
      expect(formatDate(oct29)).toBe(formatDateForSAGE(oct29));
      expect(formatDate(oct29)).toBe('10/29/2025');
    });

    it('should handle dates regardless of time component', () => {
      const midnightUTC = new Date('2025-10-29T00:00:00.000Z');
      const noonUTC = new Date('2025-10-29T12:00:00.000Z');
      const endOfDayUTC = new Date('2025-10-29T23:59:59.999Z');

      expect(formatDate(midnightUTC)).toBe('10/29/2025');
      expect(formatDate(noonUTC)).toBe('10/29/2025');
      expect(formatDate(endOfDayUTC)).toBe('10/29/2025');
    });

    it('should format consistently across timezones', () => {
      const oct29 = new Date('2025-10-29T00:00:00.000Z');

      // Save original timezone
      const originalTZ = process.env.TZ;

      try {
        // Test in EST (UTC-5)
        process.env.TZ = 'America/New_York';
        expect(formatDate(oct29)).toBe('10/29/2025');

        // Test in PST (UTC-8)
        process.env.TZ = 'America/Los_Angeles';
        expect(formatDate(oct29)).toBe('10/29/2025');

        // Test in JST (UTC+9)
        process.env.TZ = 'Asia/Tokyo';
        expect(formatDate(oct29)).toBe('10/29/2025');
      } finally {
        // Restore timezone
        if (originalTZ) {
          process.env.TZ = originalTZ;
        } else {
          delete process.env.TZ;
        }
      }
    });

    it('should handle month boundaries without timezone issues', () => {
      const jan31 = new Date('2025-01-31T23:59:59.999Z');
      const feb1 = new Date('2025-02-01T00:00:00.000Z');

      expect(formatDate(jan31)).toBe('1/31/2025');
      expect(formatDate(feb1)).toBe('2/1/2025');
    });

    it('should handle year boundaries without timezone issues', () => {
      const dec31 = new Date('2024-12-31T23:59:59.999Z');
      const jan1 = new Date('2025-01-01T00:00:00.000Z');

      expect(formatDate(dec31)).toBe('12/31/2024');
      expect(formatDate(jan1)).toBe('1/1/2025');
    });
  });

  describe('Invoice Date Formatting (simulated CSV export)', () => {
    it('should format Oct 29 invoice date correctly', () => {
      const invoiceDate = new Date('2025-10-29T00:00:00.000Z');
      const dueDate = new Date('2025-11-28T00:00:00.000Z');

      const formattedInvoice = formatDate(invoiceDate);
      const formattedDue = formatDate(dueDate);

      expect(formattedInvoice).toBe('10/29/2025');
      expect(formattedDue).toBe('11/28/2025');

      // Verify no timezone shift
      expect(formattedInvoice).not.toBe('10/28/2025');
      expect(formattedDue).not.toBe('11/27/2025');
    });

    it('should format Nov 8 invoice date correctly', () => {
      const invoiceDate = new Date('2025-11-08T00:00:00.000Z');
      const dueDate = new Date('2025-12-08T00:00:00.000Z');

      const formattedInvoice = formatDate(invoiceDate);
      const formattedDue = formatDate(dueDate);

      expect(formattedInvoice).toBe('11/8/2025');
      expect(formattedDue).toBe('12/8/2025');

      // Verify no timezone shift
      expect(formattedInvoice).not.toBe('11/7/2025');
      expect(formattedDue).not.toBe('12/7/2025');
    });

    it('should handle multiple invoice dates correctly', () => {
      const dates = [
        new Date('2025-10-28T00:00:00.000Z'),
        new Date('2025-10-29T00:00:00.000Z'),
        new Date('2025-11-08T00:00:00.000Z'),
      ];

      const formatted = dates.map(formatDate);

      expect(formatted).toEqual(['10/28/2025', '10/29/2025', '11/8/2025']);

      // Verify no timezone shifts
      expect(formatted).not.toContain('10/27/2025');
      expect(formatted).not.toContain('11/7/2025');
    });

    it('should maintain date accuracy for invoices near DST transitions', () => {
      // DST ends Nov 3, 2024 at 2:00 AM (falls back to 1:00 AM)
      const beforeDST = new Date('2024-11-02T00:00:00.000Z');
      const afterDST = new Date('2024-11-04T00:00:00.000Z');

      const formattedBefore = formatDate(beforeDST);
      const formattedAfter = formatDate(afterDST);

      expect(formattedBefore).toBe('11/2/2024');
      expect(formattedAfter).toBe('11/4/2024');

      // Verify no timezone shifts
      expect(formattedBefore).not.toBe('11/1/2024');
      expect(formattedAfter).not.toBe('11/3/2024');
    });
  });

  describe('Date Range Queries (Database Integration)', () => {
    it('should construct correct date range for Oct 29 - Nov 8', () => {
      // This simulates how we query the database for SAGE export
      const startDate = parseUTCDate('2025-10-29');
      const endDate = parseUTCDate('2025-11-08');

      // Verify the dates are correct
      expect(formatUTCDate(startDate)).toBe('2025-10-29');
      expect(formatUTCDate(endDate)).toBe('2025-11-08');

      // Verify ISO format (for Prisma queries)
      expect(startDate.toISOString()).toBe('2025-10-29T00:00:00.000Z');
      expect(endDate.toISOString()).toBe('2025-11-08T00:00:00.000Z');
    });

    it('should handle date range boundaries correctly', () => {
      // Inclusive range query (common for SAGE export)
      const start = parseUTCDate('2025-10-29');
      start.setUTCHours(0, 0, 0, 0); // Start of day

      const end = parseUTCDate('2025-11-08');
      end.setUTCHours(23, 59, 59, 999); // End of day

      expect(start.toISOString()).toBe('2025-10-29T00:00:00.000Z');
      expect(end.toISOString()).toBe('2025-11-08T23:59:59.999Z');

      // Any order with date >= start && <= end should be included
      const oct29Order = new Date('2025-10-29T10:00:00.000Z');
      const nov8Order = new Date('2025-11-08T10:00:00.000Z');

      expect(oct29Order >= start && oct29Order <= end).toBe(true);
      expect(nov8Order >= start && nov8Order <= end).toBe(true);
    });
  });

  describe('CSV Filename Generation', () => {
    it('should generate filename with correct date format', () => {
      const startDate = parseUTCDate('2025-10-29');
      const endDate = parseUTCDate('2025-11-08');

      const filename = `sage-export-${formatUTCDate(startDate)}-to-${formatUTCDate(endDate)}.csv`;

      expect(filename).toBe('sage-export-2025-10-29-to-2025-11-08.csv');
      expect(filename).not.toContain('2025-10-28'); // No timezone shift
      expect(filename).not.toContain('2025-11-07'); // No timezone shift
    });

    it('should use UTC dates for filenames regardless of local timezone', () => {
      const originalTZ = process.env.TZ;

      try {
        // Test in PST (UTC-8)
        process.env.TZ = 'America/Los_Angeles';
        const date = parseUTCDate('2025-10-29');
        const filename = `sage-export-${formatUTCDate(date)}.csv`;

        expect(filename).toBe('sage-export-2025-10-29.csv');
      } finally {
        if (originalTZ) {
          process.env.TZ = originalTZ;
        } else {
          delete process.env.TZ;
        }
      }
    });
  });

  describe('Regression Tests - Specific Bug Cases', () => {
    it('REGRESSION: Oct 29 should NOT show as Oct 28', () => {
      // This was the original bug reported
      const oct29 = new Date('2025-10-29T00:00:00.000Z');
      const formatted = formatDate(oct29);

      expect(formatted).toBe('10/29/2025');

      // Explicitly verify it's NOT the wrong date
      expect(formatted).not.toBe('10/28/2025');
    });

    it('REGRESSION: Nov 8 should NOT show as Nov 7', () => {
      // Related timezone shift bug
      const nov8 = new Date('2025-11-08T00:00:00.000Z');
      const formatted = formatDate(nov8);

      expect(formatted).toBe('11/8/2025');

      // Explicitly verify it's NOT the wrong date
      expect(formatted).not.toBe('11/7/2025');
    });

    it('REGRESSION: Late evening UTC times should not shift to previous day', () => {
      // Oct 29, 11:59 PM UTC should still be Oct 29
      const lateEvening = new Date('2025-10-29T23:59:59.999Z');
      const formatted = formatDate(lateEvening);

      expect(formatted).toBe('10/29/2025');
      expect(formatted).not.toBe('10/28/2025');
    });

    it('REGRESSION: Early morning UTC times should not shift to next day', () => {
      // Oct 29, 12:01 AM UTC should be Oct 29
      const earlyMorning = new Date('2025-10-29T00:01:00.000Z');
      const formatted = formatDate(earlyMorning);

      expect(formatted).toBe('10/29/2025');
      expect(formatted).not.toBe('10/30/2025');
    });
  });

  describe('Integration: Date Picker → Database → SAGE Export', () => {
    it('should maintain date through full workflow', () => {
      // 1. User selects Oct 29 in date picker
      const userSelectedDate = '2025-10-29'; // From DeliveryDatePicker

      // 2. Parse for database storage
      const dbDate = parseUTCDate(userSelectedDate);
      expect(dbDate.toISOString()).toBe('2025-10-29T00:00:00.000Z');

      // 3. Retrieve from database (simulated)
      const retrievedDate = new Date(dbDate); // Prisma returns Date object

      // 4. Format for SAGE export
      const sageFormatted = formatDate(retrievedDate);
      expect(sageFormatted).toBe('10/29/2025');

      // 5. Verify end-to-end: user input → SAGE CSV
      expect(sageFormatted).toBe('10/29/2025');
      expect(sageFormatted).not.toBe('10/28/2025');
    });

    it('should handle Nov 8 through full workflow', () => {
      // Same workflow for Nov 8
      const userSelectedDate = '2025-11-08';
      const dbDate = parseUTCDate(userSelectedDate);
      const sageFormatted = formatDate(dbDate);

      expect(sageFormatted).toBe('11/8/2025');
      expect(sageFormatted).not.toBe('11/7/2025');
    });
  });
});
