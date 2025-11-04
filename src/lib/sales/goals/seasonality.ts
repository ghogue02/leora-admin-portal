/**
 * Seasonality-Aware Sales Goal Progress
 *
 * Replaces linear time-based progress (days elapsed / days in year) with
 * sophisticated progress calculations that account for:
 * - Working delivery days (exclude weekends/holidays)
 * - Historical seasonality patterns (last year's weekly share)
 * - Holiday and peak season effects
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 3
 */

import { differenceInCalendarDays, isWeekend, format, startOfYear, endOfYear } from 'date-fns';

/**
 * Holiday definitions for business days calculation
 */
export const US_HOLIDAYS_2025 = [
  new Date('2025-01-01'), // New Year's Day
  new Date('2025-01-20'), // MLK Day
  new Date('2025-02-17'), // Presidents Day
  new Date('2025-05-26'), // Memorial Day
  new Date('2025-07-04'), // Independence Day
  new Date('2025-09-01'), // Labor Day
  new Date('2025-11-27'), // Thanksgiving
  new Date('2025-12-25'), // Christmas
] as const;

/**
 * Peak season periods for wine industry
 */
export const PEAK_SEASONS = {
  HOLIDAY: { start: { month: 11, day: 15 }, end: { month: 12, day: 31 } }, // Nov 15 - Dec 31
  SUMMER: { start: { month: 6, day: 1 }, end: { month: 8, day: 31 } }, // Jun 1 - Aug 31
  VALENTINES: { start: { month: 2, day: 1 }, end: { month: 2, day: 14 } }, // Feb 1 - Feb 14
} as const;

/**
 * Working delivery days calculation
 */
export type WorkingDaysResult = {
  /** Total working days (excluding weekends and holidays) */
  workingDays: number;
  /** Calendar days in period */
  calendarDays: number;
  /** Working days as percentage of calendar days */
  workingDaysPercent: number;
  /** Number of weekends excluded */
  weekends: number;
  /** Number of holidays excluded */
  holidays: number;
};

/**
 * Calculate working delivery days between two dates
 *
 * Excludes weekends and US holidays. Wine distributors typically
 * don't deliver on Saturdays, Sundays, or major holidays.
 *
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param holidays - Array of holiday dates (default: US_HOLIDAYS_2025)
 * @returns Working days statistics
 *
 * @example
 * const result = calculateWorkingDays(
 *   new Date('2025-01-01'),
 *   new Date('2025-12-31')
 * );
 * // Returns: {
 * //   workingDays: 251,      // Actual delivery days
 * //   calendarDays: 365,
 * //   workingDaysPercent: 68.8,
 * //   weekends: 104,
 * //   holidays: 10
 * // }
 */
export function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  holidays: readonly Date[] = US_HOLIDAYS_2025
): WorkingDaysResult {
  const calendarDays = differenceInCalendarDays(endDate, startDate) + 1;
  let workingDays = 0;
  let weekends = 0;
  let holidayCount = 0;

  // Create set of holiday dates (as strings) for fast lookup
  const holidaySet = new Set(
    holidays.map(h => format(h, 'yyyy-MM-dd'))
  );

  // Count working days
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = format(current, 'yyyy-MM-dd');

    // Check if weekend
    if (isWeekend(current)) {
      weekends++;
    }
    // Check if holiday
    else if (holidaySet.has(dateStr)) {
      holidayCount++;
    }
    // It's a working day
    else {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    workingDays,
    calendarDays,
    workingDaysPercent: +(workingDays / calendarDays * 100).toFixed(1),
    weekends,
    holidays: holidayCount,
  };
}

