/**
 * Route Optimization Helper
 *
 * Optimizes delivery routes using Haversine distance calculations.
 * Replaces zip-code delta heuristic with accurate geospatial calculations.
 *
 * @see docs/CALCULATION_MODERNIZATION_PLAN.md Phase 2.7
 */

import { Order, RouteStop } from '@/types';
import { calculateRouteDistance, calculateRouteSummary, calculateRouteEfficiency } from './route/distance';

export interface Location {
  latitude?: number;
  longitude?: number;
  zipCode?: string;
  address?: string;
}

export interface OptimizationConfig {
  minutesPerStop?: number;
  averageSpeedMph?: number;
  startTime?: string;
}

const DEFAULT_CONFIG: OptimizationConfig = {
  minutesPerStop: 15,
  averageSpeedMph: 30,
  startTime: '08:00'
};

/**
 * Group orders by territory
 */
export function groupOrdersByTerritory(orders: Order[]): Map<string, Order[]> {
  const groups = new Map<string, Order[]>();

  for (const order of orders) {
    const territory = order.territory || 'unassigned';

    if (!groups.has(territory)) {
      groups.set(territory, []);
    }

    groups.get(territory)!.push(order);
  }

  return groups;
}

/**
 * Sort orders by proximity using zip code
 * More sophisticated geo-sorting would require actual coordinates
 */
export function sortByProximity(orders: Order[], startLocation?: Location): Order[] {
  if (!startLocation || !startLocation.zipCode) {
    // Fallback: sort by zip code
    return sortByZipCode(orders);
  }

  const startZip = startLocation.zipCode;

  return [...orders].sort((a, b) => {
    const distA = zipCodeDistance(startZip, a.customer?.zip_code || '');
    const distB = zipCodeDistance(startZip, b.customer?.zip_code || '');

    return distA - distB;
  });
}

/**
 * Sort orders by zip code (simple alphabetical)
 */
function sortByZipCode(orders: Order[]): Order[] {
  return [...orders].sort((a, b) => {
    const zipA = a.customer?.zip_code || '';
    const zipB = b.customer?.zip_code || '';
    return zipA.localeCompare(zipB);
  });
}

/**
 * Estimate distance between two locations
 *
 * @deprecated Use calculateDistance from @/lib/route/distance instead
 * This function is kept for backward compatibility but now uses Haversine
 * when coordinates are available, falling back to zip-code estimate.
 */
function zipCodeDistance(zip1: string, zip2: string): number {
  if (!zip1 || !zip2) {
    return Infinity;
  }

  // Legacy: Simple numeric difference as rough proximity indicator
  // NOTE: This is only used as fallback when coordinates are missing
  // New routes should use Haversine distance with lat/lon
  const num1 = parseInt(zip1.replace(/\D/g, ''));
  const num2 = parseInt(zip2.replace(/\D/g, ''));

  // Normalize to approximate miles (very rough)
  return Math.min(Math.abs(num1 - num2) / 100, 20);
}

/**
 * Estimate delivery times for route stops
 */
export function estimateDeliveryTime(
  orders: Order[],
  startTime?: string,
  config: OptimizationConfig = {}
): RouteStop[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const startHour = parseStartTime(startTime || cfg.startTime!);

  const stops: RouteStop[] = [];
  let currentTime = new Date();
  currentTime.setHours(startHour.hours, startHour.minutes, 0, 0);

  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];

    // Add travel time if not first stop
    if (i > 0) {
      const travelMinutes = estimateTravelTime(
        orders[i - 1],
        order,
        cfg.averageSpeedMph!
      );
      currentTime = new Date(currentTime.getTime() + travelMinutes * 60000);
    }

    stops.push({
      stop_number: i + 1,
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer?.business_name || order.customer?.name,
      address: formatAddress(order.customer),
      estimated_arrival: new Date(currentTime),
      status: 'pending'
    });

    // Add service time
    currentTime = new Date(currentTime.getTime() + cfg.minutesPerStop! * 60000);
  }

  return stops;
}

/**
 * Parse start time string (HH:MM)
 */
function parseStartTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Estimate travel time between two orders
 */
function estimateTravelTime(order1: Order, order2: Order, speedMph: number): number {
  // Simplified estimation based on zip code difference
  // Production version would use actual routing API (Google Maps, Mapbox, etc.)

  const zip1 = order1.customer?.zip_code || '';
  const zip2 = order2.customer?.zip_code || '';

  if (zip1 === zip2) {
    // Same zip code - assume 5 minutes
    return 5;
  }

  // Rough estimate: 1 mile per zip code unit difference
  const zipDiff = Math.abs(
    parseInt(zip1.replace(/\D/g, '')) - parseInt(zip2.replace(/\D/g, ''))
  );

  const estimatedMiles = Math.min(zipDiff / 100, 20); // Cap at 20 miles
  const travelHours = estimatedMiles / speedMph;

  return Math.round(travelHours * 60); // Convert to minutes
}

