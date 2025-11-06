/**
 * Centralized Date Utilities Library
 *
 * This library provides consistent timezone handling across the application.
 *
 * KEY PRINCIPLES:
 * - Store & transmit dates in UTC (database, APIs, exports)
 * - Display dates in local timezone (when needed for users)
 * - Never use bare `new Date(string)` for date-only values
 * - Always be explicit about UTC vs local
 *
 * USAGE GUIDELINES:
 *
 * Database Queries:
 *   const { start, end } = parseUTCRange("2025-11-01", "2025-11-08");
 *   const orders = await prisma.order.findMany({
 *     where: { orderDate: { gte: start, lte: end } }
 *   });
 *
 * API Responses:
 *   const order = { orderDate: formatUTCDate(new Date()) };
 *
 * Display Formatting:
 *   const displayDate = formatLocalDate(order.orderDate);
 *
 * Date Picker Values:
 *   const dateStr = formatUTCDate(selectedDate);
 */

/**
 * Parse a date-only string (YYYY-MM-DD) as UTC midnight.
 *
 * This prevents timezone offset issues where "2025-11-08" might be
 * interpreted as local time and converted to a different UTC day.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object set to UTC midnight
 *
 * @example
 * // Returns 2025-11-08T00:00:00.000Z
 * parseUTCDate("2025-11-08");
 *
 * @example
 * // Database query with UTC date
 * const startDate = parseUTCDate("2025-11-01");
 * const orders = await prisma.order.findMany({
 *   where: { orderDate: { gte: startDate } }
 * });
 */
