/**
 * Interest Calculator
 *
 * Calculates late payment interest on overdue invoices using the 30/360 day-count convention.
 *
 * DAY-COUNT CONVENTION: 30/360 (Bond Basis)
 * ==========================================
 *
 * This calculator uses the 30/360 day-count convention, where:
 * - Each month is assumed to have 30 days
 * - Each year is assumed to have 360 days (12 × 30)
 *
 * Why 30/360?
 * - Standard in commercial lending and wine industry trade credit
 * - Simpler to calculate manually (important for compliance transparency)
 * - Consistent month-to-month regardless of actual calendar days
 * - Widely accepted in Virginia commercial transactions
 *
 * Alternative Conventions (not currently used):
 * - Actual/365: Uses actual calendar days / 365-day year
 * - Actual/360: Uses actual calendar days / 360-day year
 * - Actual/Actual: Uses actual calendar days / actual year length
 *
 * Compliance Notes:
 * - This convention is displayed on all invoices
 * - Customers are notified of the calculation method in credit terms
 * - The method is consistent with Virginia ABC regulations
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 1.4
 * @see https://en.wikipedia.org/wiki/Day_count_convention
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Day-count convention type
 */
export type DayCountConvention = '30/360' | 'Actual/365' | 'Actual/360' | 'Actual/Actual';

/**
 * Active day-count convention for interest calculations
 *
 * Current: 30/360 (Bond Basis)
 * - 30 days per month
 * - 360 days per year
 * - Standard in commercial wine industry transactions
 */
export const DAY_COUNT_CONVENTION: DayCountConvention = '30/360';

/**
 * Virginia standard interest rate: 3% per month
 */
export const VA_INTEREST_RATE = new Decimal('0.03'); // 3% per month

/**
 * Calculate months overdue using specified day-count convention
 *
 * @param days - Number of days overdue
 * @param convention - Day-count convention to use
 * @returns Months overdue as Decimal
 *
 * @example
 * // 30/360 convention: 45 days = 1.5 months (45 / 30)
 * calculateMonthsOverdue(45, '30/360') // Returns: Decimal(1.5)
 *
 * @example
 * // Actual/365 convention: 45 days = 1.479 months (45 / 365 * 12)
 * calculateMonthsOverdue(45, 'Actual/365') // Returns: Decimal(1.4794...)
 */
function calculateMonthsOverdue(
  days: number,
  convention: DayCountConvention = DAY_COUNT_CONVENTION
): Decimal {
  switch (convention) {
    case '30/360':
      // 30/360: Assume 30 days per month
      return new Decimal(days).dividedBy(30);

    case 'Actual/365':
      // Actual/365: Convert days to years, then multiply by 12
      return new Decimal(days).dividedBy(365).times(12);

    case 'Actual/360':
      // Actual/360: Convert days to years (360-day), then multiply by 12
      return new Decimal(days).dividedBy(360).times(12);

    case 'Actual/Actual':
      // Actual/Actual: Use actual year length (365 or 366)
      const now = new Date();
      const daysInYear = isLeapYear(now.getFullYear()) ? 366 : 365;
      return new Decimal(days).dividedBy(daysInYear).times(12);

    default:
      // Fallback to 30/360
      return new Decimal(days).dividedBy(30);
  }
}

/**
 * Check if year is a leap year
 */
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Calculate interest on overdue invoice
 *
 * VA Law: 3% per month on unpaid balances
 * Day-Count Convention: 30/360 (Bond Basis)
 * - Each month = 30 days
 * - Each year = 360 days
 *
 * Calculation Method:
 * 1. Calculate days overdue (actual calendar days)
 * 2. Apply grace period if configured
 * 3. Convert to months using 30/360 convention
 * 4. Apply simple interest: I = P × r × t
 *
 * @param principal - Invoice amount owed
 * @param dueDate - Original due date
 * @param asOfDate - Date to calculate interest to (default: today)
 * @param monthlyRate - Monthly interest rate (default: 3%)
 * @param gracePeriodDays - Days before interest starts (default: 0)
 * @returns Interest calculation breakdown
 *
 * @example
 * const result = calculateOverdueInterest({
 *   principal: 1000,
 *   dueDate: new Date('2025-01-01'),
 *   asOfDate: new Date('2025-03-15'),
 *   monthlyRate: 0.03
 * });
 * // 73 days overdue = 2.43 months (73/30)
 * // Interest = $1000 × 0.03 × 2.43 = $73.00
 */
export function calculateOverdueInterest(params: {
  principal: number | Decimal;
  dueDate: Date;
  asOfDate?: Date;
  monthlyRate?: Decimal | number;
  gracePeriodDays?: number;
}): {
  interest: Decimal;
  daysOverdue: number;
  monthsOverdue: Decimal;
  effectiveRate: Decimal;
} {
  const {
    principal,
    dueDate,
    asOfDate = new Date(),
    monthlyRate = VA_INTEREST_RATE,
    gracePeriodDays = 0,
  } = params;

  const principalAmount = new Decimal(principal);
  const rate = new Decimal(monthlyRate);

  // Calculate days overdue
  const dueDateTime = new Date(dueDate).getTime();
  const asOfDateTime = new Date(asOfDate).getTime();
  const msPerDay = 1000 * 60 * 60 * 24;

  const daysOverdue = Math.max(0, Math.floor((asOfDateTime - dueDateTime) / msPerDay));

  // Apply grace period
  const chargeableDays = Math.max(0, daysOverdue - gracePeriodDays);

  if (chargeableDays === 0) {
    return {
      interest: new Decimal(0),
      daysOverdue,
      monthsOverdue: new Decimal(0),
      effectiveRate: new Decimal(0),
    };
  }

  // Calculate months using 30/360 day-count convention
  // Under 30/360: months = days / 30 (each month = 30 days, year = 360 days)
  const monthsOverdue = calculateMonthsOverdue(chargeableDays, DAY_COUNT_CONVENTION);

  // Simple interest calculation: Principal × Rate × Time
  // I = P × r × t
  // Where: I = interest, P = principal, r = monthly rate, t = time in months
  const interest = principalAmount.times(rate).times(monthsOverdue);

  return {
    interest,
    daysOverdue,
    monthsOverdue,
    effectiveRate: rate,
  };
}

