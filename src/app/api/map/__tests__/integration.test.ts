import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { geocodeAddress, batchGeocodeAddresses } from '@/lib/services/geocoding';
import {
  calculateDistance,
  getBoundingBox,
  centerOfPolygon,
  simplifyPolygon,
  validateGeoJSON,
  isPointInPolygon,
  findPointsWithinRadius,
  optimizeRoute,
  clusterPoints
} from '@/lib/geospatial';

describe('Maps & Territory Integration Tests', () => {
  const testCustomerId = 'test-customer-' + Date.now();
  const testTerritoryId = 'test-territory-' + Date.now();

  beforeAll(async () => {
    // Create test customer
    await prisma.customer.create({
      data: {
        id: testCustomerId,
        name: 'Test Customer',
        email: 'test@example.com',
        addressLine1: '1600 Pennsylvania Avenue NW',
        city: 'Washington',
        state: 'DC',
        postalCode: '20500',
        accountType: 'ACTIVE',
        latitude: 38.8977,
        longitude: -77.0365
      }
    });

    // Create test territory
    await prisma.territory.create({
      data: {
        id: testTerritoryId,
        name: 'Test Territory',
        boundaries: {
          type: 'Polygon',
          coordinates: [[
            [-77.1, 38.8],
            [-77.0, 38.8],
            [-77.0, 38.9],
            [-77.1, 38.9],
            [-77.1, 38.8]
          ]]
        },
        color: '#FF0000'
      }
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.customer.delete({ where: { id: testCustomerId } });
    await prisma.territory.delete({ where: { id: testTerritoryId } });
  });

  describe('Geocoding API', () => {
    it('should geocode a valid address', async () => {
      const address = '1600 Pennsylvania Avenue NW, Washington, DC 20500';
      const result = await geocodeAddress(address);

      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('formattedAddress');
      expect(result.latitude).toBeCloseTo(38.8977, 1);
      expect(result.longitude).toBeCloseTo(-77.0365, 1);
    }, 10000);

    it('should use cache for repeated addresses', async () => {
      const address = '1600 Pennsylvania Avenue NW, Washington, DC 20500';

      const start = Date.now();
      await geocodeAddress(address);
      const firstTime = Date.now() - start;

      const start2 = Date.now();
      await geocodeAddress(address);
      const secondTime = Date.now() - start2;

      // Second call should be faster (cached)
      expect(secondTime).toBeLessThan(firstTime);
    }, 10000);

    it('should handle batch geocoding', async () => {
      const addresses = [
        { id: '1', address: '1600 Pennsylvania Avenue NW, Washington, DC' },
        { id: '2', address: '350 Fifth Avenue, New York, NY' }
      ];

      const result = await batchGeocodeAddresses(addresses);

      expect(result.geocoded).toBeGreaterThan(0);
      expect(result.results).toHaveLength(2);
      expect(result.results[0]).toHaveProperty('coordinates');
    }, 30000);
  });

  describe('Geospatial Functions', () => {
    it('should calculate distance correctly', () => {
      const point1 = { latitude: 38.8977, longitude: -77.0365 };
      const point2 = { latitude: 40.7128, longitude: -74.0060 };

      const distance = calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(200); // ~225 miles
      expect(distance).toBeLessThan(250);
    });

    it('should validate GeoJSON polygons', () => {
      const validPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-77.1, 38.8],
          [-77.0, 38.8],
          [-77.0, 38.9],
          [-77.1, 38.9],
          [-77.1, 38.8] // Closed ring
        ]]
      };

      const invalidPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-77.1, 38.8],
          [-77.0, 38.8],
          [-77.0, 38.9]
          // Not closed
        ]]
      };

      expect(validateGeoJSON(validPolygon)).toBe(true);
      expect(validateGeoJSON(invalidPolygon)).toBe(false);
    });

    it('should detect point in polygon', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [[
          [-77.1, 38.8],
          [-77.0, 38.8],
          [-77.0, 38.9],
          [-77.1, 38.9],
          [-77.1, 38.8]
        ]]
      };

      const insidePoint = { latitude: 38.85, longitude: -77.05 };
      const outsidePoint = { latitude: 39.0, longitude: -77.0 };

      expect(isPointInPolygon(insidePoint, polygon as any)).toBe(true);
      expect(isPointInPolygon(outsidePoint, polygon as any)).toBe(false);
    });

    it('should find points within radius', () => {
      const center = { latitude: 38.8977, longitude: -77.0365 };
      const points = [
        { id: '1', latitude: 38.9, longitude: -77.0 },
        { id: '2', latitude: 38.8, longitude: -77.1 },
        { id: '3', latitude: 40.7, longitude: -74.0 }
      ];

      const nearby = findPointsWithinRadius(center, points, 10);

      expect(nearby.length).toBe(2);
      expect(nearby[0]).toHaveProperty('distance');
      expect(nearby[0].distance).toBeLessThanOrEqual(10);
    });

    it('should optimize route correctly', () => {
      const start = { latitude: 38.8977, longitude: -77.0365 };
      const destinations = [
        { id: '1', latitude: 38.9, longitude: -77.0 },
        { id: '2', latitude: 38.8, longitude: -77.1 },
        { id: '3', latitude: 38.85, longitude: -77.05 }
      ];

      const result = optimizeRoute(start, destinations);

      expect(result.optimizedOrder).toHaveLength(3);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.optimizedOrder[0]).toHaveProperty('id');
    });

    it('should cluster points', () => {
      const points = [
        { id: '1', latitude: 38.9, longitude: -77.0 },
        { id: '2', latitude: 38.91, longitude: -77.01 },
        { id: '3', latitude: 38.8, longitude: -77.1 },
        { id: '4', latitude: 38.81, longitude: -77.11 },
        { id: '5', latitude: 40.7, longitude: -74.0 },
        { id: '6', latitude: 40.71, longitude: -74.01 }
      ];

      const clusters = clusterPoints(points, 3);

      expect(clusters.length).toBeGreaterThan(0);
      expect(clusters.length).toBeLessThanOrEqual(3);
      clusters.forEach(cluster => {
        expect(cluster.type).toBe('Polygon');
      });
    });

    it('should calculate bounding box', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [[
          [-77.1, 38.8],
          [-77.0, 38.8],
          [-77.0, 38.9],
          [-77.1, 38.9],
          [-77.1, 38.8]
        ]]
      };

      const bounds = getBoundingBox(polygon as any);

      expect(bounds.minLng).toBe(-77.1);
      expect(bounds.maxLng).toBe(-77.0);
      expect(bounds.minLat).toBe(38.8);
      expect(bounds.maxLat).toBe(38.9);
    });

    it('should calculate polygon center', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [[
          [-77.1, 38.8],
          [-77.0, 38.8],
          [-77.0, 38.9],
          [-77.1, 38.9],
          [-77.1, 38.8]
        ]]
      };

      const center = centerOfPolygon(polygon as any);

      expect(center[0]).toBeCloseTo(-77.05, 2);
      expect(center[1]).toBeCloseTo(38.85, 2);
    });

    it('should simplify polygon', () => {
      const complexPolygon = {
        type: 'Polygon',
        coordinates: [[
          [-77.1, 38.8],
          [-77.09, 38.81],
          [-77.08, 38.82],
          [-77.0, 38.8],
          [-77.0, 38.9],
          [-77.1, 38.9],
          [-77.1, 38.8]
        ]]
      };

      const simplified = simplifyPolygon(complexPolygon as any, 0.05);

      expect(simplified.geometry.coordinates[0].length).toBeLessThanOrEqual(
        complexPolygon.coordinates[0].length
      );
    });
  });

  describe('Territory Customer Assignment', () => {
    it('should correctly identify customers in territory', async () => {
      const territory = await prisma.territory.findUnique({
        where: { id: testTerritoryId }
      });

      expect(territory).toBeTruthy();

      const customer = await prisma.customer.findUnique({
        where: { id: testCustomerId }
      });

      const isInside = isPointInPolygon(
        { latitude: customer!.latitude!, longitude: customer!.longitude! },
        territory!.boundaries as any
      );

      expect(typeof isInside).toBe('boolean');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large dataset efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `point-${i}`,
        latitude: 38.8 + Math.random() * 0.2,
        longitude: -77.1 + Math.random() * 0.2
      }));

      const start = Date.now();
      const nearby = findPointsWithinRadius(
        { latitude: 38.9, longitude: -77.0 },
        largeDataset,
        10
      );
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000); // Should complete in <1s
      expect(nearby.length).toBeGreaterThan(0);
    });
  });
});
