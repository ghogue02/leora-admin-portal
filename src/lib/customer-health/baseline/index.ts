/**
 * Customer Health Baseline - Public API
 *
 * Export all EWMA and statistical baseline utilities
 */

export * from './ewma';

// Re-export key functions for convenience
export {
  ewma,
  calculateControlBands,
  assessRevenueHealth,
  assessRevenueHealthByTier,
  getSpendTier,
  getTierThresholds,
} from './ewma';