/**
 * Expected sales goal progress based on working days
 *
 * Replaces simple linear time calculation (days/365) with
 * working delivery days calculation.
 *
 * @param yearStart - Start of goal period
 * @param currentDate - Current date
 * @param yearEnd - End of goal period
 * @returns Expected progress as decimal (0-1)
 *
 * @example
 * // Mid-year check
 * const progress = expectedProgressByWorkingDays(
 *   new Date('2025-01-01'),
 *   new Date('2025-07-01'),
 *   new Date('2025-12-31')
 * );
 * // Returns: 0.51 (51% of working days elapsed)
 * // vs linear: 0.50 (50% of calendar days)
 */
export function expectedProgressByWorkingDays(
  yearStart: Date,
  currentDate: Date,
  yearEnd: Date
): number {
  const yearWorkingDays = calculateWorkingDays(yearStart, yearEnd);
  const elapsedWorkingDays = calculateWorkingDays(yearStart, currentDate);

  if (yearWorkingDays.workingDays === 0) {
    return 0;
  }

  return +(elapsedWorkingDays.workingDays / yearWorkingDays.workingDays).toFixed(4);
}

/**
 * Seasonality multiplier for a given date
 */
export type SeasonalityMultiplier = {
  /** Multiplier to apply to expected progress (1.0 = neutral) */
  multiplier: number;
  /** Which season/period this represents */
  period: 'peak_holiday' | 'peak_summer' | 'peak_valentines' | 'normal';
  /** Explanation for the multiplier */
  reason: string;
};

/**
 * Get seasonality multiplier for date
 *
 * Wine sales have seasonal patterns - higher during holidays,
 * summer, and Valentine's week.
 *
 * @param date - Date to check
 * @returns Seasonality multiplier
 *
 * @example
 * const multiplier = getSeasonalityMultiplier(new Date('2025-12-15'));
 * // Returns: {
 * //   multiplier: 1.4,
 * //   period: 'peak_holiday',
 * //   reason: 'Holiday season (Nov 15 - Dec 31)'
 * // }
 */
export function getSeasonalityMultiplier(date: Date): SeasonalityMultiplier {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // Holiday season (Nov 15 - Dec 31): +40%
  if (
    (month === 11 && day >= 15) ||
    month === 12
  ) {
    return {
      multiplier: 1.4,
      period: 'peak_holiday',
      reason: 'Holiday season (Nov 15 - Dec 31) - historically 40% above baseline',
    };
  }

  // Summer season (Jun 1 - Aug 31): +20%
  if (month >= 6 && month <= 8) {
    return {
      multiplier: 1.2,
      period: 'peak_summer',
      reason: 'Summer season (Jun-Aug) - historically 20% above baseline',
    };
  }

  // Valentine's period (Feb 1-14): +15%
  if (month === 2 && day <= 14) {
    return {
      multiplier: 1.15,
      period: 'peak_valentines',
      reason: "Valentine's week - historically 15% above baseline",
    };
  }

  // Normal period
  return {
    multiplier: 1.0,
    period: 'normal',
    reason: 'Normal period - baseline sales rate',
  };
}

/**
 * Historical weekly revenue share for seasonality adjustment
 */
export type WeeklyRevenueShare = {
  /** Week number (1-52) */
  weekNumber: number;
  /** Revenue share as decimal (0-1) */
  share: number;
  /** Year this data is from */
  year: number;
};

/**
 * Calculate expected progress with seasonality
 *
 * Uses last year's weekly revenue distribution to adjust expectations.
 * This is more accurate than linear time or simple peak season multipliers.
 *
 * @param params - Calculation parameters
 * @returns Seasonality-adjusted expected progress
 *
 * @example
 * const progress = calculateSeasonalExpectedProgress({
 *   yearStart: new Date('2025-01-01'),
 *   currentDate: new Date('2025-12-15'),
 *   yearEnd: new Date('2025-12-31'),
 *   lastYearWeeklyShares: [
 *     { weekNumber: 1, share: 0.015, year: 2024 },
 *     // ... weeks 2-50 with ~0.019 each
 *     { weekNumber: 51, share: 0.045, year: 2024 }, // Holiday week
 *     { weekNumber: 52, share: 0.050, year: 2024 }  // Holiday week
 *   ]
 * });
 * // Returns: 0.94 (94% expected by Dec 15 based on seasonality)
 * // vs linear: 0.96 (96% based on calendar time)
 */
