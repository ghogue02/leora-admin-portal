/**
 * SAGE Invoice Export - Payment Terms Calculation Engine
 *
 * @module lib/sage/payment-terms
 * @description Calculates invoice due dates based on customer payment terms for SAGE accounting export.
 *              Logic extracted from Excel macro used by Wellcrafted Wine & Beverage Co.
 *
 * @see /docs/SAGE_PAYMENT_TERMS.md - Complete business logic documentation
 * @version 1.0.0
 * @lastUpdated 2025-11-05
 */

/**
 * Supported payment term types in the system
 *
 * Distribution across customers (98 total):
 * - C.O.D.: 51 customers
 * - Net 30 Days: 29 customers
 * - Net 15th of Next Month: 14 customers
 * - Net 30th of Next Month: 2 customers
 * - Net 32 Days: 1 customer
 * - Net 45 Days: 1 customer
 */
export type PaymentTerms =
  | 'C.O.D.'
  | 'Net 30 Days'
  | 'Net 15th of Next Month'
  | 'Net 30th of Next Month'
  | 'Net 32 Days'
  | 'Net 45 Days';

/**
 * All valid payment term strings (includes variations and aliases)
 */
export const VALID_PAYMENT_TERMS: readonly PaymentTerms[] = [
  'C.O.D.',
  'Net 30 Days',
  'Net 15th of Next Month',
  'Net 30th of Next Month',
  'Net 32 Days',
  'Net 45 Days',
] as const;

/**
 * Canonicalize a payment term string for lookup comparisons.
 */
function canonicalizePaymentTerm(terms: string): string {
  return terms
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const CANONICAL_TERM_LOOKUP: Record<string, PaymentTerms> = VALID_PAYMENT_TERMS.reduce(
  (acc, term) => {
    acc[canonicalizePaymentTerm(term)] = term;
    return acc;
  },
  {} as Record<string, PaymentTerms>
);

const PAYMENT_TERM_ALIASES: Record<string, PaymentTerms> = {
  'net 30': 'Net 30 Days',
  'net30': 'Net 30 Days',
  'net 30day': 'Net 30 Days',
  'net30day': 'Net 30 Days',
  'net30days': 'Net 30 Days',
  'net30 days': 'Net 30 Days',
  'net thirty': 'Net 30 Days',
  'net thirty days': 'Net 30 Days',
  'cod': 'C.O.D.',
  'c o d': 'C.O.D.',
  'c.o.d': 'C.O.D.',
  'cash on delivery': 'C.O.D.',
};

/**
 * Normalize a payment term string to a canonical value, if possible.
 */
export function normalizePaymentTerms(paymentTerms: string | null | undefined): PaymentTerms | null {
  if (!paymentTerms || typeof paymentTerms !== 'string') {
    return null;
  }

  const trimmed = paymentTerms.trim();
  if (!trimmed) {
    return null;
  }

  if ((VALID_PAYMENT_TERMS as readonly string[]).includes(trimmed)) {
    return trimmed as PaymentTerms;
  }

  const canonical = canonicalizePaymentTerm(trimmed);

  if (CANONICAL_TERM_LOOKUP[canonical]) {
    return CANONICAL_TERM_LOOKUP[canonical];
  }

  if (PAYMENT_TERM_ALIASES[canonical]) {
    return PAYMENT_TERM_ALIASES[canonical];
  }

  return null;
}

/**
 * Result of due date calculation with metadata
 */
export interface DueDateResult {
  /** Calculated due date */
  dueDate: Date;
  /** Payment terms that were applied */
  paymentTerms: string;
  /** Invoice date used for calculation */
  invoiceDate: Date;
  /** Whether an unknown term was encountered and defaulted */
  isDefaulted: boolean;
  /** Number of days from invoice to due date */
  daysUntilDue: number;
}

/**
 * Validation error for invalid input
 */
export class PaymentTermsError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_DATE' | 'INVALID_TERMS' | 'CALCULATION_ERROR',
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PaymentTermsError';
  }
}

/**
 * Validates that a date is valid and not in the distant past/future
 *
 * @param date - Date to validate
 * @throws {PaymentTermsError} If date is invalid
 */
function validateDate(date: Date): void {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new PaymentTermsError(
      'Invalid date provided',
      'INVALID_DATE',
      { providedDate: date }
    );
  }

  // Sanity check: date should be between 2000-2100
  const year = date.getFullYear();
  if (year < 2000 || year > 2100) {
    throw new PaymentTermsError(
      `Date year ${year} is outside reasonable range (2000-2100)`,
      'INVALID_DATE',
      { date: date.toISOString(), year }
    );
  }
}

