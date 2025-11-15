/**
 * Inventory Depletion Forecasting Types
 * CRM-91: Predicts when products will run out based on sales velocity
 */

export type DepletionUrgency = 'critical' | 'warning' | 'normal' | 'stable' | 'infinite';
export type DemandPattern = 'fast' | 'medium' | 'slow' | 'intermittent' | 'none';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Velocity calculation for a specific timeframe
 */
export type VelocityMetric = {
  period: 30 | 60 | 90 | 180 | 360;
  periodLabel: string; // "30-day", "60-day", etc.
  unitsPerDay: number;
  totalUnits: number;
  daysWithSales: number;
  daysUntilStockout: number | null; // null = infinite (no demand) or negative (already out)
  stockoutDate: Date | null;
};

/**
 * Complete depletion forecast for a single SKU
 */
export type DepletionForecast = {
  // Product identification
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;

  // Current inventory status
  currentAvailable: number;
  onHand: number;
  allocated: number;
  reserved: number;

  // Velocity metrics for all timeframes
  velocities: {
    day30: VelocityMetric;
    day60: VelocityMetric;
    day90: VelocityMetric;
    day180: VelocityMetric;
    day360: VelocityMetric;
  };

  // Primary forecast (based on 90-day velocity by default)
  primaryVelocity: VelocityMetric;
  daysUntilStockout: number | null;
  stockoutDate: Date | null;
  urgency: DepletionUrgency;

  // Metadata
  demandPattern: DemandPattern;
  confidenceLevel: ConfidenceLevel;
  lastCalculated: Date;
};

/**
 * Filters for depletion forecast queries
 */
export type DepletionFilters = {
  category?: string;
  brand?: string; // Using brand as supplier proxy
  urgency?: DepletionUrgency | DepletionUrgency[];
  searchTerm?: string; // SKU code or product name
  minDaysUntilStockout?: number;
  maxDaysUntilStockout?: number;
};

/**
 * Summary statistics for depletion forecast overview
 */
export type DepletionSummary = {
  totalSKUs: number;
  activeSKUs: number;

  // Urgency breakdown
  criticalCount: number;   // < 30 days
  warningCount: number;    // 30-60 days
  normalCount: number;     // 60-90 days
  stableCount: number;     // > 90 days
  infiniteCount: number;   // No demand or unlimited stock

  // Top concerns
  topCritical: Array<{
    skuCode: string;
    productName: string;
    daysUntilStockout: number;
  }>;
};

/**
 * Configuration for depletion calculation
 */
export type DepletionConfig = {
  // Urgency thresholds (in days)
  criticalThreshold: number;    // Default: 30
  warningThreshold: number;     // Default: 60
  normalThreshold: number;      // Default: 90

  // Which velocity period to use as primary
  primaryPeriod: 30 | 60 | 90 | 180 | 360;  // Default: 90

  // Confidence calculation
  minDaysForHighConfidence: number;  // Default: 60 (need 60 days of data for high confidence)
  minSalesForHighConfidence: number; // Default: 10 (need 10+ sales for high confidence)
};

export const DEFAULT_DEPLETION_CONFIG: DepletionConfig = {
  criticalThreshold: 30,
  warningThreshold: 60,
  normalThreshold: 90,
  primaryPeriod: 90,
  minDaysForHighConfidence: 60,
  minSalesForHighConfidence: 10,
};