export function parseUTCDate(dateStr: string): Date {
  // Parse YYYY-MM-DD manually to avoid timezone conversion
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Format a Date object as YYYY-MM-DD in UTC timezone.
 *
 * Use this for:
 * - Storing dates in database
 * - Sending dates in API responses
 * - Exporting to CSV/files
 * - Date picker values
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format (UTC)
 *
 * @example
 * // Returns "2025-11-08"
 * formatUTCDate(new Date("2025-11-08T14:30:00Z"));
 *
 * @example
 * // API response
 * const response = {
 *   orderDate: formatUTCDate(order.orderDate),
 *   deliveryDate: formatUTCDate(order.deliveryDate)
 * };
 */
export function formatUTCDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object as YYYY-MM-DD in local timezone.
 *
 * Use this ONLY for display purposes when you explicitly want
 * to show the date in the user's local timezone.
 *
 * WARNING: Don't use this for database storage or API transmission.
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format (local timezone)
 *
 * @example
 * // User in EST sees "2025-11-08" for UTC date "2025-11-08T05:00:00Z"
 * formatLocalDate(new Date("2025-11-08T05:00:00Z"));
 *
 * @example
 * // Display in UI
 * <div>Order Date: {formatLocalDate(order.orderDate)}</div>
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date object as MM/DD/YYYY in UTC timezone.
 *
 * This format is specifically for SAGE export compatibility.
 *
 * @param date - Date object to format
 * @returns Date string in MM/DD/YYYY format (UTC)
 *
 * @example
 * // Returns "11/08/2025"
 * formatDateForSAGE(new Date("2025-11-08T00:00:00Z"));
 *
 * @example
 * // SAGE export
 * const csvRow = {
 *   "Invoice Date": formatDateForSAGE(invoice.date),
 *   "Due Date": formatDateForSAGE(invoice.dueDate)
 * };
 */
export function formatDateForSAGE(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Set a Date object to UTC midnight (00:00:00.000).
 *
 * Useful for normalizing dates to start of day in UTC.
 *
 * @param date - Date object to modify
 * @returns New Date object set to UTC midnight
 *
 * @example
 * // Returns "2025-11-08T00:00:00.000Z"
 * setUTCMidnight(new Date("2025-11-08T14:30:45.123Z"));
 *
 * @example
 * // Normalize user input
 * const normalizedDate = setUTCMidnight(new Date(userInput));
 */
export function setUTCMidnight(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/**
 * Set a Date object to end of day in UTC (23:59:59.999).
 *
 * Useful for inclusive date range queries.
 *
 * @param date - Date object to modify
 * @returns New Date object set to UTC end of day
 *
 * @example
 * // Returns "2025-11-08T23:59:59.999Z"
 * setUTCEndOfDay(new Date("2025-11-08T14:30:45.123Z"));
 *
 * @example
 * // Inclusive date range
 * const endDate = setUTCEndOfDay(parseUTCDate("2025-11-08"));
 * const orders = await prisma.order.findMany({
 *   where: { orderDate: { lte: endDate } }
 * });
 */
export function setUTCEndOfDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

/**
 * Parse a date range from YYYY-MM-DD strings to UTC Date objects.
 *
 * Returns start date at UTC midnight and end date at UTC end of day
 * for inclusive range queries.
 *
 * @param startStr - Start date in YYYY-MM-DD format
 * @param endStr - End date in YYYY-MM-DD format
 * @returns Object with start and end Date objects
 *
 * @example
 * // Returns {
 * //   start: Date("2025-11-01T00:00:00.000Z"),
 * //   end: Date("2025-11-08T23:59:59.999Z")
 * // }
 * parseUTCRange("2025-11-01", "2025-11-08");
 *
 * @example
 * // Database query with date range
 * const { start, end } = parseUTCRange(
 *   searchParams.startDate,
 *   searchParams.endDate
 * );
 * const orders = await prisma.order.findMany({
 *   where: {
 *     orderDate: { gte: start, lte: end }
 *   }
 * });
 *
 * @example
 * // API query parameters
 * const { start, end } = parseUTCRange(
 *   req.query.start as string,
 *   req.query.end as string
 * );
 */
export function parseUTCRange(startStr: string, endStr: string): {
  start: Date;
  end: Date;
} {
  const start = parseUTCDate(startStr);
  const end = setUTCEndOfDay(parseUTCDate(endStr));
  return { start, end };
}

/**
 * Get current date as YYYY-MM-DD string in UTC.
 *
 * @returns Current date in YYYY-MM-DD format (UTC)
 *
 * @example
 * // Returns "2025-11-08" (if current UTC date is Nov 8, 2025)
 * getTodayUTC();
 *
 * @example
 * // Default date picker value
 * const [selectedDate, setSelectedDate] = useState(getTodayUTC());
 */
export function getTodayUTC(): string {
  return formatUTCDate(new Date());
}

/**
 * Get current date as YYYY-MM-DD string in local timezone.
 *
 * @returns Current date in YYYY-MM-DD format (local timezone)
 *
 * @example
 * // Returns "2025-11-08" (if current local date is Nov 8, 2025)
 * getTodayLocal();
 */
export function getTodayLocal(): string {
  return formatLocalDate(new Date());
}

/**
 * Check if a date string is valid YYYY-MM-DD format.
 *
 * @param dateStr - Date string to validate
 * @returns True if valid YYYY-MM-DD format
 *
 * @example
 * isValidDateString("2025-11-08"); // true
 * isValidDateString("11/08/2025"); // false
 * isValidDateString("2025-13-01"); // false (invalid month)
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const date = parseUTCDate(dateStr);
  return !isNaN(date.getTime()) && formatUTCDate(date) === dateStr;
}

/**
 * Add days to a date in UTC.
 *
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object with days added
 *
 * @example
 * // Add 7 days
 * const nextWeek = addDaysUTC(parseUTCDate("2025-11-08"), 7);
 * // Returns Date("2025-11-15T00:00:00.000Z")
 *
 * @example
 * // Subtract 30 days
 * const lastMonth = addDaysUTC(parseUTCDate("2025-11-08"), -30);
 */
export function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Get the first day of the month in UTC.
 *
 * @param date - Date in the target month
 * @returns Date object set to first day of month at UTC midnight
 *
 * @example
 * // Returns Date("2025-11-01T00:00:00.000Z")
 * getFirstDayOfMonthUTC(parseUTCDate("2025-11-08"));
 */
export function getFirstDayOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

/**
 * Get the last day of the month in UTC.
 *
 * @param date - Date in the target month
 * @returns Date object set to last day of month at UTC end of day
 *
 * @example
 * // Returns Date("2025-11-30T23:59:59.999Z")
 * getLastDayOfMonthUTC(parseUTCDate("2025-11-08"));
 */
export function getLastDayOfMonthUTC(date: Date): Date {
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return lastDay;
}

/**
 * Type guard to check if a value is a valid Date object.
 *
 * @param value - Value to check
 * @returns True if value is a valid Date object
 *
 * @example
 * if (isValidDate(myDate)) {
 *   console.log(formatUTCDate(myDate));
 * }
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Type-safe date conversion from unknown input.
 *
 * @param value - Value to convert to Date
 * @returns Date object or null if invalid
 *
 * @example
 * const date = toDate(userInput);
 * if (date) {
 *   console.log(formatUTCDate(date));
 * }
 */
export function toDate(value: unknown): Date | null {
  if (isValidDate(value)) {
    return value;
  }
  if (typeof value === 'string') {
    // Try parsing as UTC date first
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return parseUTCDate(value);
    }
    // Try general date parsing
    const parsed = new Date(value);
    return isValidDate(parsed) ? parsed : null;
  }
  if (typeof value === 'number') {
    const parsed = new Date(value);
    return isValidDate(parsed) ? parsed : null;
  }
  return null;
}

// Type definitions for better IDE support
export type DateString = string; // YYYY-MM-DD format
export type DateRange = { start: Date; end: Date };

/**
 * Common date range presets for quick filtering.
 */
export const DATE_PRESETS = {
  /** Today in UTC */
  today: () => parseUTCRange(getTodayUTC(), getTodayUTC()),

  /** Yesterday in UTC */
  yesterday: () => {
    const yesterday = addDaysUTC(new Date(), -1);
    const dateStr = formatUTCDate(yesterday);
    return parseUTCRange(dateStr, dateStr);
  },

  /** Last 7 days in UTC */
  last7Days: () => {
    const end = getTodayUTC();
    const start = formatUTCDate(addDaysUTC(new Date(), -6));
    return parseUTCRange(start, end);
  },

  /** Last 30 days in UTC */
  last30Days: () => {
    const end = getTodayUTC();
    const start = formatUTCDate(addDaysUTC(new Date(), -29));
    return parseUTCRange(start, end);
  },

  /** Current month in UTC */
  thisMonth: () => {
    const now = new Date();
    const start = formatUTCDate(getFirstDayOfMonthUTC(now));
    const end = formatUTCDate(getLastDayOfMonthUTC(now));
    return parseUTCRange(start, end);
  },

  /** Last month in UTC */
  lastMonth: () => {
    const now = new Date();
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const start = formatUTCDate(getFirstDayOfMonthUTC(lastMonth));
    const end = formatUTCDate(getLastDayOfMonthUTC(lastMonth));
    return parseUTCRange(start, end);
  },

  /** Year to date in UTC */
  yearToDate: () => {
    const now = new Date();
    const start = `${now.getUTCFullYear()}-01-01`;
    const end = getTodayUTC();
    return parseUTCRange(start, end);
  }
} as const;