/**
 * Checks if a payment term string is recognized
 *
 * @param paymentTerms - Payment terms to check
 * @returns True if the payment term is valid
 */
export function isValidPaymentTerm(paymentTerms: string): boolean {
  return normalizePaymentTerms(paymentTerms) !== null;
}

/**
 * Calculates the number of days between two dates
 *
 * @param start - Start date
 * @param end - End date
 * @returns Number of days between dates (can be negative)
 */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

/**
 * Calculates invoice due date based on payment terms
 *
 * This is the core business logic for SAGE export. Each customer has an assigned
 * payment term that determines when their invoice payment is due.
 *
 * @param invoiceDate - The date the invoice was issued
 * @param paymentTerms - Customer's payment terms (must match exactly)
 * @returns Due date for the invoice
 *
 * @throws {PaymentTermsError} If invoice date is invalid
 * @throws {PaymentTermsError} If due date calculation fails
 *
 * @example
 * ```typescript
 * // C.O.D. customer - pay immediately
 * const due1 = calculateDueDate(new Date('2025-11-05'), 'C.O.D.');
 * // Returns: 2025-11-05 (same day)
 *
 * // Net 30 Days customer - pay within 30 days
 * const due2 = calculateDueDate(new Date('2025-11-05'), 'Net 30 Days');
 * // Returns: 2025-12-05 (30 days later)
 *
 * // DC customer - pay by 15th of next month
 * const due3 = calculateDueDate(new Date('2025-11-05'), 'Net 15th of Next Month');
 * // Returns: 2025-12-15 (15th of December)
 *
 * // Month-end customer - pay by last day of next month
 * const due4 = calculateDueDate(new Date('2025-01-15'), 'Net 30th of Next Month');
 * // Returns: 2025-02-28 (last day of February, handles leap years)
 * ```
 */