/**
 * Calculate compound interest (if required)
 *
 * More accurate for long-term overdue invoices
 *
 * @param params - Interest calculation parameters
 * @returns Compound interest amount
 */
export function calculateCompoundInterest(params: {
  principal: number | Decimal;
  dueDate: Date;
  asOfDate?: Date;
  monthlyRate?: Decimal | number;
  gracePeriodDays?: number;
}): {
  interest: Decimal;
  totalAmount: Decimal;
  daysOverdue: number;
} {
  const {
    principal,
    dueDate,
    asOfDate = new Date(),
    monthlyRate = VA_INTEREST_RATE,
    gracePeriodDays = 0,
  } = params;

  const principalAmount = new Decimal(principal);
  const rate = new Decimal(monthlyRate);

  // Calculate chargeable months
  const simple = calculateOverdueInterest(params);

  if (simple.monthsOverdue.equals(0)) {
    return {
      interest: new Decimal(0),
      totalAmount: principalAmount,
      daysOverdue: simple.daysOverdue,
    };
  }

  // Compound interest formula: P(1 + r)^n - P
  const rateMultiplier = new Decimal(1).plus(rate);
  const compoundFactor = rateMultiplier.pow(simple.monthsOverdue.toNumber());
  const totalAmount = principalAmount.times(compoundFactor);
  const interest = totalAmount.minus(principalAmount);

  return {
    interest,
    totalAmount,
    daysOverdue: simple.daysOverdue,
  };
}

/**
 * Format interest rate for invoice display
 *
 * @param rate - Rate as decimal (e.g., 0.03)
 * @returns Formatted string (e.g., "3.0%")
 */
export function formatInterestRate(rate: Decimal | number): string {
  const decimal = new Decimal(rate);
  const percentage = decimal.times(100);
  return `${percentage.toFixed(1)}%`;
}

/**
 * Get day-count convention display text
 *
 * @param convention - Day-count convention
 * @returns Human-readable description of the convention
 */
export function getDayCountConventionText(
  convention: DayCountConvention = DAY_COUNT_CONVENTION
): string {
  switch (convention) {
    case '30/360':
      return 'Interest calculated using 30/360 day-count convention (30 days per month, 360 days per year)';
    case 'Actual/365':
      return 'Interest calculated using Actual/365 day-count convention (actual days, 365-day year)';
    case 'Actual/360':
      return 'Interest calculated using Actual/360 day-count convention (actual days, 360-day year)';
    case 'Actual/Actual':
      return 'Interest calculated using Actual/Actual day-count convention (actual days, actual year length)';
  }
}

/**
 * Get standard VA collection terms text
 *
 * Now includes explicit day-count convention for compliance transparency.
 *
 * @param interestRate - Monthly interest rate
 * @returns Legal collection terms text (includes day-count convention)
 */
export function getVACollectionTerms(interestRate: Decimal = VA_INTEREST_RATE): string {
  const rateFormatted = formatInterestRate(interestRate);
  const conventionText = getDayCountConventionText(DAY_COUNT_CONVENTION);

  return `Invoices shall be due and payable as stated on the face hereof. Extension of credit may be changed or withdrawn at any time. Unpaid invoices shall accrue interest at the rate of ${rateFormatted} per month. ${conventionText}. Upon failure to make such payments, customer shall be responsible for all cost and expense incurred by Well Crafted for collection, including court cost and attorney's fee.`;
}

/**
 * Get VA ABC compliance notice text
 *
 * @param isTaxExempt - Whether this is a tax-exempt invoice
 * @returns Compliance notice text
 */
export function getVAComplianceNotice(isTaxExempt: boolean): string {
  if (isTaxExempt) {
    return `THIS COPY MUST ACCOMPANY THE MERCHANDISE, BE SIGNED BY RETAILER AND RETURNED AT ONCE TO THE DISTRIBUTOR. A COPY OF ALL TAX-EXEMPT INVOICES ARE TO BE FORWARDED TO DEPARTMENT OF A.B.C. BY THE DISTRIBUTOR UPON COMPLETION OF THE SALE`;
  }

  return `THIS COPY MUST ACCOMPANY THE MERCHANDISE, BE SIGNED BY RETAILER AND RETURNED AT ONCE TO THE DISTRIBUTOR. A COPY OF ALL TAX EXEMPT INVOICES ARE TO BE FORWARDED TO THE DEPARTMENT OF ABC BY THE DISTRIBUTOR UPON COMPLETION OF THE SALE`;
}

/**
 * Calculate future balance with interest
 *
 * Useful for showing "if not paid by X date, balance will be Y"
 *
 * @param currentBalance - Current amount owed
 * @param dueDate - Original due date
 * @param futureDate - Date to project to
 * @param monthlyRate - Interest rate
 * @returns Projected balance
 */
export function projectFutureBalance(
  currentBalance: number | Decimal,
  dueDate: Date,
  futureDate: Date,
  monthlyRate: Decimal | number = VA_INTEREST_RATE
): Decimal {
  const compound = calculateCompoundInterest({
    principal: currentBalance,
    dueDate,
    asOfDate: futureDate,
    monthlyRate,
  });

  return compound.totalAmount;
}
