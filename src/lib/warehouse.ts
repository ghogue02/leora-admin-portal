/**
 * Warehouse Utility Library
 * Handles warehouse location calculations and pickOrder generation
 */

export interface LocationComponents {
  aisle: number;
  row: number;
  shelf: number;
}

export interface LocationParseResult {
  success: boolean;
  components?: LocationComponents;
  pickOrder?: number;
  error?: string;
}

/**
 * Extract numeric value from a location component string
 * Handles formats like: "A3", "Aisle-10", "R5", "Row-2B", "S12", "Shelf-7"
 *
 * @param value - The location component string
 * @returns The numeric value or null if invalid
 */
export function extractNumber(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Remove common prefixes but preserve sign
  let cleaned = value
    .trim()
    .replace(/^(aisle|row|shelf)[-_\s]*/i, '');

  // Check for negative sign
  const isNegative = cleaned.startsWith('-');

  // Remove all non-digits
  cleaned = cleaned.replace(/[^0-9]/g, '');

  if (cleaned === '') {
    return null;
  }

  let num = parseInt(cleaned, 10);
  if (isNaN(num)) {
    return null;
  }

  // Apply negative sign if present
  if (isNegative) {
    num = -num;
  }

  return num;
}

/**
 * Parse a location string into components
 * Supports multiple formats:
 * - "A3-R2-S5" (aisle-row-shelf)
 * - "Aisle 3, Row 2, Shelf 5"
 * - "A3/R2/S5"
 * - Object with aisle, row, shelf properties
 *
 * @param location - Location string or object
 * @returns LocationParseResult with parsed components
 */
export function parseLocation(
  location: string | { aisle?: string; row?: string; shelf?: string } | null | undefined
): LocationParseResult {
  if (!location) {
    return {
      success: false,
      error: 'Location is required',
    };
  }

  let aisle: number | null = null;
  let row: number | null = null;
  let shelf: number | null = null;

  // Handle object format (for future schema with separate fields)
  if (typeof location === 'object') {
    aisle = extractNumber(location.aisle);
    row = extractNumber(location.row);
    shelf = extractNumber(location.shelf);
  } else if (typeof location === 'string') {
    // Handle string formats
    const cleaned = location.trim();

    // Try delimiter-based parsing first (A3-R2-S5, A3/R2/S5, etc.)
    const delimiters = ['-', '/', '|', ','];
    for (const delimiter of delimiters) {
      if (cleaned.includes(delimiter)) {
        const parts = cleaned.split(delimiter).map(p => p.trim());
        if (parts.length === 3) {
          aisle = extractNumber(parts[0]);
          row = extractNumber(parts[1]);
          shelf = extractNumber(parts[2]);
          break;
        }
      }
    }

    // If delimiter parsing didn't work, try word-based parsing
    if (aisle === null || row === null || shelf === null) {
      const aisleMatch = cleaned.match(/(?:aisle|a)[\s:-]*(\d+)/i);
      const rowMatch = cleaned.match(/(?:row|r)[\s:-]*(\d+)/i);
      const shelfMatch = cleaned.match(/(?:shelf|s)[\s:-]*(\d+)/i);

      if (aisleMatch) aisle = parseInt(aisleMatch[1], 10);
      if (rowMatch) row = parseInt(rowMatch[1], 10);
      if (shelfMatch) shelf = parseInt(shelfMatch[1], 10);
    }
  }

  // Validate all components are present and valid
  if (aisle === null || row === null || shelf === null) {
    return {
      success: false,
      error: 'Unable to parse location components (aisle, row, shelf)',
    };
  }

  if (aisle < 0 || row < 0 || shelf < 0) {
    return {
      success: false,
      error: 'Location components must be non-negative numbers',
    };
  }

  if (aisle > 999 || row > 99 || shelf > 99) {
    return {
      success: false,
      error: 'Location components exceed maximum values (aisle: 999, row: 99, shelf: 99)',
    };
  }

  const components: LocationComponents = { aisle, row, shelf };
  const pickOrder = calculatePickOrder(components);

  return {
    success: true,
    components,
    pickOrder,
  };
}

/**
 * Calculate pickOrder from location components
 * Formula: (aisle * 10000) + (row * 100) + shelf
 * This creates a natural sorting order for warehouse picking efficiency
 *
 * Examples:
 * - A1-R1-S1 = 10101
 * - A1-R2-S3 = 10203
 * - A10-R5-S12 = 100512
 *
 * @param components - Location components (aisle, row, shelf)
 * @returns Calculated pickOrder value
 */
export function calculatePickOrder(
  components: LocationComponents | { aisle: string; row: string; shelf: string }
): number {
  let aisle: number;
  let row: number;
  let shelf: number;

  // Handle both numeric and string inputs
  if (typeof components.aisle === 'string') {
    const parsed = parseLocation(components as any);
    if (!parsed.success || !parsed.pickOrder) {
      throw new Error(parsed.error || 'Invalid location components');
    }
    return parsed.pickOrder;
  }

  aisle = components.aisle;
  row = components.row;
  shelf = components.shelf;

  // Validate inputs
  if (
    typeof aisle !== 'number' ||
    typeof row !== 'number' ||
    typeof shelf !== 'number'
  ) {
    throw new Error('Location components must be numbers');
  }

  if (aisle < 0 || row < 0 || shelf < 0) {
    throw new Error('Location components must be non-negative');
  }

  if (aisle > 999 || row > 99 || shelf > 99) {
    throw new Error(
      'Location components exceed maximum values (aisle: 999, row: 99, shelf: 99)'
    );
  }

  return aisle * 10000 + row * 100 + shelf;
}

/**
 * Validate a location string or object
 *
 * @param location - Location to validate
 * @returns true if valid, false otherwise
 */
export function isValidLocation(
  location: string | { aisle?: string; row?: string; shelf?: string } | null | undefined
): boolean {
  const result = parseLocation(location);
  return result.success;
}

/**
 * Format location components into a standardized string
 *
 * @param components - Location components
 * @returns Formatted location string (e.g., "A3-R2-S5")
 */
export function formatLocation(components: LocationComponents): string {
  return `A${components.aisle}-R${components.row}-S${components.shelf}`;
}