export function calculateDueDate(
  invoiceDate: Date,
  paymentTerms: string
): Date {
  // Validate inputs
  validateDate(invoiceDate);

  if (!paymentTerms || typeof paymentTerms !== 'string') {
    throw new PaymentTermsError(
      'Payment terms must be a non-empty string',
      'INVALID_TERMS',
      { paymentTerms }
    );
  }

  const trimmedTerms = paymentTerms.trim();
  const normalizedTerms = normalizePaymentTerms(trimmedTerms);

  try {
    if (!normalizedTerms) {
      console.warn(
        `Unknown payment terms: "${trimmedTerms}". Defaulting to same-day payment (C.O.D.). ` +
        `Valid terms: ${VALID_PAYMENT_TERMS.join(', ')}`
      );
      return new Date(invoiceDate);
    }

    // C.O.D. - Cash on Delivery
    // Due immediately (same day as invoice)
    // Used by: 51 customers (mostly Virginia locations)
    if (normalizedTerms === 'C.O.D.') {
      return new Date(invoiceDate);
    }

    // Net 30 Days - Standard 30-day terms
    // Add 30 calendar days to invoice date
    // Used by: 29 customers
    if (normalizedTerms === 'Net 30 Days') {
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);
      return dueDate;
    }

    // Net 15th of Next Month - DC standard terms
    // Due on the 15th of the month following the invoice
    // Used by: 14 customers (primarily DC locations)
    // Example: Invoice 11/05 → Due 12/15
    if (normalizedTerms === 'Net 15th of Next Month') {
      const dueDate = new Date(invoiceDate);
      dueDate.setMonth(dueDate.getMonth() + 1); // Next month
      dueDate.setDate(15); // 15th day
      return dueDate;
    }

    // Net 30th of Next Month - Month-end terms
    // Due on last day of the month following the invoice
    // Used by: 2 customers
    // Handles variable month lengths (Feb 28/29, Apr/Jun/Sep/Nov 30, others 31)
    // Example: Invoice 01/15 → Due 02/28 (or 02/29 in leap year)
    if (normalizedTerms === 'Net 30th of Next Month') {
      const dueDate = new Date(invoiceDate);
      dueDate.setMonth(dueDate.getMonth() + 2); // Month after next
      dueDate.setDate(0); // Day 0 = last day of previous month (i.e., next month)
      return dueDate;
    }

    // Net 32 Days - Extended 32-day terms
    // Add 32 calendar days to invoice date
    // Used by: 1 customer (101 Baltimore)
    if (normalizedTerms === 'Net 32 Days') {
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 32);
      return dueDate;
    }

    // Net 45 Days - Extended 45-day terms
    // Add 45 calendar days to invoice date
    // Used by: 1 customer
    if (normalizedTerms === 'Net 45 Days') {
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 45);
      return dueDate;
    }

  } catch (error) {
    // Catch any date manipulation errors
    throw new PaymentTermsError(
      `Failed to calculate due date: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CALCULATION_ERROR',
      { invoiceDate: invoiceDate.toISOString(), paymentTerms, error }
    );
  }
}

/**
 * Calculates due date with extended metadata
 *
 * Provides additional information about the calculation including whether
 * the payment terms were defaulted and the number of days until payment is due.
 *
 * @param invoiceDate - The date the invoice was issued
 * @param paymentTerms - Customer's payment terms
 * @returns Result object with due date and metadata
 *
 * @example
 * ```typescript
 * const result = calculateDueDateWithMetadata(
 *   new Date('2025-11-05'),
 *   'Net 30 Days'
 * );
 *
 * console.log(result);
 * // {
 * //   dueDate: Date(2025-12-05),
 * //   paymentTerms: 'Net 30 Days',
 * //   invoiceDate: Date(2025-11-05),
 * //   isDefaulted: false,
 * //   daysUntilDue: 30
 * // }
 * ```
 */
export function calculateDueDateWithMetadata(
  invoiceDate: Date,
  paymentTerms: string
): DueDateResult {
  const normalizedTerms = normalizePaymentTerms(paymentTerms);
  const terms = normalizedTerms ?? paymentTerms.trim();
  const isDefaulted = !normalizedTerms;
  const dueDate = calculateDueDate(invoiceDate, paymentTerms);
  const daysUntilDue = daysBetween(invoiceDate, dueDate);

  return {
    dueDate,
    paymentTerms: terms,
    invoiceDate: new Date(invoiceDate),
    isDefaulted,
    daysUntilDue,
  };
}

/**
 * Formats a date for SAGE export (MM/DD/YYYY)
 *
 * SAGE requires dates in MM/DD/YYYY format, not ISO format.
 *
 * @param date - Date to format
 * @returns Date string in MM/DD/YYYY format
 *
 * @example
 * ```typescript
 * formatDateForSage(new Date('2025-11-05'));
 * // Returns: "11/5/2025"
 *
 * formatDateForSage(new Date('2025-01-09'));
 * // Returns: "1/9/2025"
 * ```
 */
export function formatDateForSage(date: Date): string {
  validateDate(date);

  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getDate();
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Validates customer payment terms before processing
 *
 * Should be called before attempting SAGE export to ensure all customers
 * have valid payment terms configured.
 *
 * @param paymentTerms - Payment terms to validate
 * @returns Validation result with error details if invalid
 *
 * @example
 * ```typescript
 * const validation = validatePaymentTerms('Net 30 Days');
 * if (!validation.valid) {
 *   console.error(validation.error);
 * }
 * ```
 */
export function validatePaymentTerms(paymentTerms: string): {
  valid: boolean;
  error?: string;
  suggestion?: string;
} {
  if (!paymentTerms) {
    return {
      valid: false,
      error: 'Payment terms are required',
      suggestion: 'Assign payment terms to customer (default: C.O.D.)',
    };
  }

  const normalized = normalizePaymentTerms(paymentTerms);

  if (!normalized) {
    return {
      valid: false,
      error: `Invalid payment terms: "${paymentTerms.trim()}"`,
      suggestion: `Valid terms: ${VALID_PAYMENT_TERMS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Get payment term statistics for reporting
 *
 * @returns Object with counts and percentages for each payment term type
 */
export function getPaymentTermsStats(): Record<PaymentTerms, { count: number; percentage: string }> {
  return {
    'C.O.D.': { count: 51, percentage: '52.0%' },
    'Net 30 Days': { count: 29, percentage: '29.6%' },
    'Net 15th of Next Month': { count: 14, percentage: '14.3%' },
    'Net 30th of Next Month': { count: 2, percentage: '2.0%' },
    'Net 32 Days': { count: 1, percentage: '1.0%' },
    'Net 45 Days': { count: 1, percentage: '1.0%' },
  };
}

// ============================================================================
// UNIT TEST EXAMPLES
// ============================================================================
//
// These examples should be moved to __tests__/sage/payment-terms.test.ts
//
// import { describe, test, expect } from '@jest/globals';
// import { calculateDueDate, formatDateForSage, PaymentTermsError } from './payment-terms';
//
// describe('calculateDueDate', () => {
//   test('C.O.D. - same day payment', () => {
//     const invoice = new Date('2025-11-05');
//     const due = calculateDueDate(invoice, 'C.O.D.');
//     expect(due.toISOString()).toBe(new Date('2025-11-05').toISOString());
//   });
//
//   test('Net 30 Days - adds 30 days', () => {
//     const invoice = new Date('2025-11-05');
//     const due = calculateDueDate(invoice, 'Net 30 Days');
//     expect(due.toISOString()).toBe(new Date('2025-12-05').toISOString());
//   });
//
//   test('Net 15th of Next Month - DC standard', () => {
//     const invoice = new Date('2025-11-05');
//     const due = calculateDueDate(invoice, 'Net 15th of Next Month');
//     expect(due.toISOString()).toBe(new Date('2025-12-15').toISOString());
//   });
//
//   test('Net 30th of Next Month - February leap year', () => {
//     const invoice = new Date('2024-01-15');
//     const due = calculateDueDate(invoice, 'Net 30th of Next Month');
//     expect(due.toISOString()).toBe(new Date('2024-02-29').toISOString());
//   });
//
//   test('Net 30th of Next Month - February non-leap year', () => {
//     const invoice = new Date('2025-01-15');
//     const due = calculateDueDate(invoice, 'Net 30th of Next Month');
//     expect(due.toISOString()).toBe(new Date('2025-02-28').toISOString());
//   });
//
//   test('Net 30th of Next Month - September (30 days)', () => {
//     const invoice = new Date('2025-08-20');
//     const due = calculateDueDate(invoice, 'Net 30th of Next Month');
//     expect(due.toISOString()).toBe(new Date('2025-09-30').toISOString());
//   });
//
//   test('Net 32 Days - adds 32 days', () => {
//     const invoice = new Date('2025-11-05');
//     const due = calculateDueDate(invoice, 'Net 32 Days');
//     expect(due.toISOString()).toBe(new Date('2025-12-07').toISOString());
//   });
//
//   test('Net 45 Days - adds 45 days', () => {
//     const invoice = new Date('2025-11-05');
//     const due = calculateDueDate(invoice, 'Net 45 Days');
//     expect(due.toISOString()).toBe(new Date('2025-12-20').toISOString());
//   });
//
//   test('Unknown payment terms - defaults to same day with warning', () => {
//     const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
//     const invoice = new Date('2025-11-05');
//     const due = calculateDueDate(invoice, 'Unknown Terms');
//
//     expect(due.toISOString()).toBe(invoice.toISOString());
//     expect(consoleWarnSpy).toHaveBeenCalledWith(
//       expect.stringContaining('Unknown payment terms: "Unknown Terms"')
//     );
//
//     consoleWarnSpy.mockRestore();
//   });
//
//   test('Invalid date - throws PaymentTermsError', () => {
//     expect(() => {
//       calculateDueDate(new Date('invalid'), 'C.O.D.');
//     }).toThrow(PaymentTermsError);
//   });
//
//   test('Empty payment terms - throws PaymentTermsError', () => {
//     expect(() => {
//       calculateDueDate(new Date('2025-11-05'), '');
//     }).toThrow(PaymentTermsError);
//   });
//
//   test('Date outside reasonable range - throws PaymentTermsError', () => {
//     expect(() => {
//       calculateDueDate(new Date('1999-01-01'), 'C.O.D.');
//     }).toThrow(PaymentTermsError);
//   });
// });
//
// describe('formatDateForSage', () => {
//   test('formats date as MM/D/YYYY', () => {
//     const date = new Date('2025-11-05');
//     expect(formatDateForSage(date)).toBe('11/5/2025');
//   });
//
//   test('handles single-digit month', () => {
//     const date = new Date('2025-01-09');
//     expect(formatDateForSage(date)).toBe('1/9/2025');
//   });
//
//   test('handles double-digit day', () => {
//     const date = new Date('2025-12-25');
//     expect(formatDateForSage(date)).toBe('12/25/2025');
//   });
// });
// ============================================================================
