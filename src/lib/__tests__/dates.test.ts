/**
 * Comprehensive Tests for Date Utilities
 *
 * Testing all utilities in /lib/dates.ts to ensure correct UTC timezone handling.
 *
 * Critical scenarios covered:
 * - UTC parsing and formatting
 * - SAGE export date formatting
 * - Date range calculations
 * - Edge cases: DST, leap years, month boundaries
 * - Timezone offset handling
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  parseUTCDate,
  formatUTCDate,
  formatLocalDate,
  formatDateForSAGE,
  setUTCMidnight,
  setUTCEndOfDay,
  parseUTCRange,
  getTodayUTC,
  getTodayLocal,
  isValidDateString,
  addDaysUTC,
  getFirstDayOfMonthUTC,
  getLastDayOfMonthUTC,
  isValidDate,
  toDate,
  DATE_PRESETS,
} from '../dates';

describe('Date Utilities - Timezone Tests', () => {
  // Save original timezone
  const originalTZ = process.env.TZ;

  afterEach(() => {
    // Restore timezone
    if (originalTZ) {
      process.env.TZ = originalTZ;
    } else {
      delete process.env.TZ;
    }
  });

  describe('parseUTCDate', () => {
    it('should parse YYYY-MM-DD as UTC midnight', () => {
      const date = parseUTCDate('2025-11-08');
      expect(date.toISOString()).toBe('2025-11-08T00:00:00.000Z');
      expect(date.getUTCFullYear()).toBe(2025);
      expect(date.getUTCMonth()).toBe(10); // 0-indexed
      expect(date.getUTCDate()).toBe(8);
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
      expect(date.getUTCMilliseconds()).toBe(0);
    });

    it('should handle edge case dates correctly', () => {
      // Start of year
      const jan1 = parseUTCDate('2025-01-01');
      expect(jan1.toISOString()).toBe('2025-01-01T00:00:00.000Z');

      // End of year
      const dec31 = parseUTCDate('2025-12-31');
      expect(dec31.toISOString()).toBe('2025-12-31T00:00:00.000Z');

      // Leap day
      const leapDay = parseUTCDate('2024-02-29');
      expect(leapDay.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    });

    it('should parse consistently regardless of local timezone', () => {
      // Test in EST (UTC-5)
      process.env.TZ = 'America/New_York';
      const dateEST = parseUTCDate('2025-10-29');
      expect(dateEST.toISOString()).toBe('2025-10-29T00:00:00.000Z');

      // Test in PST (UTC-8)
      process.env.TZ = 'America/Los_Angeles';
      const datePST = parseUTCDate('2025-10-29');
      expect(datePST.toISOString()).toBe('2025-10-29T00:00:00.000Z');

      // Test in JST (UTC+9)
      process.env.TZ = 'Asia/Tokyo';
      const dateJST = parseUTCDate('2025-10-29');
      expect(dateJST.toISOString()).toBe('2025-10-29T00:00:00.000Z');
    });

    it('should handle month boundaries correctly', () => {
      // Last day of January
      const jan31 = parseUTCDate('2025-01-31');
      expect(jan31.toISOString()).toBe('2025-01-31T00:00:00.000Z');

      // First day of February
      const feb1 = parseUTCDate('2025-02-01');
      expect(feb1.toISOString()).toBe('2025-02-01T00:00:00.000Z');

      // Last day of February (non-leap year)
      const feb28 = parseUTCDate('2025-02-28');
      expect(feb28.toISOString()).toBe('2025-02-28T00:00:00.000Z');
    });
  });

  describe('formatUTCDate', () => {
    it('should format Date as YYYY-MM-DD in UTC', () => {
      const date = new Date('2025-11-08T14:30:00.000Z');
      expect(formatUTCDate(date)).toBe('2025-11-08');
    });

    it('should format midnight UTC correctly', () => {
      const date = new Date('2025-10-29T00:00:00.000Z');
      expect(formatUTCDate(date)).toBe('2025-10-29');
    });

    it('should format end of day UTC correctly', () => {
      const date = new Date('2025-10-29T23:59:59.999Z');
      expect(formatUTCDate(date)).toBe('2025-10-29');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2025-01-05T12:00:00.000Z');
      expect(formatUTCDate(date)).toBe('2025-01-05');
    });

    it('should format consistently across timezones', () => {
      const date = new Date('2025-10-29T05:00:00.000Z');

      // EST (UTC-5) - local time would be Oct 29, 1:00 AM
      process.env.TZ = 'America/New_York';
      expect(formatUTCDate(date)).toBe('2025-10-29');

      // PST (UTC-8) - local time would be Oct 28, 10:00 PM
      process.env.TZ = 'America/Los_Angeles';
      expect(formatUTCDate(date)).toBe('2025-10-29');
    });

    it('should handle leap year dates', () => {
      const leapDay = new Date('2024-02-29T12:00:00.000Z');
      expect(formatUTCDate(leapDay)).toBe('2024-02-29');
    });
  });

  describe('formatLocalDate', () => {
    it('should format Date as YYYY-MM-DD in local timezone', () => {
      const date = new Date('2025-11-08T05:00:00.000Z');

      // In EST (UTC-5), this is Nov 8, 12:00 AM
      process.env.TZ = 'America/New_York';
      const localFormat = formatLocalDate(date);
      expect(localFormat).toBe('2025-11-08');
    });

    it('should show different date than UTC when crossing midnight', () => {
      // Nov 8, 5:00 AM UTC
      const date = new Date('2025-11-08T05:00:00.000Z');

      // In PST (UTC-8), this is Nov 7, 9:00 PM
      process.env.TZ = 'America/Los_Angeles';
      const localFormat = formatLocalDate(date);
      expect(localFormat).toBe('2025-11-07'); // Different from UTC!

      // In UTC, should be Nov 8
      expect(formatUTCDate(date)).toBe('2025-11-08');
    });

    it('should handle DST transitions', () => {
      // DST ends Nov 3, 2024 at 2:00 AM (falls back to 1:00 AM)
      const beforeDST = new Date('2024-11-02T12:00:00.000Z');
      const afterDST = new Date('2024-11-04T12:00:00.000Z');

      process.env.TZ = 'America/New_York';
      expect(formatLocalDate(beforeDST)).toBe('2024-11-02');
      expect(formatLocalDate(afterDST)).toBe('2024-11-04');
    });
  });

  describe('formatDateForSAGE', () => {
    it('should format as MM/DD/YYYY in UTC', () => {
      const date = new Date('2025-11-08T14:30:00.000Z');
      expect(formatDateForSAGE(date)).toBe('11/08/2025');
    });

    it('should handle Oct 29 correctly (no timezone shift)', () => {
      const oct29 = new Date('2025-10-29T00:00:00.000Z');
      expect(formatDateForSAGE(oct29)).toBe('10/29/2025');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date('2025-01-05T12:00:00.000Z');
      expect(formatDateForSAGE(date)).toBe('01/05/2025');
    });

    it('should format consistently across timezones', () => {
      const date = new Date('2025-10-29T05:00:00.000Z');

      process.env.TZ = 'America/New_York';
      expect(formatDateForSAGE(date)).toBe('10/29/2025');

      process.env.TZ = 'America/Los_Angeles';
      expect(formatDateForSAGE(date)).toBe('10/29/2025');
    });

    it('should handle end of month correctly', () => {
      const jan31 = new Date('2025-01-31T23:59:59.999Z');
      expect(formatDateForSAGE(jan31)).toBe('01/31/2025');

      const feb28 = new Date('2025-02-28T23:59:59.999Z');
      expect(formatDateForSAGE(feb28)).toBe('02/28/2025');

      const leapDay = new Date('2024-02-29T12:00:00.000Z');
      expect(formatDateForSAGE(leapDay)).toBe('02/29/2024');
    });

    it('should handle year boundaries', () => {
      const newYear = new Date('2025-01-01T00:00:00.000Z');
      expect(formatDateForSAGE(newYear)).toBe('01/01/2025');

      const newYearsEve = new Date('2024-12-31T23:59:59.999Z');
      expect(formatDateForSAGE(newYearsEve)).toBe('12/31/2024');
    });
  });

  describe('setUTCMidnight', () => {
    it('should set time to 00:00:00.000 UTC', () => {
      const date = new Date('2025-11-08T14:30:45.123Z');
      const midnight = setUTCMidnight(date);

      expect(midnight.toISOString()).toBe('2025-11-08T00:00:00.000Z');
      expect(midnight.getUTCHours()).toBe(0);
      expect(midnight.getUTCMinutes()).toBe(0);
      expect(midnight.getUTCSeconds()).toBe(0);
      expect(midnight.getUTCMilliseconds()).toBe(0);
    });

    it('should not modify original date', () => {
      const original = new Date('2025-11-08T14:30:45.123Z');
      const midnight = setUTCMidnight(original);

      expect(original.toISOString()).toBe('2025-11-08T14:30:45.123Z');
      expect(midnight.toISOString()).toBe('2025-11-08T00:00:00.000Z');
    });

    it('should preserve the date portion', () => {
      const date = new Date('2025-10-29T23:59:59.999Z');
      const midnight = setUTCMidnight(date);

      expect(formatUTCDate(midnight)).toBe('2025-10-29');
      expect(midnight.toISOString()).toBe('2025-10-29T00:00:00.000Z');
    });
  });

  describe('setUTCEndOfDay', () => {
    it('should set time to 23:59:59.999 UTC', () => {
      const date = new Date('2025-11-08T14:30:45.123Z');
      const endOfDay = setUTCEndOfDay(date);

      expect(endOfDay.toISOString()).toBe('2025-11-08T23:59:59.999Z');
      expect(endOfDay.getUTCHours()).toBe(23);
      expect(endOfDay.getUTCMinutes()).toBe(59);
      expect(endOfDay.getUTCSeconds()).toBe(59);
      expect(endOfDay.getUTCMilliseconds()).toBe(999);
    });

    it('should not modify original date', () => {
      const original = new Date('2025-11-08T14:30:45.123Z');
      const endOfDay = setUTCEndOfDay(original);

      expect(original.toISOString()).toBe('2025-11-08T14:30:45.123Z');
      expect(endOfDay.toISOString()).toBe('2025-11-08T23:59:59.999Z');
    });

    it('should preserve the date portion', () => {
      const date = new Date('2025-10-29T00:00:00.000Z');
      const endOfDay = setUTCEndOfDay(date);

      expect(formatUTCDate(endOfDay)).toBe('2025-10-29');
      expect(endOfDay.toISOString()).toBe('2025-10-29T23:59:59.999Z');
    });
  });

  describe('parseUTCRange', () => {
    it('should parse date range with inclusive boundaries', () => {
      const { start, end } = parseUTCRange('2025-11-01', '2025-11-08');

      expect(start.toISOString()).toBe('2025-11-01T00:00:00.000Z');
      expect(end.toISOString()).toBe('2025-11-08T23:59:59.999Z');
    });

    it('should handle single-day range', () => {
      const { start, end } = parseUTCRange('2025-10-29', '2025-10-29');

      expect(formatUTCDate(start)).toBe('2025-10-29');
      expect(formatUTCDate(end)).toBe('2025-10-29');
      expect(start.toISOString()).toBe('2025-10-29T00:00:00.000Z');
      expect(end.toISOString()).toBe('2025-10-29T23:59:59.999Z');
    });

    it('should handle month boundaries', () => {
      const { start, end } = parseUTCRange('2025-01-31', '2025-02-01');

      expect(start.toISOString()).toBe('2025-01-31T00:00:00.000Z');
      expect(end.toISOString()).toBe('2025-02-01T23:59:59.999Z');
    });

    it('should handle year boundaries', () => {
      const { start, end } = parseUTCRange('2024-12-31', '2025-01-01');

      expect(start.toISOString()).toBe('2024-12-31T00:00:00.000Z');
      expect(end.toISOString()).toBe('2025-01-01T23:59:59.999Z');
    });
  });

  describe('getTodayUTC', () => {
    it('should return current date in YYYY-MM-DD format (UTC)', () => {
      const today = getTodayUTC();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Should match formatUTCDate of current time
      const now = new Date();
      expect(today).toBe(formatUTCDate(now));
    });

    it('should be consistent across timezones', () => {
      process.env.TZ = 'America/New_York';
      const todayEST = getTodayUTC();

      process.env.TZ = 'Asia/Tokyo';
      const todayJST = getTodayUTC();

      // Both should return UTC date (may differ from local date)
      expect(todayEST).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(todayJST).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('isValidDateString', () => {
    it('should validate correct YYYY-MM-DD format', () => {
      expect(isValidDateString('2025-11-08')).toBe(true);
      expect(isValidDateString('2024-02-29')).toBe(true); // Leap year
      expect(isValidDateString('2025-01-01')).toBe(true);
      expect(isValidDateString('2025-12-31')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidDateString('11/08/2025')).toBe(false); // MM/DD/YYYY
      expect(isValidDateString('2025-11-8')).toBe(false);  // Missing zero padding
      expect(isValidDateString('2025-1-08')).toBe(false);  // Missing zero padding
      expect(isValidDateString('25-11-08')).toBe(false);   // 2-digit year
      expect(isValidDateString('not-a-date')).toBe(false);
      expect(isValidDateString('')).toBe(false);
    });

    it('should reject invalid dates', () => {
      expect(isValidDateString('2025-13-01')).toBe(false); // Invalid month
      expect(isValidDateString('2025-11-32')).toBe(false); // Invalid day
      expect(isValidDateString('2025-02-29')).toBe(false); // Not a leap year
      expect(isValidDateString('2025-04-31')).toBe(false); // April has 30 days
    });
  });

  describe('addDaysUTC', () => {
    it('should add positive days', () => {
      const date = parseUTCDate('2025-11-08');
      const result = addDaysUTC(date, 7);

      expect(formatUTCDate(result)).toBe('2025-11-15');
    });

    it('should subtract negative days', () => {
      const date = parseUTCDate('2025-11-08');
      const result = addDaysUTC(date, -30);

      expect(formatUTCDate(result)).toBe('2025-10-09');
    });

    it('should handle month boundaries', () => {
      const jan31 = parseUTCDate('2025-01-31');
      const feb1 = addDaysUTC(jan31, 1);

      expect(formatUTCDate(feb1)).toBe('2025-02-01');
    });

    it('should handle year boundaries', () => {
      const dec31 = parseUTCDate('2024-12-31');
      const jan1 = addDaysUTC(dec31, 1);

      expect(formatUTCDate(jan1)).toBe('2025-01-01');
    });

    it('should handle leap years', () => {
      const feb28_2024 = parseUTCDate('2024-02-28');
      const feb29_2024 = addDaysUTC(feb28_2024, 1);
      const mar1_2024 = addDaysUTC(feb28_2024, 2);

      expect(formatUTCDate(feb29_2024)).toBe('2024-02-29');
      expect(formatUTCDate(mar1_2024)).toBe('2024-03-01');

      // Non-leap year
      const feb28_2025 = parseUTCDate('2025-02-28');
      const mar1_2025 = addDaysUTC(feb28_2025, 1);

      expect(formatUTCDate(mar1_2025)).toBe('2025-03-01');
    });
  });

  describe('getFirstDayOfMonthUTC', () => {
    it('should return first day of month at midnight UTC', () => {
      const date = parseUTCDate('2025-11-15');
      const firstDay = getFirstDayOfMonthUTC(date);

      expect(firstDay.toISOString()).toBe('2025-11-01T00:00:00.000Z');
    });

    it('should handle date already at first of month', () => {
      const date = parseUTCDate('2025-11-01');
      const firstDay = getFirstDayOfMonthUTC(date);

      expect(firstDay.toISOString()).toBe('2025-11-01T00:00:00.000Z');
    });

    it('should handle January', () => {
      const date = parseUTCDate('2025-01-15');
      const firstDay = getFirstDayOfMonthUTC(date);

      expect(firstDay.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should handle December', () => {
      const date = parseUTCDate('2025-12-31');
      const firstDay = getFirstDayOfMonthUTC(date);

      expect(firstDay.toISOString()).toBe('2025-12-01T00:00:00.000Z');
    });
  });

  describe('getLastDayOfMonthUTC', () => {
    it('should return last day of month at end of day UTC', () => {
      const date = parseUTCDate('2025-11-15');
      const lastDay = getLastDayOfMonthUTC(date);

      expect(lastDay.toISOString()).toBe('2025-11-30T23:59:59.999Z');
    });

    it('should handle date already at last of month', () => {
      const date = parseUTCDate('2025-11-30');
      const lastDay = getLastDayOfMonthUTC(date);

      expect(lastDay.toISOString()).toBe('2025-11-30T23:59:59.999Z');
    });

    it('should handle months with 31 days', () => {
      const jan = parseUTCDate('2025-01-15');
      expect(getLastDayOfMonthUTC(jan).toISOString()).toBe('2025-01-31T23:59:59.999Z');

      const dec = parseUTCDate('2025-12-15');
      expect(getLastDayOfMonthUTC(dec).toISOString()).toBe('2025-12-31T23:59:59.999Z');
    });

    it('should handle months with 30 days', () => {
      const apr = parseUTCDate('2025-04-15');
      expect(getLastDayOfMonthUTC(apr).toISOString()).toBe('2025-04-30T23:59:59.999Z');

      const nov = parseUTCDate('2025-11-15');
      expect(getLastDayOfMonthUTC(nov).toISOString()).toBe('2025-11-30T23:59:59.999Z');
    });

    it('should handle February in leap years', () => {
      const feb2024 = parseUTCDate('2024-02-15');
      expect(getLastDayOfMonthUTC(feb2024).toISOString()).toBe('2024-02-29T23:59:59.999Z');

      const feb2025 = parseUTCDate('2025-02-15');
      expect(getLastDayOfMonthUTC(feb2025).toISOString()).toBe('2025-02-28T23:59:59.999Z');
    });
  });

  describe('isValidDate', () => {
    it('should validate Date objects', () => {
      expect(isValidDate(new Date('2025-11-08'))).toBe(true);
      expect(isValidDate(new Date())).toBe(true);
    });

    it('should reject Invalid Date', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate(new Date('not-a-date'))).toBe(false);
    });

    it('should reject non-Date values', () => {
      expect(isValidDate('2025-11-08')).toBe(false);
      expect(isValidDate(123456789)).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate({})).toBe(false);
    });
  });

  describe('toDate', () => {
    it('should convert valid Date objects', () => {
      const date = new Date('2025-11-08T12:00:00.000Z');
      const result = toDate(date);

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe(date.toISOString());
    });

    it('should parse YYYY-MM-DD strings as UTC', () => {
      const result = toDate('2025-11-08');

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2025-11-08T00:00:00.000Z');
    });

    it('should parse ISO strings', () => {
      const result = toDate('2025-11-08T14:30:00.000Z');

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2025-11-08T14:30:00.000Z');
    });

    it('should convert timestamps', () => {
      const timestamp = Date.parse('2025-11-08T12:00:00.000Z');
      const result = toDate(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe('2025-11-08T12:00:00.000Z');
    });

    it('should return null for invalid inputs', () => {
      expect(toDate('invalid')).toBeNull();
      expect(toDate('not-a-date')).toBeNull();
      expect(toDate({})).toBeNull();
      expect(toDate([])).toBeNull();
      expect(toDate(NaN)).toBeNull();
    });
  });

  describe('DATE_PRESETS', () => {
    it('should provide today preset', () => {
      const { start, end } = DATE_PRESETS.today();

      const today = getTodayUTC();
      expect(formatUTCDate(start)).toBe(today);
      expect(formatUTCDate(end)).toBe(today);
    });

    it('should provide yesterday preset', () => {
      const { start, end } = DATE_PRESETS.yesterday();

      const yesterday = formatUTCDate(addDaysUTC(new Date(), -1));
      expect(formatUTCDate(start)).toBe(yesterday);
      expect(formatUTCDate(end)).toBe(yesterday);
    });

    it('should provide last7Days preset', () => {
      const { start, end } = DATE_PRESETS.last7Days();

      const today = getTodayUTC();
      const sevenDaysAgo = formatUTCDate(addDaysUTC(new Date(), -6));

      expect(formatUTCDate(start)).toBe(sevenDaysAgo);
      expect(formatUTCDate(end)).toBe(today);
    });

    it('should provide last30Days preset', () => {
      const { start, end } = DATE_PRESETS.last30Days();

      const today = getTodayUTC();
      const thirtyDaysAgo = formatUTCDate(addDaysUTC(new Date(), -29));

      expect(formatUTCDate(start)).toBe(thirtyDaysAgo);
      expect(formatUTCDate(end)).toBe(today);
    });

    it('should provide thisMonth preset', () => {
      const { start, end } = DATE_PRESETS.thisMonth();

      const now = new Date();
      const expectedStart = getFirstDayOfMonthUTC(now);
      const expectedEnd = getLastDayOfMonthUTC(now);

      expect(formatUTCDate(start)).toBe(formatUTCDate(expectedStart));
      expect(formatUTCDate(end)).toBe(formatUTCDate(expectedEnd));
    });

    it('should provide lastMonth preset', () => {
      const { start, end } = DATE_PRESETS.lastMonth();

      const now = new Date();
      const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const expectedStart = getFirstDayOfMonthUTC(lastMonth);
      const expectedEnd = getLastDayOfMonthUTC(lastMonth);

      expect(formatUTCDate(start)).toBe(formatUTCDate(expectedStart));
      expect(formatUTCDate(end)).toBe(formatUTCDate(expectedEnd));
    });

    it('should provide yearToDate preset', () => {
      const { start, end } = DATE_PRESETS.yearToDate();

      const now = new Date();
      const yearStart = `${now.getUTCFullYear()}-01-01`;
      const today = getTodayUTC();

      expect(formatUTCDate(start)).toBe(yearStart);
      expect(formatUTCDate(end)).toBe(today);
    });
  });

  describe('Round-trip consistency', () => {
    it('parseUTCDate -> formatUTCDate should be identity', () => {
      const dateStr = '2025-10-29';
      const date = parseUTCDate(dateStr);
      const formatted = formatUTCDate(date);

      expect(formatted).toBe(dateStr);
    });

    it('should maintain date through multiple transformations', () => {
      const original = '2025-11-08';
      const parsed = parseUTCDate(original);
      const midnight = setUTCMidnight(parsed);
      const formatted = formatUTCDate(midnight);

      expect(formatted).toBe(original);
    });

    it('should maintain date range boundaries', () => {
      const startStr = '2025-10-29';
      const endStr = '2025-11-08';

      const { start, end } = parseUTCRange(startStr, endStr);

      expect(formatUTCDate(start)).toBe(startStr);
      expect(formatUTCDate(end)).toBe(endStr);
    });
  });

  describe('DST edge cases', () => {
    it('should handle DST transition dates consistently', () => {
      // DST starts March 10, 2024 (spring forward)
      const dstStart = parseUTCDate('2024-03-10');
      expect(formatUTCDate(dstStart)).toBe('2024-03-10');
      expect(formatDateForSAGE(dstStart)).toBe('03/10/2024');

      // DST ends November 3, 2024 (fall back)
      const dstEnd = parseUTCDate('2024-11-03');
      expect(formatUTCDate(dstEnd)).toBe('2024-11-03');
      expect(formatDateForSAGE(dstEnd)).toBe('11/03/2024');
    });

    it('should handle dates near DST transitions', () => {
      const beforeDST = parseUTCDate('2024-03-09');
      const duringDST = parseUTCDate('2024-03-10');
      const afterDST = parseUTCDate('2024-03-11');

      expect(formatUTCDate(beforeDST)).toBe('2024-03-09');
      expect(formatUTCDate(duringDST)).toBe('2024-03-10');
      expect(formatUTCDate(afterDST)).toBe('2024-03-11');
    });
  });
});