export function calculateSeasonalExpectedProgress({
  yearStart,
  currentDate,
  yearEnd,
  lastYearWeeklyShares,
}: {
  yearStart: Date;
  currentDate: Date;
  yearEnd: Date;
  lastYearWeeklyShares?: WeeklyRevenueShare[];
}): {
  expectedProgress: number;
  workingDaysProgress: number;
  calendarDaysProgress: number;
  seasonalityAdjustment: number;
  method: 'historical_weekly' | 'peak_season' | 'working_days' | 'calendar_days';
} {
  // Method 1: Use historical weekly shares if available
  if (lastYearWeeklyShares && lastYearWeeklyShares.length > 0) {
    const currentWeek = getWeekNumber(currentDate);
    const cumulativeShare = lastYearWeeklyShares
      .filter(w => w.weekNumber <= currentWeek)
      .reduce((sum, w) => sum + w.share, 0);

    return {
      expectedProgress: +cumulativeShare.toFixed(4),
      workingDaysProgress: expectedProgressByWorkingDays(yearStart, currentDate, yearEnd),
      calendarDaysProgress: +(differenceInCalendarDays(currentDate, yearStart) / differenceInCalendarDays(yearEnd, yearStart)).toFixed(4),
      seasonalityAdjustment: +(cumulativeShare / expectedProgressByWorkingDays(yearStart, currentDate, yearEnd)).toFixed(2),
      method: 'historical_weekly',
    };
  }

  // Method 2: Use peak season multiplier if in peak period
  const seasonality = getSeasonalityMultiplier(currentDate);
  if (seasonality.period !== 'normal') {
    const workingDaysProgress = expectedProgressByWorkingDays(yearStart, currentDate, yearEnd);
    const adjustedProgress = Math.min(1.0, workingDaysProgress * seasonality.multiplier);

    return {
      expectedProgress: +adjustedProgress.toFixed(4),
      workingDaysProgress,
      calendarDaysProgress: +(differenceInCalendarDays(currentDate, yearStart) / differenceInCalendarDays(yearEnd, yearStart)).toFixed(4),
      seasonalityAdjustment: seasonality.multiplier,
      method: 'peak_season',
    };
  }

  // Method 3: Use working days (better than calendar days)
  const workingDaysProgress = expectedProgressByWorkingDays(yearStart, currentDate, yearEnd);

  return {
    expectedProgress: workingDaysProgress,
    workingDaysProgress,
    calendarDaysProgress: +(differenceInCalendarDays(currentDate, yearStart) / differenceInCalendarDays(yearEnd, yearStart)).toFixed(4),
    seasonalityAdjustment: 1.0,
    method: 'working_days',
  };
}

/**
 * Get ISO week number for a date
 *
 * @param date - Date to get week number for
 * @returns Week number (1-52/53)
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Sales goal performance classification
 */
export type GoalPerformance = {
  /** Actual progress (revenue / goal) */
  actualProgress: number;
  /** Expected progress (adjusted for seasonality) */
  expectedProgress: number;
  /** Variance from expected (+0.05 = 5% ahead) */
  variance: number;
  /** Variance as percentage */
  variancePercent: number;
  /** Performance status */
  status: 'ahead' | 'on_track' | 'behind' | 'at_risk';
  /** Days ahead or behind schedule */
  daysAheadBehind: number;
  /** Pacing description */
  pacing: string;
};

