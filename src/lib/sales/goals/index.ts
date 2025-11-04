/**
 * Sales Goals - Public API
 *
 * Export all sales goal calculation utilities
 */

export * from './seasonality';

// Re-export key functions for convenience
export {
  calculateWorkingDays,
  expectedProgressByWorkingDays,
  getSeasonalityMultiplier,
  calculateSeasonalExpectedProgress,
  assessGoalPerformance,
  calculateRevenuePacing,
  calculateWeeklyRevenueShares,
  getGoalStatusDisplay,
  US_HOLIDAYS_2025,
  PEAK_SEASONS,
} from './seasonality';
