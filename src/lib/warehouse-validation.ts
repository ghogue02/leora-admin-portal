/**
 * Warehouse Validation Utilities
 * Handles location validation, occupancy checks, and optimization
 */

import { calculatePickOrder, parseLocation, LocationComponents } from './warehouse';

export interface WarehouseConfig {
  aisleCount: number; // Number of aisles (e.g., 26 for A-Z)
  rowsPerAisle: number; // Number of rows per aisle (e.g., 25)
  shelfLevels: string[]; // Shelf level names (e.g., ['Top', 'Middle', 'Bottom'])
  pickStrategy: 'aisle_then_row' | 'zone_based' | 'optimize_by_frequency';
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  pickOrder?: number;
}

export interface Location {
  aisle: string;
  row: string;
  shelf: string;
  bin?: string;
}

export interface InventoryLocation extends Location {
  sku: string;
  quantity: number;
}

// Default warehouse configuration
export const DEFAULT_WAREHOUSE_CONFIG: WarehouseConfig = {
  aisleCount: 26, // A-Z
  rowsPerAisle: 25,
  shelfLevels: ['Top', 'Middle', 'Bottom'],
  pickStrategy: 'aisle_then_row',
};

/**
 * Convert aisle letter to numeric value (A=1, B=2, etc.)
 */