/**
 * Assess sales goal performance with seasonality
 *
 * Provides more accurate "on track" vs "behind" assessment than
 * simple linear time comparison.
 *
 * @param params - Performance assessment parameters
 * @returns Performance classification
 *
 * @example
 * const performance = assessGoalPerformance({
 *   actualRevenue: 450000,
 *   annualGoal: 1000000,
 *   yearStart: new Date('2025-01-01'),
 *   currentDate: new Date('2025-06-15'),  // Mid-year
 *   yearEnd: new Date('2025-12-31')
 * });
 * // Result: {
 * //   actualProgress: 0.45,        // 45% of goal achieved
 * //   expectedProgress: 0.48,      // Should be at 48% (accounting for working days)
 * //   variance: -0.03,             // 3% behind
 * //   status: 'behind',
 * //   daysAheadBehind: -12,       // Equivalent to 12 days behind
 * //   pacing: '3.0% behind pace'
 * // }
 */
export function assessGoalPerformance({
  actualRevenue,
  annualGoal,
  yearStart,
  currentDate,
  yearEnd,
  lastYearWeeklyShares,
}: {
  actualRevenue: number;
  annualGoal: number;
  yearStart: Date;
  currentDate: Date;
  yearEnd: Date;
  lastYearWeeklyShares?: WeeklyRevenueShare[];
}): GoalPerformance {
  // Calculate actual progress
  const actualProgress = annualGoal > 0 ? actualRevenue / annualGoal : 0;

  // Calculate expected progress with seasonality
  const seasonal = calculateSeasonalExpectedProgress({
    yearStart,
    currentDate,
    yearEnd,
    lastYearWeeklyShares,
  });

  // Calculate variance
  const variance = actualProgress - seasonal.expectedProgress;
  const variancePercent = +(variance * 100).toFixed(1);

  // Determine status
  let status: GoalPerformance['status'];
  if (variance >= 0.05) {
    status = 'ahead'; // 5%+ ahead of pace
  } else if (variance >= -0.05) {
    status = 'on_track'; // Within ±5% of expected
  } else if (variance >= -0.15) {
    status = 'behind'; // 5-15% behind
  } else {
    status = 'at_risk'; // 15%+ behind
  }

  // Calculate days ahead/behind
  const yearWorkingDays = calculateWorkingDays(yearStart, yearEnd);
  const daysAheadBehind = Math.round(variance * yearWorkingDays.workingDays);

  // Create pacing description
  let pacing: string;
  if (Math.abs(variancePercent) < 1) {
    pacing = 'On track';
  } else if (variance > 0) {
    pacing = `${Math.abs(variancePercent)}% ahead of pace`;
  } else {
    pacing = `${Math.abs(variancePercent)}% behind pace`;
  }

  return {
    actualProgress: +actualProgress.toFixed(4),
    expectedProgress: seasonal.expectedProgress,
    variance: +variance.toFixed(4),
    variancePercent,
    status,
    daysAheadBehind,
    pacing,
  };
}

/**
 * Calculate revenue pacing (projected annual based on current rate)
 *
 * Projects year-end revenue based on current pacing, adjusted for
 * remaining seasonality.
 *
 * @param params - Pacing calculation parameters
 * @returns Projected annual revenue
 *
 * @example
 * const projection = calculateRevenuePacing({
 *   ytdRevenue: 450000,
 *   yearStart: new Date('2025-01-01'),
 *   currentDate: new Date('2025-06-15'),
 *   yearEnd: new Date('2025-12-31')
 * });
 * // Returns: {
 * //   projectedAnnual: 937500,  // Based on current pace
 * //   onPaceFor: 'on pace for 93.8% of goal',
 * //   needsAcceleration: 62500  // Need $62.5K more to hit $1M goal
 * // }
 */
