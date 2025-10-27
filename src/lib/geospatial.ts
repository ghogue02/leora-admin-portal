import * as turf from '@turf/turf';
import type { Feature, Polygon, Position, Point } from 'geojson';

export interface Bounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface PointLocation {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two points in miles
 */
export function calculateDistance(
  point1: PointLocation,
  point2: PointLocation
): number {
  const from = turf.point([point1.longitude, point1.latitude]);
  const to = turf.point([point2.longitude, point2.latitude]);
  const distance = turf.distance(from, to, { units: 'miles' });
  return distance;
}

/**
 * Get bounding box from a polygon
 */
export function getBoundingBox(polygon: Feature<Polygon> | Polygon): Bounds {
  const bbox = turf.bbox(polygon);
  return {
    minLng: bbox[0],
    minLat: bbox[1],
    maxLng: bbox[2],
    maxLat: bbox[3]
  };
}

/**
 * Get center point of a polygon
 */
export function centerOfPolygon(polygon: Feature<Polygon> | Polygon): [number, number] {
  const center = turf.center(polygon);
  return center.geometry.coordinates as [number, number];
}

/**
 * Simplify polygon by reducing number of points
 */
export function simplifyPolygon(
  polygon: Feature<Polygon> | Polygon,
  tolerance: number = 0.01
): Feature<Polygon> {
  return turf.simplify(polygon, { tolerance, highQuality: true }) as Feature<Polygon>;
}

/**
 * Validate GeoJSON format
 */
export function validateGeoJSON(json: any): boolean {
  try {
    if (!json || typeof json !== 'object') return false;

    // Check if it's a valid GeoJSON object
    if (!json.type) return false;

    // For Polygon type
    if (json.type === 'Polygon') {
      if (!Array.isArray(json.coordinates)) return false;
      if (json.coordinates.length === 0) return false;

      // Check first ring (exterior ring)
      const ring = json.coordinates[0];
      if (!Array.isArray(ring) || ring.length < 4) return false;

      // Check if ring is closed
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) return false;

      return true;
    }

    // For Feature type
    if (json.type === 'Feature') {
      return json.geometry && validateGeoJSON(json.geometry);
    }

    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a point is inside a polygon
 */
export function isPointInPolygon(
  point: PointLocation,
  polygon: Feature<Polygon> | Polygon
): boolean {
  const pt = turf.point([point.longitude, point.latitude]);
  return turf.booleanPointInPolygon(pt, polygon);
}

/**
 * Find all points within a radius (in miles)
 */
export function findPointsWithinRadius(
  center: PointLocation,
  points: Array<PointLocation & { id: string }>,
  radiusMiles: number
): Array<PointLocation & { id: string; distance: number }> {
  const centerPoint = turf.point([center.longitude, center.latitude]);
  const results: Array<PointLocation & { id: string; distance: number }> = [];

  for (const point of points) {
    const pt = turf.point([point.longitude, point.latitude]);
    const distance = turf.distance(centerPoint, pt, { units: 'miles' });

    if (distance <= radiusMiles) {
      results.push({ ...point, distance });
    }
  }

  // Sort by distance
  return results.sort((a, b) => a.distance - b.distance);
}

/**
 * Create a circle polygon (approximation) around a point
 */
export function createCircle(
  center: PointLocation,
  radiusMiles: number,
  steps: number = 64
): Feature<Polygon> {
  const centerPoint = turf.point([center.longitude, center.latitude]);
  return turf.circle(centerPoint, radiusMiles, { units: 'miles', steps });
}

/**
 * Calculate the area of a polygon in square miles
 */
export function calculatePolygonArea(polygon: Feature<Polygon> | Polygon): number {
  const area = turf.area(polygon);
  // Convert square meters to square miles
  return area * 0.00000038610215855;
}

/**
 * Optimize route using nearest neighbor algorithm (TSP approximation)
 */
export function optimizeRoute(
  startLocation: PointLocation,
  destinations: Array<PointLocation & { id: string }>
): {
  optimizedOrder: Array<PointLocation & { id: string }>;
  totalDistance: number;
} {
  if (destinations.length === 0) {
    return { optimizedOrder: [], totalDistance: 0 };
  }

  const visited = new Set<string>();
  const optimizedOrder: Array<PointLocation & { id: string }> = [];
  let currentLocation = startLocation;
  let totalDistance = 0;

  // Nearest neighbor algorithm
  while (visited.size < destinations.length) {
    let nearestPoint: (PointLocation & { id: string }) | null = null;
    let nearestDistance = Infinity;

    for (const destination of destinations) {
      if (visited.has(destination.id)) continue;

      const distance = calculateDistance(currentLocation, destination);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = destination;
      }
    }

    if (nearestPoint) {
      visited.add(nearestPoint.id);
      optimizedOrder.push(nearestPoint);
      totalDistance += nearestDistance;
      currentLocation = nearestPoint;
    }
  }

  return { optimizedOrder, totalDistance };
}

/**
 * Cluster points using k-means approximation
 */
export function clusterPoints(
  points: Array<PointLocation & { id: string }>,
  clusterCount: number
): Array<Feature<Polygon>> {
  if (points.length === 0 || clusterCount <= 0) return [];

  // Use turf's clustersKmeans
  const features = turf.featureCollection(
    points.map(p => turf.point([p.longitude, p.latitude], { id: p.id }))
  );

  const clustered = turf.clustersKmeans(features, { numberOfClusters: clusterCount });

  // Create convex hull for each cluster
  const polygons: Array<Feature<Polygon>> = [];

  for (let i = 0; i < clusterCount; i++) {
    const clusterPoints = clustered.features.filter(
      f => f.properties?.cluster === i
    );

    if (clusterPoints.length >= 3) {
      const hull = turf.convex(turf.featureCollection(clusterPoints));
      if (hull) {
        polygons.push(hull as Feature<Polygon>);
      }
    }
  }

  return polygons;
}

/**
 * Buffer a polygon (expand it by a certain distance)
 */
export function bufferPolygon(
  polygon: Feature<Polygon> | Polygon,
  distanceMiles: number
): Feature<Polygon> {
  return turf.buffer(polygon, distanceMiles, { units: 'miles' }) as Feature<Polygon>;
}

/**
 * Check if two polygons intersect
 */
export function polygonsIntersect(
  polygon1: Feature<Polygon> | Polygon,
  polygon2: Feature<Polygon> | Polygon
): boolean {
  return turf.booleanIntersects(polygon1, polygon2);
}

/**
 * Get intersection of two polygons
 */
export function getPolygonIntersection(
  polygon1: Feature<Polygon> | Polygon,
  polygon2: Feature<Polygon> | Polygon
): Feature<Polygon> | null {
  try {
    const intersection = turf.intersect(polygon1, polygon2);
    return intersection as Feature<Polygon> | null;
  } catch (error) {
    return null;
  }
}
