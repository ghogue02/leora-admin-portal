/**
 * Distance calculation utilities using Haversine formula
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CustomerWithDistance {
  id: string;
  name: string;
  distance: number; // in miles
  drivingTime?: number; // in minutes (estimated)
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 3959; // Earth's radius in miles (use 6371 for kilometers)

  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate distances from origin to multiple destinations
 */
export function calculateDistances<T extends { latitude: number; longitude: number }>(
  origin: Coordinates,
  destinations: T[]
): Array<T & { distance: number }> {
  return destinations.map(destination => ({
    ...destination,
    distance: calculateDistance(origin, destination),
  }));
}

/**
 * Find customers within a specific radius
 */
export function findCustomersWithinRadius<T extends { latitude: number; longitude: number }>(
  origin: Coordinates,
  customers: T[],
  radiusMiles: number
): Array<T & { distance: number }> {
  return calculateDistances(origin, customers)
    .filter(c => c.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance);
}

/**
 * Estimate driving time based on distance
 * Assumes average speed of 35 mph (city driving)
 */
export function estimateDrivingTime(distanceMiles: number): number {
  const avgSpeedMph = 35;
  return Math.round((distanceMiles / avgSpeedMph) * 60); // Convert to minutes
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate bearing between two points (direction in degrees)
 */
export function calculateBearing(
  point1: Coordinates,
  point2: Coordinates
): number {
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = Math.atan2(y, x);

  // Convert to degrees and normalize to 0-360
  return (toDegrees(bearing) + 360) % 360;
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Get compass direction from bearing
 */
export function getCompassDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Format distance for display
 */
export function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return `${Math.round(miles * 5280)} feet`;
  } else if (miles < 1) {
    return `${miles.toFixed(1)} miles`;
  } else {
    return `${miles.toFixed(1)} miles`;
  }
}

/**
 * Format driving time for display
 */
export function formatDrivingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}
