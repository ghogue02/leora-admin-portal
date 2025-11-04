/**
 * Warehouse Slotting - Public API
 *
 * Export all ABC classification and slotting utilities
 */

export * from './abc-classification';

// Re-export key functions for convenience
export {
  calculateSKUActivityMetrics,
  classifySKUsABC,
  getABCSummary,
  generateSlottingRecommendations,
  calculateOptimalSlot,
  getABCDistribution,
  ABC_THRESHOLDS,
  AISLE_ASSIGNMENTS,
  type ABCClass,
  type SKUActivity,
  type ABCSummary,
} from './abc-classification';
