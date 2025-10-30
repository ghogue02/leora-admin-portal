/**
 * Liter Calculator
 *
 * Handles conversion between bottle sizes and liters for invoice calculations
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Parse bottle size string to liters
 *
 * Handles various formats:
 * - "0.750" (already in liters)
 * - "750ml" or "750 ml"
 * - "1.5L" or "1.5 L"
 * - "375ml"
 *
 * @param sizeString - Bottle size as string
 * @returns Size in liters as Decimal
 */
export function parseBottleSizeToLiters(sizeString: string | null): Decimal {
  if (!sizeString) {
    return new Decimal(0.75); // Default: 750ml standard wine bottle
  }

  const normalized = sizeString.toLowerCase().trim();

  // Already in liters (e.g., "0.750", "1.5")
  if (/^\d+\.?\d*$/.test(normalized)) {
    return new Decimal(normalized);
  }

  // ML format (e.g., "750ml", "750 ml", "1500ml")
  const mlMatch = normalized.match(/^(\d+\.?\d*)\s*ml?$/);
  if (mlMatch) {
    const ml = new Decimal(mlMatch[1]);
    return ml.dividedBy(1000); // Convert ml to liters
  }

  // Liter format (e.g., "1.5L", "1.5 L")
  const literMatch = normalized.match(/^(\d+\.?\d*)\s*l$/);
  if (literMatch) {
    return new Decimal(literMatch[1]);
  }

  // Can't parse - return default 750ml
  console.warn(`Could not parse bottle size: "${sizeString}", using default 0.75L`);
  return new Decimal(0.75);
}

/**
 * Calculate total liters for a line item
 *
 * @param quantity - Number of bottles
 * @param bottleSize - Size per bottle
 * @returns Total liters
 */
export function calculateLineItemLiters(
  quantity: number,
  bottleSize: string | null
): Decimal {
  const litersPerBottle = parseBottleSizeToLiters(bottleSize);
  return litersPerBottle.times(quantity);
}

/**
 * Calculate total liters for an entire invoice
 *
 * @param lineItems - Array of line items with quantity and bottle size
 * @returns Total liters across all line items
 */
export function calculateInvoiceTotalLiters(
  lineItems: Array<{
    quantity: number;
    bottleSize: string | null;
    totalLiters?: Decimal | null;
  }>
): Decimal {
  return lineItems.reduce((total, line) => {
    // Use pre-calculated totalLiters if available
    if (line.totalLiters) {
      return total.plus(line.totalLiters);
    }

    // Otherwise calculate from quantity and bottle size
    const lineLiters = calculateLineItemLiters(line.quantity, line.bottleSize);
    return total.plus(lineLiters);
  }, new Decimal(0));
}

/**
 * Format liters for display on invoice
 *
 * @param liters - Liter amount as Decimal
 * @param decimalPlaces - Number of decimal places (default: 3)
 * @returns Formatted string (e.g., "858.000")
 */
export function formatLitersForInvoice(
  liters: Decimal | number | null,
  decimalPlaces: number = 3
): string {
  if (liters === null || liters === undefined) {
    return '0.000';
  }

  const decimal = new Decimal(liters);
  return decimal.toFixed(decimalPlaces);
}

/**
 * Convert liters to gallons (US)
 *
 * Useful for some state reporting requirements
 *
 * @param liters - Amount in liters
 * @returns Amount in US gallons
 */
export function litersToGallons(liters: Decimal | number): Decimal {
  const literDecimal = new Decimal(liters);
  const gallonsPerLiter = new Decimal('0.264172'); // 1 liter = 0.264172 US gallons
  return literDecimal.times(gallonsPerLiter);
}

/**
 * Calculate total liters from cases
 *
 * @param cases - Number of cases
 * @param bottlesPerCase - Bottles per case
 * @param bottleSize - Size per bottle
 * @returns Total liters
 */
export function calculateLitersFromCases(
  cases: number | Decimal,
  bottlesPerCase: number,
  bottleSize: string | null
): Decimal {
  const caseCount = new Decimal(cases);
  const totalBottles = caseCount.times(bottlesPerCase);
  const litersPerBottle = parseBottleSizeToLiters(bottleSize);

  return totalBottles.times(litersPerBottle);
}
