/**
 * Order classification helpers for SAGE exports.
 *
 * Determines whether an order should flow through the standard invoice export,
 * be treated as a sample/inventory adjustment, or be excluded entirely
 * (e.g., storage customers that should never enter SAGE).
 */

export enum SageOrderCategory {
  STANDARD = 'STANDARD',
  SAMPLE = 'SAMPLE',
  STORAGE = 'STORAGE',
}

export interface SageOrderForClassification {
  customer?: {
    name?: string | null;
  } | null;
  lines?: Array<{
    quantity?: number | null;
    unitPrice?: number | string | null;
    isSample?: boolean | null;
  }> | null;
}

const STORAGE_PREFIX = /^RIO-/i;
const SAMPLE_NAME_PATTERN = /sample/i;

const ZERO_PRICE_EPSILON = 0.0001;

/**
 * Convert a unit price value (Decimal, string, number) to a normalized number.
 */
function normalizeUnitPrice(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && 'toString' in (value as Record<string, unknown>)) {
    const str = String(value);
    const parsed = Number(str);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Detect whether every line in the order is effectively a sample line.
 */
function linesLookLikeSamples(
  lines: SageOrderForClassification['lines']
): boolean {
  if (!lines || lines.length === 0) {
    return false;
  }

  let hasAtLeastOneLine = false;
  for (const line of lines) {
    if (!line) continue;
    hasAtLeastOneLine = true;

    const price = normalizeUnitPrice(line.unitPrice);
    const isZeroPriced = Math.abs(price) < ZERO_PRICE_EPSILON;
    const flaggedSample = Boolean(line.isSample);

    if (!isZeroPriced && !flaggedSample) {
      return false;
    }
  }

  return hasAtLeastOneLine;
}

/**
 * Classify an order for downstream export handling.
 */
export function classifyOrderForExport(
  order: SageOrderForClassification
): SageOrderCategory {
  const customerName = order.customer?.name?.trim() ?? '';

  if (customerName && STORAGE_PREFIX.test(customerName)) {
    return SageOrderCategory.STORAGE;
  }

  const looksLikeSampleByName = SAMPLE_NAME_PATTERN.test(customerName);
  const looksLikeSampleByLines = linesLookLikeSamples(order.lines);

  if (looksLikeSampleByName || looksLikeSampleByLines) {
    return SageOrderCategory.SAMPLE;
  }

  return SageOrderCategory.STANDARD;
}

/**
 * Helper predicates for readability.
 */
export function isSampleOrder(order: SageOrderForClassification): boolean {
  return classifyOrderForExport(order) === SageOrderCategory.SAMPLE;
}

export function isStorageOrder(order: SageOrderForClassification): boolean {
  return classifyOrderForExport(order) === SageOrderCategory.STORAGE;
}