export function aisleLetterToNumber(aisle: string): number {
  const cleaned = aisle.trim().toUpperCase();
  const code = cleaned.charCodeAt(0);
  if (code >= 65 && code <= 90) {
    return code - 64; // A=1, B=2, etc.
  }
  // Try to extract number if format is "Aisle-3"
  const num = parseInt(cleaned.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Convert aisle number to letter (1=A, 2=B, etc.)
 */
export function aisleNumberToLetter(num: number): string {
  if (num < 1 || num > 26) return '';
  return String.fromCharCode(64 + num);
}

/**
 * Convert shelf name to numeric value
 */
export function shelfNameToNumber(shelf: string, config: WarehouseConfig = DEFAULT_WAREHOUSE_CONFIG): number {
  const index = config.shelfLevels.findIndex(
    level => level.toLowerCase() === shelf.toLowerCase()
  );
  return index >= 0 ? index + 1 : parseInt(shelf, 10) || 0;
}

/**
 * Convert shelf number to name
 */
export function shelfNumberToName(num: number, config: WarehouseConfig = DEFAULT_WAREHOUSE_CONFIG): string {
  const index = num - 1;
  return config.shelfLevels[index] || `Shelf ${num}`;
}

/**
 * Validate a location against warehouse configuration
 */
export function validateLocation(
  aisle: string,
  row: string,
  shelf: string,
  config: WarehouseConfig = DEFAULT_WAREHOUSE_CONFIG
): ValidationResult {
  // Convert aisle to number
  const aisleNum = aisleLetterToNumber(aisle);
  if (aisleNum < 1 || aisleNum > config.aisleCount) {
    return {
      valid: false,
      error: `Aisle must be between A and ${aisleNumberToLetter(config.aisleCount)}`,
    };
  }

  // Validate row
  const rowNum = parseInt(row, 10);
  if (isNaN(rowNum) || rowNum < 1 || rowNum > config.rowsPerAisle) {
    return {
      valid: false,
      error: `Row must be between 1 and ${config.rowsPerAisle}`,
    };
  }

  // Validate shelf
  const shelfNum = shelfNameToNumber(shelf, config);
  if (shelfNum < 1 || shelfNum > config.shelfLevels.length) {
    return {
      valid: false,
      error: `Shelf must be one of: ${config.shelfLevels.join(', ')}`,
    };
  }

  // Calculate pick order
  const components: LocationComponents = {
    aisle: aisleNum,
    row: rowNum,
    shelf: shelfNum,
  };

  try {
    const pickOrder = calculatePickOrder(components);
    return {
      valid: true,
      pickOrder,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid location',
    };
  }
}

/**
 * Check if a location is occupied by inventory
 * In a real app, this would query the database
 */
export function isLocationOccupied(
  aisle: string,
  row: string,
  shelf: string,
  inventoryData: InventoryLocation[] = []
): boolean {
  return inventoryData.some(
    item =>
      item.aisle === aisle &&
      item.row === row &&
      item.shelf === shelf &&
      item.quantity > 0
  );
}

/**
 * Suggest the next available empty location
 */
export function suggestNextEmptyLocation(
  inventoryData: InventoryLocation[] = [],
  config: WarehouseConfig = DEFAULT_WAREHOUSE_CONFIG
): Location | null {
  // Iterate through all possible locations
  for (let a = 1; a <= config.aisleCount; a++) {
    const aisle = aisleNumberToLetter(a);
    for (let r = 1; r <= config.rowsPerAisle; r++) {
      const row = r.toString();
      for (let s = 0; s < config.shelfLevels.length; s++) {
        const shelf = config.shelfLevels[s];
        if (!isLocationOccupied(aisle, row, shelf, inventoryData)) {
          return { aisle, row, shelf };
        }
      }
    }
  }
  return null; // Warehouse is full
}

/**
 * Optimize location based on product frequency
 * High-frequency items should be in more accessible locations
 */
export function optimizeLocationForFrequency(
  sku: string,
  frequency: number, // Sales frequency (items per month)
  inventoryData: InventoryLocation[] = [],
  config: WarehouseConfig = DEFAULT_WAREHOUSE_CONFIG
): Location | null {
  // Phase 3 Improvement: Basic frequency-based slotting (legacy)
  // For advanced ABC classification using actual pick data, see:
  // @see lib/warehouse/slotting/abc-classification.ts
  //
  // TODO: Integrate ABC classification results for more accurate slotting
  // ABC approach uses: Pick Frequency × Weight × Volume vs simple frequency
  //
  // Current (frequency-based):
  // - High frequency items (>10/month) go to aisle A, middle shelf
  // - Medium frequency (5-10/month) go to aisles B-D, middle shelf
  // - Low frequency (<5/month) go to back aisles, any shelf
  //
  // Future (ABC-based):
  // - A items (top 20% activity) → aisles 1-3, middle shelf
  // - B items (next 30%) → aisles 4-7, middle shelf
  // - C items (bottom 50%) → aisles 8+, any shelf

  let targetAisles: number[];
  let targetShelf: string;

  if (frequency > 10) {
    targetAisles = [1, 2]; // A, B (corresponds to ABC class A)
    targetShelf = config.shelfLevels[1] || 'Middle'; // Middle shelf
  } else if (frequency >= 5) {
    targetAisles = [3, 4, 5]; // C, D, E (corresponds to ABC class B)
    targetShelf = config.shelfLevels[1] || 'Middle';
  } else {
    // Use any aisle beyond E (corresponds to ABC class C)
    targetAisles = Array.from(
      { length: config.aisleCount - 5 },
      (_, i) => i + 6
    );
    targetShelf = config.shelfLevels[0]; // Top shelf for less accessible
  }

  // Find first empty location in target aisles
  for (const aisleNum of targetAisles) {
    const aisle = aisleNumberToLetter(aisleNum);
    for (let r = 1; r <= config.rowsPerAisle; r++) {
      const row = r.toString();
      if (!isLocationOccupied(aisle, row, targetShelf, inventoryData)) {
        return { aisle, row, shelf: targetShelf };
      }
    }
  }

  // If no optimal location found, return any empty location
  return suggestNextEmptyLocation(inventoryData, config);
}

/**
 * Parse CSV location import data
 */
export interface CSVLocationRow {
  sku: string;
  productName: string;
  aisle: string;
  row: string;
  shelf: string;
  bin?: string;
}

export interface CSVParseResult {
  success: boolean;
  data?: CSVLocationRow[];
  errors?: Array<{ row: number; error: string }>;
}

export function parseLocationCSV(
  csvContent: string,
  config: WarehouseConfig = DEFAULT_WAREHOUSE_CONFIG
): CSVParseResult {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) {
    return {
      success: false,
      errors: [{ row: 0, error: 'CSV must have header and at least one data row' }],
    };
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredHeaders = ['sku', 'aisle', 'row', 'shelf'];

  for (const required of requiredHeaders) {
    if (!headers.includes(required)) {
      return {
        success: false,
        errors: [{ row: 0, error: `Missing required column: ${required}` }],
      };
    }
  }

  const data: CSVLocationRow[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Validate required fields
    if (!row.sku) {
      errors.push({ row: i + 1, error: 'SKU is required' });
      continue;
    }

    // Validate location
    const validation = validateLocation(row.aisle, row.row, row.shelf, config);
    if (!validation.valid) {
      errors.push({ row: i + 1, error: `Invalid location: ${validation.error}` });
      continue;
    }

    data.push({
      sku: row.sku,
      productName: row.productname || row['product name'] || '',
      aisle: row.aisle,
      row: row.row,
      shelf: row.shelf,
      bin: row.bin,
    });
  }

  return {
    success: errors.length === 0,
    data,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Generate CSV template for location import
 */
export function generateLocationCSVTemplate(): string {
  return `SKU,Product Name,Aisle,Row,Shelf,Bin
ABC123,Sample Product 1,A,5,Top,A1
DEF456,Sample Product 2,A,5,Middle,A2
GHI789,Sample Product 3,B,10,Bottom,B1`;
}

/**
 * Calculate warehouse utilization statistics
 */
export interface WarehouseStats {
  totalLocations: number;
  occupiedLocations: number;
  emptyLocations: number;
  utilizationPercent: number;
  mostCrowdedAisle: string | null;
  leastUsedAisle: string | null;
  averageItemsPerLocation: number;
}

export function calculateWarehouseStats(
  inventoryData: InventoryLocation[] = [],
  config: WarehouseConfig = DEFAULT_WAREHOUSE_CONFIG
): WarehouseStats {
  const totalLocations = config.aisleCount * config.rowsPerAisle * config.shelfLevels.length;
  const occupiedLocations = new Set(
    inventoryData
      .filter(item => item.quantity > 0)
      .map(item => `${item.aisle}-${item.row}-${item.shelf}`)
  ).size;

  const emptyLocations = totalLocations - occupiedLocations;
  const utilizationPercent = (occupiedLocations / totalLocations) * 100;

  // Calculate aisle usage
  const aisleUsage = new Map<string, number>();
  for (let a = 1; a <= config.aisleCount; a++) {
    const aisle = aisleNumberToLetter(a);
    aisleUsage.set(aisle, 0);
  }

  inventoryData.forEach(item => {
    if (item.quantity > 0) {
      aisleUsage.set(item.aisle, (aisleUsage.get(item.aisle) || 0) + 1);
    }
  });

  let mostCrowdedAisle: string | null = null;
  let maxCount = 0;
  let leastUsedAisle: string | null = null;
  let minCount = Infinity;

  aisleUsage.forEach((count, aisle) => {
    if (count > maxCount) {
      maxCount = count;
      mostCrowdedAisle = aisle;
    }
    if (count < minCount) {
      minCount = count;
      leastUsedAisle = aisle;
    }
  });

  const totalItems = inventoryData.reduce((sum, item) => sum + item.quantity, 0);
  const averageItemsPerLocation = occupiedLocations > 0 ? totalItems / occupiedLocations : 0;

  return {
    totalLocations,
    occupiedLocations,
    emptyLocations,
    utilizationPercent,
    mostCrowdedAisle,
    leastUsedAisle,
    averageItemsPerLocation,
  };
}
