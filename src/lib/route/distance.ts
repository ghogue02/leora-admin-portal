/**
 * Route Distance Calculations
 *
 * Provides accurate route distance and time estimates using Haversine formula.
 * Replaces zip-code delta heuristic with proper geospatial calculations.
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 2.7
 */

import { calculateDistance, Coordinates, estimateDrivingTime } from '../distance';

/**
 * Route stop with coordinates
 */
export type RouteStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
};

/**
 * Route summary with distance and time estimates
 */
export type RouteSummary = {
  /** Total route distance in miles */
  totalMiles: number;
  /** Estimated driving time in minutes */
  drivingMinutes: number;
  /** Estimated stop time in minutes */
  stopMinutes: number;
  /** Total estimated time (driving + stops) */
  totalMinutes: number;
  /** Number of stops */
  stopCount: number;
  /** Formatted time string (e.g., "2h 30m") */
  formattedTime: string;
};

/**
 * Route efficiency metrics
 */
export type RouteEfficiency = {
  /** Actual route distance */
  actualMiles: number;
  /** Ideal straight-line distance (start to end) */
  idealMiles: number;
  /** Efficiency as percentage (ideal/actual × 100) */
  efficiencyPercent: number;
  /** Detour miles (actual - ideal) */
  detourMiles: number;
};

/**
 * Calculate total route distance using Haversine formula
 *
 * Sums point-to-point distances along the route using accurate
 * great-circle distance calculations.
 *
 * @param stops - Ordered array of route stops
 * @returns Total distance in miles
 *
 * @example
 * const stops = [
 *   { id: '1', name: 'Warehouse', latitude: 37.54, longitude: -77.43 },
 *   { id: '2', name: 'Customer A', latitude: 37.55, longitude: -77.45 },
 *   { id: '3', name: 'Customer B', latitude: 37.56, longitude: -77.44 }
 * ];
 * const distance = calculateRouteDistance(stops);
 * // Returns: 2.8 (miles, using Haversine for each segment)
 */
export function calculateRouteDistance(stops: RouteStop[]): number {
  if (stops.length < 2) return 0;

  let totalMiles = 0;

  for (let i = 1; i < stops.length; i++) {
    const from: Coordinates = {
      latitude: stops[i - 1].latitude,
      longitude: stops[i - 1].longitude,
    };
    const to: Coordinates = {
      latitude: stops[i].latitude,
      longitude: stops[i].longitude,
    };

    totalMiles += calculateDistance(from, to);
  }

  return +totalMiles.toFixed(1);
}

/**
 * Estimate route time including driving and stops
 *
 * Provides realistic time estimates for route planning.
 *
 * @param params - Route time parameters
 * @returns Route summary with time breakdown
 *
 * @example
 * const summary = estimateRouteTime({
 *   distanceMiles: 45.5,
 *   stopCount: 8,
 *   avgSpeedMph: 35,
 *   stopTimeMinutes: 15
 * });
 * // summary: {
 * //   drivingMinutes: 78,    // 45.5 miles / 35 mph × 60
 * //   stopMinutes: 105,      // 7 stops × 15 min (excluding last)
 * //   totalMinutes: 183,     // 3h 3m
 * //   formattedTime: "3h 3m"
 * // }
 */
export function estimateRouteTime({
  distanceMiles,
  stopCount,
  avgSpeedMph = 35,
  stopTimeMinutes = 15,
}: {
  distanceMiles: number;
  stopCount: number;
  avgSpeedMph?: number;
  stopTimeMinutes?: number;
}): RouteSummary {
  const drivingMinutes = Math.round((distanceMiles / avgSpeedMph) * 60);

  // Don't count stop time for last stop (end of route)
  const stopMinutes = Math.max(0, (stopCount - 1) * stopTimeMinutes);

  const totalMinutes = drivingMinutes + stopMinutes;

  return {
    totalMiles: +distanceMiles.toFixed(1),
    drivingMinutes,
    stopMinutes,
    totalMinutes,
    stopCount,
    formattedTime: formatMinutes(totalMinutes),
  };
}

/**
 * Calculate complete route summary
 *
 * Convenience function that combines distance and time calculations
 *
 * @param stops - Route stops
 * @param params - Optional time estimation parameters
 * @returns Complete route summary
 */
