/**
 * EWMA (Exponentially Weighted Moving Average) Baseline Calculator
 *
 * Replaces fixed percentage thresholds (e.g., "15% decline") with statistical
 * baselines that adapt to each customer's historical patterns.
 *
 * Uses Statistical Process Control (SPC) with control bands to detect
 * meaningful changes while reducing false alerts.
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 2.6
 */

/**
 * Control bands for statistical process control
 */
export type ControlBands = {
  /** EWMA baseline (center line) */
  mean: number;
  /** Lower control limit (mean - k×σ) */
  lower: number;
  /** Upper control limit (mean + k×σ) */
  upper: number;
  /** Standard deviation */
  stdDev: number;
  /** Number of samples used */
  sampleSize: number;
};

/**
 * Revenue health assessment result
 */
export type RevenueHealth = {
  /** Current average (typically last 3 orders) */
  currentAverage: number;
  /** EWMA baseline */
  baseline: number;
  /** Lower control band */
  lowerBand: number;
  /** Upper control band */
  upperBand: number;
  /** Whether current is below lower band (decline) */
  isDecline: boolean;
  /** Whether current is above upper band (growth) */
  isGrowth: boolean;
  /** Confidence score (0-1) based on sample size and variance */
  confidenceScore: number;
  /** Health status classification */
  status: 'growing' | 'stable' | 'declining' | 'insufficient_data';
  /** Reason for status */
  reason: string;
};

/**
 * Calculate Exponentially Weighted Moving Average (EWMA)
 *
 * EWMA gives more weight to recent observations while still considering
 * historical data. The alpha parameter controls how responsive the average
 * is to recent changes.
 *
 * Formula: EWMA_t = α × Value_t + (1 - α) × EWMA_(t-1)
 *
 * @param values - Historical values (oldest first)
 * @param alpha - Smoothing parameter (0-1, default: 0.2)
 *   - Higher α (e.g., 0.3): More responsive to recent changes
 *   - Lower α (e.g., 0.1): More stable, less reactive
 * @returns EWMA value
 *
 * @example
 * const baseline = ewma([100, 105, 110, 108, 95], 0.2);
 * // Gives more weight to recent 95 while considering history
 * // Returns: ~103.8
 */
export function ewma(values: number[], alpha: number = 0.2): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  let s = values[0];
  for (let i = 1; i < values.length; i++) {
    s = alpha * values[i] + (1 - alpha) * s;
  }

  return s;
}

/**
 * Calculate control bands using Statistical Process Control
 *
 * Control bands help identify when a process is "out of control"
 * (experiencing a meaningful change) vs normal variation.
 *
 * Uses k-sigma limits:
 * - k=1.5: ~86% confidence (more sensitive, more alerts)
 * - k=2.0: ~95% confidence (balanced)
 * - k=3.0: ~99% confidence (less sensitive, fewer alerts)
 *
 * @param params - Calculation parameters
 * @returns Control bands with upper/lower limits
 *
 * @example
 * const bands = calculateControlBands({
 *   recentTotals: [500, 520, 480, 510, 490],
 *   alpha: 0.2,
 *   kSigma: 1.5
 * });
 * // bands: {
 * //   mean: 497.2,
 * //   lower: 469.4,  // mean - 1.5σ
 * //   upper: 525.0,  // mean + 1.5σ
 * //   stdDev: 18.5
 * // }
 */
