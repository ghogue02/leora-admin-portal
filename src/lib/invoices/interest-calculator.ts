/**
 * Interest Calculator
 *
 * Calculates late payment interest on overdue invoices
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Virginia standard interest rate: 3% per month
 */
export const VA_INTEREST_RATE = new Decimal('0.03'); // 3% per month

/**
 * Calculate interest on overdue invoice
 *
 * VA Law: 3% per month on unpaid balances
 * Typically calculated from due date, with optional grace period
 *
 * @param principal - Invoice amount owed
 * @param dueDate - Original due date
 * @param asOfDate - Date to calculate interest to (default: today)
 * @param monthlyRate - Monthly interest rate (default: 3%)
 * @param gracePeriodDays - Days before interest starts (default: 0)
 * @returns Interest amount
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

  // Calculate months (using 30 days per month for simplicity)
  const monthsOverdue = new Decimal(chargeableDays).dividedBy(30);

  // Simple interest calculation: Principal × Rate × Time
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
 * Get standard VA collection terms text
 *
 * @param interestRate - Monthly interest rate
 * @returns Legal collection terms text
 */
export function getVACollectionTerms(interestRate: Decimal = VA_INTEREST_RATE): string {
  const rateFormatted = formatInterestRate(interestRate);

  return `Invoices shall be due and payable as stated on the face hereof. Extension of credit may be changed or withdrawn at any time. Unpaid invoices shall accrue interest at the rate of ${rateFormatted} per month. Upon failure to make such payments, customer shall be responsible for all cost and expense incurred by Well Crafted for collection, including court cost and attorney's fee.`;
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