export function calculateRouteSummary(
  stops: RouteStop[],
  params?: {
    avgSpeedMph?: number;
    stopTimeMinutes?: number;
  }
): RouteSummary {
  const distance = calculateRouteDistance(stops);

  return estimateRouteTime({
    distanceMiles: distance,
    stopCount: stops.length,
    ...params,
  });
}

/**
 * Calculate route efficiency
 *
 * Compares actual route to ideal straight-line distance.
 * Higher efficiency = more direct route.
 *
 * @param stops - Route stops
 * @returns Efficiency metrics
 *
 * @example
 * const efficiency = calculateRouteEfficiency(stops);
 * // efficiency: {
 * //   actualMiles: 45.5,
 * //   idealMiles: 38.2,
 * //   efficiencyPercent: 84,  // (38.2 / 45.5 × 100)
 * //   detourMiles: 7.3        // 45.5 - 38.2
 * // }
 */
export function calculateRouteEfficiency(stops: RouteStop[]): RouteEfficiency {
  if (stops.length < 2) {
    return {
      actualMiles: 0,
      idealMiles: 0,
      efficiencyPercent: 100,
      detourMiles: 0,
    };
  }

  const actualMiles = calculateRouteDistance(stops);

  // Ideal distance = straight line from start to end
  const idealMiles = calculateDistance(
    {
      latitude: stops[0].latitude,
      longitude: stops[0].longitude,
    },
    {
      latitude: stops[stops.length - 1].latitude,
      longitude: stops[stops.length - 1].longitude,
    }
  );

  const efficiencyPercent =
    actualMiles > 0 ? Math.round((idealMiles / actualMiles) * 100) : 100;

  const detourMiles = actualMiles - idealMiles;

  return {
    actualMiles: +actualMiles.toFixed(1),
    idealMiles: +idealMiles.toFixed(1),
    efficiencyPercent,
    detourMiles: +detourMiles.toFixed(1),
  };
}

/**
 * Format minutes to human-readable time
 *
 * @param minutes - Total minutes
 * @returns Formatted string (e.g., "2h 30m", "45m", "3h")
 */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Calculate pairwise distance matrix
 *
 * Useful for route optimization algorithms (TSP, etc.)
 *
 * @param stops - Route stops
 * @returns 2D array of distances between all stop pairs
 *
 * @example
 * const matrix = calculateDistanceMatrix(stops);
 * // matrix[i][j] = distance from stops[i] to stops[j]
 * // matrix[i][i] = 0 (same stop)
 */
export function calculateDistanceMatrix(stops: RouteStop[]): number[][] {
  const n = stops.length;
  const matrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const distance = calculateDistance(
        {
          latitude: stops[i].latitude,
          longitude: stops[i].longitude,
        },
        {
          latitude: stops[j].latitude,
          longitude: stops[j].longitude,
        }
      );

      matrix[i][j] = +distance.toFixed(2);
      matrix[j][i] = matrix[i][j]; // Symmetric
    }
  }

  return matrix;
}

/**
 * Find nearest unvisited stop
 *
 * Greedy nearest-neighbor heuristic for route optimization
 *
 * @param currentStop - Current location
 * @param unvisitedStops - Remaining stops to visit
 * @returns Nearest stop and distance to it
 */
export function findNearestStop(
  currentStop: RouteStop,
  unvisitedStops: RouteStop[]
): {
  stop: RouteStop;
  distance: number;
} | null {
  if (unvisitedStops.length === 0) return null;

  let nearest: RouteStop = unvisitedStops[0];
  let minDistance = calculateDistance(
    {
      latitude: currentStop.latitude,
      longitude: currentStop.longitude,
    },
    {
      latitude: nearest.latitude,
      longitude: nearest.longitude,
    }
  );

  for (let i = 1; i < unvisitedStops.length; i++) {
    const stop = unvisitedStops[i];
    const distance = calculateDistance(
      {
        latitude: currentStop.latitude,
        longitude: currentStop.longitude,
      },
      {
        latitude: stop.latitude,
        longitude: stop.longitude,
      }
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = stop;
    }
  }

  return {
    stop: nearest,
    distance: +minDistance.toFixed(2),
  };
}
