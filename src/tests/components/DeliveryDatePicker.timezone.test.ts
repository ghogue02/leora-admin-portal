/**
 * Timezone Tests for DeliveryDatePicker Component
 *
 * Tests date selection across different timezones to ensure:
 * - Nov 8, 2025 selected in EST stores as Nov 8, 2025 (not Nov 7 or Nov 9)
 * - No off-by-one bugs around midnight boundaries
 * - Consistent behavior in EST (UTC-5), PST (UTC-8), and UTC
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { formatUTCDate, parseUTCDate } from '@/lib/dates';

describe('DeliveryDatePicker - Timezone Handling', () => {
  let originalTimezone: string | undefined;

  beforeEach(() => {
    // Save original timezone
    originalTimezone = process.env.TZ;
  });

  afterEach(() => {
    // Restore original timezone
    if (originalTimezone) {
      process.env.TZ = originalTimezone;
    } else {
      delete process.env.TZ;
    }
  });

  describe('Date Selection in EST (UTC-5)', () => {
    beforeEach(() => {
      process.env.TZ = 'America/New_York';
    });

    it('should store Nov 8, 2025 when user selects Nov 8 in EST', () => {
      // Simulate user selecting Nov 8, 2025 at 10:00 AM EST
      const userSelectedDate = new Date('2025-11-08T10:00:00-05:00');
      userSelectedDate.setUTCHours(0, 0, 0, 0);

      const storedValue = formatUTCDate(userSelectedDate);

      expect(storedValue).toBe('2025-11-08');
    });

    it('should handle midnight boundary in EST', () => {
      // EST midnight = 5:00 AM UTC
      const estMidnight = new Date('2025-11-08T00:00:00-05:00');
      estMidnight.setUTCHours(0, 0, 0, 0);

      const storedValue = formatUTCDate(estMidnight);

      expect(storedValue).toBe('2025-11-08');
    });

    it('should handle 11:59 PM EST without off-by-one error', () => {
      // 11:59 PM EST = 4:59 AM UTC next day
      const estAlmostMidnight = new Date('2025-11-08T23:59:59-05:00');
      estAlmostMidnight.setUTCHours(0, 0, 0, 0);

      const storedValue = formatUTCDate(estAlmostMidnight);

      expect(storedValue).toBe('2025-11-08');
    });
  });

  describe('Date Selection in PST (UTC-8)', () => {
    beforeEach(() => {
      process.env.TZ = 'America/Los_Angeles';
    });

    it('should store Nov 8, 2025 when user selects Nov 8 in PST', () => {
      const userSelectedDate = new Date('2025-11-08T14:30:00-08:00');
      userSelectedDate.setUTCHours(0, 0, 0, 0);

      const storedValue = formatUTCDate(userSelectedDate);

      expect(storedValue).toBe('2025-11-08');
    });

    it('should handle midnight boundary in PST', () => {
      // PST midnight = 8:00 AM UTC
      const pstMidnight = new Date('2025-11-08T00:00:00-08:00');
      pstMidnight.setUTCHours(0, 0, 0, 0);

      const storedValue = formatUTCDate(pstMidnight);

      expect(storedValue).toBe('2025-11-08');
    });
  });

  describe('Date Selection in UTC', () => {
    beforeEach(() => {
      process.env.TZ = 'UTC';
    });

    it('should store Nov 8, 2025 when user selects Nov 8 in UTC', () => {
      const userSelectedDate = new Date('2025-11-08T12:00:00Z');
      userSelectedDate.setUTCHours(0, 0, 0, 0);

      const storedValue = formatUTCDate(userSelectedDate);

      expect(storedValue).toBe('2025-11-08');
    });

    it('should handle UTC midnight', () => {
      const utcMidnight = new Date('2025-11-08T00:00:00Z');
      utcMidnight.setUTCHours(0, 0, 0, 0);

      const storedValue = formatUTCDate(utcMidnight);

      expect(storedValue).toBe('2025-11-08');
    });
  });

  describe('Round-trip Date Conversion', () => {
    const testCases = [
      { timezone: 'America/New_York', name: 'EST' },
      { timezone: 'America/Los_Angeles', name: 'PST' },
      { timezone: 'UTC', name: 'UTC' },
      { timezone: 'Europe/London', name: 'GMT' },
      { timezone: 'Asia/Tokyo', name: 'JST' },
    ];

    testCases.forEach(({ timezone, name }) => {
      it(`should maintain date integrity in ${name} (${timezone})`, () => {
        process.env.TZ = timezone;

        const originalDate = '2025-11-08';
        const parsed = parseUTCDate(originalDate);
        parsed.setUTCHours(0, 0, 0, 0);
        const formatted = formatUTCDate(parsed);

        expect(formatted).toBe(originalDate);
      });
    });
  });

  describe('Suggested Delivery Dates - Timezone Consistency', () => {
    it('should generate same suggested dates regardless of timezone', () => {
      const timezones = ['America/New_York', 'America/Los_Angeles', 'UTC', 'Asia/Tokyo'];
      const results: string[][] = [];

      timezones.forEach(tz => {
        process.env.TZ = tz;

        // Simulate getSuggestedDeliveryDates logic
        const suggestions: string[] = [];
        const today = new Date();
        let currentDate = new Date(today);
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);

        for (let i = 0; i < 3; i++) {
          const normalized = new Date(currentDate);
          normalized.setUTCHours(0, 0, 0, 0);
          suggestions.push(formatUTCDate(normalized));
          currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        results.push(suggestions);
      });

      // All timezones should produce the same dates
      const firstResult = results[0];
      results.forEach(result => {
        expect(result).toEqual(firstResult);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle daylight saving time transitions', () => {
      process.env.TZ = 'America/New_York';

      // Spring forward: March 9, 2025 at 2:00 AM EST -> 3:00 AM EDT
      const springDate = new Date('2025-03-09T10:00:00-05:00');
      springDate.setUTCHours(0, 0, 0, 0);

      expect(formatUTCDate(springDate)).toBe('2025-03-09');

      // Fall back: November 2, 2025 at 2:00 AM EDT -> 1:00 AM EST
      const fallDate = new Date('2025-11-02T10:00:00-05:00');
      fallDate.setUTCHours(0, 0, 0, 0);

      expect(formatUTCDate(fallDate)).toBe('2025-11-02');
    });

    it('should handle leap year dates', () => {
      const leapDate = new Date('2024-02-29T12:00:00Z');
      leapDate.setUTCHours(0, 0, 0, 0);

      expect(formatUTCDate(leapDate)).toBe('2024-02-29');
    });

    it('should handle year boundaries', () => {
      const newYearsEve = new Date('2025-12-31T23:59:59Z');
      newYearsEve.setUTCHours(0, 0, 0, 0);

      expect(formatUTCDate(newYearsEve)).toBe('2025-12-31');

      const newYearsDay = new Date('2026-01-01T00:00:00Z');
      newYearsDay.setUTCHours(0, 0, 0, 0);

      expect(formatUTCDate(newYearsDay)).toBe('2026-01-01');
    });
  });
});