export function calculateRevenuePacing({
  ytdRevenue,
  yearStart,
  currentDate,
  yearEnd,
  annualGoal,
}: {
  ytdRevenue: number;
  yearStart: Date;
  currentDate: Date;
  yearEnd: Date;
  annualGoal?: number;
}): {
  projectedAnnual: number;
  currentPace: number; // Revenue per working day
  projectionMethod: string;
  remainingWorkingDays: number;
  needsAcceleration?: number;
} {
  const elapsed = calculateWorkingDays(yearStart, currentDate);
  const year = calculateWorkingDays(yearStart, yearEnd);
  const remaining = year.workingDays - elapsed.workingDays;

  // Calculate current daily pace
  const currentPace = elapsed.workingDays > 0
    ? ytdRevenue / elapsed.workingDays
    : 0;

  // Project annual based on maintaining current pace
  const projectedAnnual = currentPace * year.workingDays;

  // Calculate gap to goal if provided
  const needsAcceleration = annualGoal
    ? Math.max(0, annualGoal - projectedAnnual)
    : undefined;

  return {
    projectedAnnual: +projectedAnnual.toFixed(2),
    currentPace: +currentPace.toFixed(2),
    projectionMethod: 'working_days_pace',
    remainingWorkingDays: remaining,
    needsAcceleration: needsAcceleration ? +needsAcceleration.toFixed(2) : undefined,
  };
}

/**
 * Generate weekly revenue shares from historical data
 *
 * Helper function to create seasonality data from last year's orders
 *
 * @param orders - Array of orders with orderedAt and total
 * @param year - Year to calculate shares for
 * @returns Weekly revenue shares
 */
export function calculateWeeklyRevenueShares(
  orders: Array<{ orderedAt: Date; total: number | string }>,
  year: number
): WeeklyRevenueShare[] {
  // Filter orders to specified year
  const yearOrders = orders.filter(o => o.orderedAt.getFullYear() === year);

  // Calculate total revenue for the year
  const totalRevenue = yearOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);

  if (totalRevenue === 0) {
    return [];
  }

  // Group by week and sum revenue
  const weeklyRevenue = new Map<number, number>();

  yearOrders.forEach(order => {
    const week = getWeekNumber(order.orderedAt);
    const current = weeklyRevenue.get(week) || 0;
    weeklyRevenue.set(week, current + Number(order.total || 0));
  });

  // Convert to shares
  const shares: WeeklyRevenueShare[] = [];

  for (let week = 1; week <= 52; week++) {
    const revenue = weeklyRevenue.get(week) || 0;
    const share = revenue / totalRevenue;

    shares.push({
      weekNumber: week,
      share: +share.toFixed(6),
      year,
    });
  }

  return shares;
}

/**
 * Get goal status display information
 *
 * Creates user-friendly status messages for dashboards
 *
 * @param performance - Performance assessment result
 * @returns Display information
 */
export function getGoalStatusDisplay(performance: GoalPerformance): {
  badge: 'success' | 'warning' | 'danger' | 'info';
  message: string;
  icon: string;
  actionable: string;
} {
  switch (performance.status) {
    case 'ahead':
      return {
        badge: 'success',
        message: `${performance.variancePercent}% ahead of pace`,
        icon: '📈',
        actionable: `Keep up the excellent work! ${Math.abs(performance.daysAheadBehind)} working days ahead of schedule.`,
      };

    case 'on_track':
      return {
        badge: 'info',
        message: 'On track',
        icon: '✓',
        actionable: `Maintaining expected pace. Continue current efforts to achieve goal.`,
      };

    case 'behind':
      return {
        badge: 'warning',
        message: `${Math.abs(performance.variancePercent)}% behind pace`,
        icon: '⚠',
        actionable: `Need to accelerate. Equivalent to ${Math.abs(performance.daysAheadBehind)} working days behind. Focus on high-value opportunities.`,
      };

    case 'at_risk':
      return {
        badge: 'danger',
        message: `${Math.abs(performance.variancePercent)}% behind pace`,
        icon: '🔴',
        actionable: `URGENT: ${Math.abs(performance.daysAheadBehind)} working days behind. Immediate action required. Review strategy and consider additional resources.`,
      };
  }
}
