/**
 * Case/Bottle Converter
 *
 * Handles conversion between cases and bottles for invoice line items
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert bottles to cases
 *
 * Supports fractional cases (e.g., 106 bottles / 12 per case = 8.83 cases)
 *
 * @param bottles - Number of bottles
 * @param bottlesPerCase - Bottles per case (from SKU.itemsPerCase)
 * @returns Number of cases as Decimal (may be fractional)
 */
export function bottlesToCases(
  bottles: number,
  bottlesPerCase: number | null
): Decimal {
  if (!bottlesPerCase || bottlesPerCase === 0) {
    // Default: 12 bottles per case for wine
    bottlesPerCase = 12;
  }

  const bottleCount = new Decimal(bottles);
  const casesCount = bottleCount.dividedBy(bottlesPerCase);

  return casesCount;
}

/**
 * Convert cases to bottles
 *
 * @param cases - Number of cases (may be fractional)
 * @param bottlesPerCase - Bottles per case
 * @returns Total number of bottles
 */
export function casesToBottles(
  cases: number | Decimal,
  bottlesPerCase: number | null
): number {
  if (!bottlesPerCase || bottlesPerCase === 0) {
    bottlesPerCase = 12; // Default
  }

  const caseCount = new Decimal(cases);
  const bottleCount = caseCount.times(bottlesPerCase);

  return bottleCount.toNumber();
}

/**
 * Format cases for invoice display
 *
 * Shows fractional cases to 2 decimal places
 *
 * @param cases - Number of cases as Decimal
 * @returns Formatted string (e.g., "8.83", "15.00")
 */
export function formatCasesForInvoice(cases: Decimal | number | null): string {
  if (cases === null || cases === undefined) {
    return '0.00';
  }

  const decimal = new Decimal(cases);
  return decimal.toFixed(2);
}

/**
 * Calculate both cases and bottles from quantity
 *
 * Useful for invoices that show both (like Cask & Cork format)
 *
 * @param quantity - Number of bottles ordered
 * @param bottlesPerCase - Bottles per case from SKU
 * @returns Object with cases and bottles
 */
export function calculateCasesAndBottles(
  quantity: number,
  bottlesPerCase: number | null
): {
  cases: Decimal;
  bottles: number;
  fullCases: number;
  partialBottles: number;
} {
  const cases = bottlesToCases(quantity, bottlesPerCase);
  const perCase = bottlesPerCase || 12;

  const fullCases = Math.floor(quantity / perCase);
  const partialBottles = quantity % perCase;

  return {
    cases,
    bottles: quantity,
    fullCases,
    partialBottles,
  };
}

/**
 * Determine if a quantity should be displayed as cases or bottles
 *
 * Rules:
 * - Full cases only: show as cases
 * - Fractional: show both cases and bottles
 * - Less than 1 case: show as bottles only
 *
 * @param quantity - Number of bottles
 * @param bottlesPerCase - Bottles per case
 * @returns Display recommendation
 */
export function getDisplayFormat(
  quantity: number,
  bottlesPerCase: number | null
): {
  showCases: boolean;
  showBottles: boolean;
  cases: Decimal;
  bottles: number;
} {
  const { cases, bottles, fullCases, partialBottles } = calculateCasesAndBottles(quantity, bottlesPerCase);

  // Less than one full case: bottles only
  if (fullCases === 0) {
    return {
      showCases: false,
      showBottles: true,
      cases,
      bottles,
    };
  }

  // Exact full cases: show cases (or both depending on format)
  if (partialBottles === 0) {
    return {
      showCases: true,
      showBottles: true, // VA formats show both
      cases,
      bottles,
    };
  }

  // Fractional cases: show both
  return {
    showCases: true,
    showBottles: true,
    cases,
    bottles,
  };
}