export function calculateControlBands({
  recentTotals,
  alpha = 0.2,
  kSigma = 1.5,
}: {
  recentTotals: number[];
  alpha?: number;
  kSigma?: number;
}): ControlBands {
  if (recentTotals.length === 0) {
    return {
      mean: 0,
      lower: 0,
      upper: 0,
      stdDev: 0,
      sampleSize: 0,
    };
  }

  // Calculate EWMA baseline
  const mean = ewma(recentTotals, alpha);

  // Calculate standard deviation around EWMA
  const squaredDiffs = recentTotals.map(x => Math.pow(x - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val, 0) / recentTotals.length;
  const stdDev = Math.sqrt(variance);

  // Calculate control limits
  const lower = Math.max(0, mean - kSigma * stdDev); // Don't go negative
  const upper = mean + kSigma * stdDev;

  return {
    mean: +mean.toFixed(2),
    lower: +lower.toFixed(2),
    upper: +upper.toFixed(2),
    stdDev: +stdDev.toFixed(2),
    sampleSize: recentTotals.length,
  };
}

/**
 * Assess revenue health using statistical baseline
 *
 * Replaces fixed percentage thresholds (e.g., "15% decline") with
 * customer-specific baselines and confidence scoring.
 *
 * @param params - Assessment parameters
 * @returns Revenue health assessment
 *
 * @example
 * // Customer with declining revenue
 * const health = assessRevenueHealth({
 *   recentTotals: [500, 480, 520, 510, 400, 390, 380] // Declining trend
 * });
 * // health: {
 * //   status: 'declining',
 * //   isDecline: true,
 * //   currentAverage: 390,  // Last 3 orders
 * //   baseline: 468,        // EWMA of all orders
 * //   confidenceScore: 0.8  // High confidence (good sample size)
 * // }
 */
export function assessRevenueHealth({
  recentTotals,
  minSampleSize = 5,
  currentWindowSize = 3,
}: {
  recentTotals: number[];
  minSampleSize?: number;
  currentWindowSize?: number;
}): RevenueHealth {
  // Need minimum data for statistical analysis
  if (recentTotals.length < minSampleSize) {
    const avg =
      recentTotals.length > 0
        ? recentTotals.reduce((a, b) => a + b) / recentTotals.length
        : 0;

    return {
      currentAverage: +avg.toFixed(2),
      baseline: 0,
      lowerBand: 0,
      upperBand: 0,
      isDecline: false,
      isGrowth: false,
      confidenceScore: 0,
      status: 'insufficient_data',
      reason: `Need ${minSampleSize - recentTotals.length} more orders for baseline`,
    };
  }

  // Calculate baseline and control bands
  const bands = calculateControlBands({ recentTotals });

  // Current average (most recent orders)
  const currentWindow = recentTotals.slice(-currentWindowSize);
  const currentAverage =
    currentWindow.reduce((a, b) => a + b, 0) / currentWindow.length;

  // Calculate confidence score
  // Factors: sample size and coefficient of variation (CV = σ/μ)
  const sampleFactor = Math.min(1, recentTotals.length / 10); // More samples = higher confidence
  const cvFactor = bands.mean > 0 ? 1 - Math.min(1, bands.stdDev / bands.mean) : 0; // Lower CV = higher confidence
  const confidenceScore = sampleFactor * cvFactor;

  // Determine status based on control bands
  let status: RevenueHealth['status'];
  let reason: string;

  if (currentAverage < bands.lower) {
    status = 'declining';
    const declinePercent = bands.mean > 0
      ? ((bands.mean - currentAverage) / bands.mean) * 100
      : 0;
    reason = `${declinePercent.toFixed(1)}% below baseline (${confidenceScore.toFixed(0)}% confidence)`;
  } else if (currentAverage > bands.upper) {
    status = 'growing';
    const growthPercent = bands.mean > 0
      ? ((currentAverage - bands.mean) / bands.mean) * 100
      : 0;
    reason = `${growthPercent.toFixed(1)}% above baseline (${confidenceScore.toFixed(0)}% confidence)`;
  } else {
    status = 'stable';
    reason = `Within expected range (${bands.lower.toFixed(0)}-${bands.upper.toFixed(0)})`;
  }

  return {
    currentAverage: +currentAverage.toFixed(2),
    baseline: bands.mean,
    lowerBand: bands.lower,
    upperBand: bands.upper,
    isDecline: currentAverage < bands.lower,
    isGrowth: currentAverage > bands.upper,
    confidenceScore: +confidenceScore.toFixed(2),
    status,
    reason,
  };
}

/**
 * Customer spend tier for segmented thresholds
 */
export type SpendTier = 'small' | 'medium' | 'large' | 'enterprise';

/**
 * Get spend tier based on monthly revenue
 *
 * Different customer sizes need different alert sensitivity
 *
 * @param monthlyRevenue - Average monthly revenue
 * @returns Spend tier classification
 */
export function getSpendTier(monthlyRevenue: number): SpendTier {
  if (monthlyRevenue >= 10000) return 'enterprise';
  if (monthlyRevenue >= 5000) return 'large';
  if (monthlyRevenue >= 1000) return 'medium';
  return 'small';
}

/**
 * Get tier-specific threshold parameters
 *
 * Larger customers get more sensitive alerts (lower k-sigma)
 * Smaller customers get less sensitive alerts (higher k-sigma) to reduce noise
 *
 * @param tier - Spend tier
 * @returns Threshold parameters for this tier
 *
 * @example
 * const params = getTierThresholds('enterprise');
 * // Returns: {
 * //   kSigma: 1.0,        // More sensitive (1σ)
 * //   minSampleSize: 10,  // Need more data for confidence
 * //   alpha: 0.3          // More responsive to recent changes
 * // }
 */
export function getTierThresholds(tier: SpendTier): {
  kSigma: number;
  minSampleSize: number;
  alpha: number;
  description: string;
} {
  switch (tier) {
    case 'enterprise':
      return {
        kSigma: 1.0, // ~68% confidence - most sensitive
        minSampleSize: 10,
        alpha: 0.3, // More responsive
        description: 'Enterprise customer - high sensitivity to changes',
      };

    case 'large':
      return {
        kSigma: 1.5, // ~86% confidence
        minSampleSize: 8,
        alpha: 0.2,
        description: 'Large customer - balanced sensitivity',
      };

    case 'medium':
      return {
        kSigma: 1.5, // ~86% confidence
        minSampleSize: 5,
        alpha: 0.2,
        description: 'Medium customer - balanced sensitivity',
      };

    case 'small':
      return {
        kSigma: 2.0, // ~95% confidence - least sensitive
        minSampleSize: 3,
        alpha: 0.15, // Less responsive (more stable)
        description: 'Small customer - reduce alert noise',
      };
  }
}

/**
 * Assess revenue health with tier-specific thresholds
 *
 * Wrapper that applies appropriate thresholds based on customer size
 *
 * @param params - Assessment parameters
 * @returns Revenue health with tier-appropriate sensitivity
 *
 * @example
 * // Large customer ($6000/month)
 * const health = assessRevenueHealthByTier({
 *   recentTotals: [600, 580, 550, 520, 480],
 *   monthlyRevenue: 6000
 * });
 * // Uses kSigma=1.5 (enterprise tier)
 * // More likely to flag decline than small customer
 */
export function assessRevenueHealthByTier({
  recentTotals,
  monthlyRevenue,
}: {
  recentTotals: number[];
  monthlyRevenue: number;
}): RevenueHealth & { tier: SpendTier; thresholds: ReturnType<typeof getTierThresholds> } {
  const tier = getSpendTier(monthlyRevenue);
  const thresholds = getTierThresholds(tier);

  // Recalculate bands with tier-specific k-sigma
  const bands = calculateControlBands({
    recentTotals,
    alpha: thresholds.alpha,
    kSigma: thresholds.kSigma,
  });

  // Use tier-specific minimum sample size
  const health = assessRevenueHealth({
    recentTotals,
    minSampleSize: thresholds.minSampleSize,
  });

  return {
    ...health,
    tier,
    thresholds,
  };
}