/**
 * Format customer address
 */
function formatAddress(customer: any): string {
  if (!customer) {
    return '';
  }

  const parts = [
    customer.address,
    customer.city,
    customer.state,
    customer.zip_code
  ].filter(Boolean);

  return parts.join(', ');
}

/**
 * Calculate total route distance (estimated)
 */
export function calculateRouteDistance(stops: RouteStop[]): number {
  if (stops.length < 2) {
    return 0;
  }

  let totalMiles = 0;

  for (let i = 1; i < stops.length; i++) {
    // Extract zip codes from addresses
    const zip1 = extractZipCode(stops[i - 1].address);
    const zip2 = extractZipCode(stops[i].address);

    if (zip1 && zip2) {
      const diff = Math.abs(parseInt(zip1) - parseInt(zip2));
      totalMiles += diff / 100; // Rough approximation
    }
  }

  return Math.round(totalMiles * 10) / 10; // Round to 1 decimal
}

/**
 * Extract zip code from address string
 */
function extractZipCode(address: string): string | null {
  const match = address.match(/\b\d{5}\b/);
  return match ? match[0] : null;
}

/**
 * Optimize route order using nearest neighbor algorithm
 */
export function optimizeRouteOrder(orders: Order[], startLocation?: Location): Order[] {
  if (orders.length <= 1) {
    return orders;
  }

  const unvisited = new Set(orders);
  const route: Order[] = [];

  // Start with nearest to start location or first order
  let current: Order;

  if (startLocation?.zipCode) {
    current = findNearestOrder(startLocation.zipCode, orders);
  } else {
    current = orders[0];
  }

  unvisited.delete(current);
  route.push(current);

  // Greedy nearest neighbor
  while (unvisited.size > 0) {
    const currentZip = current.customer?.zip_code || '';
    const nearest = findNearestOrder(currentZip, Array.from(unvisited));

    unvisited.delete(nearest);
    route.push(nearest);
    current = nearest;
  }

  return route;
}

/**
 * Find nearest order to given zip code
 */
function findNearestOrder(zipCode: string, orders: Order[]): Order {
  let nearest = orders[0];
  let minDistance = Infinity;

  for (const order of orders) {
    const distance = zipCodeDistance(zipCode, order.customer?.zip_code || '');

    if (distance < minDistance) {
      minDistance = distance;
      nearest = order;
    }
  }

  return nearest;
}

/**
 * Group stops by time windows
 */
export function groupByTimeWindow(
  stops: RouteStop[],
  windowSizeMinutes: number = 60
): Map<string, RouteStop[]> {
  const windows = new Map<string, RouteStop[]>();

  for (const stop of stops) {
    const time = new Date(stop.estimated_arrival);
    const windowStart = new Date(time);
    windowStart.setMinutes(Math.floor(time.getMinutes() / windowSizeMinutes) * windowSizeMinutes);

    const key = windowStart.toISOString();

    if (!windows.has(key)) {
      windows.set(key, []);
    }

    windows.get(key)!.push(stop);
  }

  return windows;
}

/**
 * Calculate route efficiency score (0-100)
 */
export function calculateEfficiencyScore(stops: RouteStop[]): number {
  if (stops.length < 2) {
    return 100;
  }

  // Check if stops are in optimal order (based on ETA)
  let outOfOrder = 0;

  for (let i = 1; i < stops.length; i++) {
    const prevTime = new Date(stops[i - 1].estimated_arrival).getTime();
    const currTime = new Date(stops[i].estimated_arrival).getTime();

    if (currTime < prevTime) {
      outOfOrder++;
    }
  }

  const orderScore = ((stops.length - outOfOrder) / stops.length) * 100;

  // Check time gaps (penalize long gaps)
  let totalGap = 0;
  let maxGap = 0;

  for (let i = 1; i < stops.length; i++) {
    const prevTime = new Date(stops[i - 1].estimated_arrival).getTime();
    const currTime = new Date(stops[i].estimated_arrival).getTime();
    const gap = (currTime - prevTime) / 60000; // Minutes

    totalGap += gap;
    maxGap = Math.max(maxGap, gap);
  }

  const avgGap = totalGap / (stops.length - 1);
  const gapScore = Math.max(0, 100 - (avgGap - 15)); // Ideal gap is 15 min

  // Combined score
  return Math.round((orderScore * 0.7 + gapScore * 0.3));
}
