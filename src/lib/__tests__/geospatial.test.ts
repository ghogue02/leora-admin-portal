/**
 * Geospatial Calculation Tests
 *
 * Tests point-in-polygon, distance calculations,
 * bounding boxes, and GeoJSON utilities.
 */

import {
  isPointInPolygon,
  calculateDistance,
  calculateBoundingBox,
  simplifyPolygon,
  validateGeoJSON,
  calculateCenterPoint,
  findNearestPoint,
  calculateArea,
} from '@/lib/geospatial';

describe('Geospatial Calculation Tests', () => {
  describe('isPointInPolygon', () => {
    const squarePolygon = [
      [-122.5, 37.7],
      [-122.3, 37.7],
      [-122.3, 37.9],
      [-122.5, 37.9],
      [-122.5, 37.7],
    ];

    it('should correctly identify point inside square polygon', () => {
      expect(isPointInPolygon(37.8, -122.4, squarePolygon)).toBe(true);
    });

    it('should correctly identify point outside square polygon', () => {
      expect(isPointInPolygon(37.6, -122.4, squarePolygon)).toBe(false);
    });

    it('should handle point on polygon edge', () => {
      expect(isPointInPolygon(37.7, -122.4, squarePolygon)).toBe(true);
    });

    it('should handle point at polygon vertex', () => {
      expect(isPointInPolygon(37.7, -122.5, squarePolygon)).toBe(true);
    });

    it('should work with complex irregular polygon', () => {
      const irregularPolygon = [
        [-122.5, 37.7],
        [-122.4, 37.75],
        [-122.3, 37.7],
        [-122.35, 37.85],
        [-122.3, 37.9],
        [-122.5, 37.9],
        [-122.5, 37.7],
      ];

      expect(isPointInPolygon(37.8, -122.4, irregularPolygon)).toBe(true);
      expect(isPointInPolygon(37.8, -122.2, irregularPolygon)).toBe(false);
    });

    it('should handle polygon with holes (donut)', () => {
      const polygonWithHole = {
        type: 'Polygon',
        coordinates: [
          // Outer ring
          [
            [-122.5, 37.7],
            [-122.3, 37.7],
            [-122.3, 37.9],
            [-122.5, 37.9],
            [-122.5, 37.7],
          ],
          // Inner hole
          [
            [-122.45, 37.75],
            [-122.35, 37.75],
            [-122.35, 37.85],
            [-122.45, 37.85],
            [-122.45, 37.75],
          ],
        ],
      };

      // Point in outer ring but inside hole
      expect(isPointInPolygon(37.8, -122.4, polygonWithHole)).toBe(false);

      // Point in outer ring outside hole
      expect(isPointInPolygon(37.8, -122.48, polygonWithHole)).toBe(true);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance using Haversine formula', () => {
      // San Francisco to Los Angeles (~559 km)
      const sf = { lat: 37.7749, lng: -122.4194 };
      const la = { lat: 34.0522, lng: -118.2437 };

      const distance = calculateDistance(sf.lat, sf.lng, la.lat, la.lng);

      expect(distance).toBeCloseTo(559, 0); // ~559 km
    });

    it('should return 0 for same coordinates', () => {
      const distance = calculateDistance(37.7749, -122.4194, 37.7749, -122.4194);
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // Two nearby points (~1 km apart)
      const point1 = { lat: 37.7749, lng: -122.4194 };
      const point2 = { lat: 37.7839, lng: -122.4089 };

      const distance = calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);

      expect(distance).toBeCloseTo(1.3, 1); // ~1.3 km
    });

    it('should handle antipodal points', () => {
      // Opposite sides of Earth
      const point1 = { lat: 0, lng: 0 };
      const point2 = { lat: 0, lng: 180 };

      const distance = calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);

      expect(distance).toBeCloseTo(20015, 0); // ~half Earth circumference
    });

    it('should support unit parameter (km, mi, m)', () => {
      const sf = { lat: 37.7749, lng: -122.4194 };
      const la = { lat: 34.0522, lng: -118.2437 };

      const km = calculateDistance(sf.lat, sf.lng, la.lat, la.lng, 'km');
      const mi = calculateDistance(sf.lat, sf.lng, la.lat, la.lng, 'mi');
      const m = calculateDistance(sf.lat, sf.lng, la.lat, la.lng, 'm');

      expect(km).toBeCloseTo(559, 0);
      expect(mi).toBeCloseTo(347, 0);
      expect(m).toBeCloseTo(559000, 0);
    });
  });

  describe('calculateBoundingBox', () => {
    it('should calculate bounding box for points', () => {
      const points = [
        { lat: 37.7749, lng: -122.4194 },
        { lat: 37.8044, lng: -122.2711 },
        { lat: 37.7558, lng: -122.4449 },
      ];

      const bbox = calculateBoundingBox(points);

      expect(bbox).toEqual({
        north: 37.8044,
        south: 37.7558,
        east: -122.2711,
        west: -122.4449,
      });
    });

    it('should handle single point', () => {
      const points = [{ lat: 37.7749, lng: -122.4194 }];

      const bbox = calculateBoundingBox(points);

      expect(bbox).toEqual({
        north: 37.7749,
        south: 37.7749,
        east: -122.4194,
        west: -122.4194,
      });
    });

    it('should add padding to bounding box', () => {
      const points = [
        { lat: 37.7749, lng: -122.4194 },
        { lat: 37.8044, lng: -122.2711 },
      ];

      const bbox = calculateBoundingBox(points, 0.01); // 0.01 degree padding

      expect(bbox.north).toBeCloseTo(37.8144, 4);
      expect(bbox.south).toBeCloseTo(37.7649, 4);
      expect(bbox.east).toBeCloseTo(-122.2611, 4);
      expect(bbox.west).toBeCloseTo(-122.4294, 4);
    });

    it('should handle points crossing antimeridian', () => {
      const points = [
        { lat: 0, lng: 179 },
        { lat: 0, lng: -179 },
      ];

      const bbox = calculateBoundingBox(points);

      expect(bbox.east).toBe(-179);
      expect(bbox.west).toBe(179);
    });
  });

  describe('simplifyPolygon', () => {
    it('should simplify polygon using Douglas-Peucker algorithm', () => {
      const complexPolygon = [
        [0, 0],
        [0.1, 0.1],
        [0.2, 0.05],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ];

      const simplified = simplifyPolygon(complexPolygon, 0.15);

      expect(simplified.length).toBeLessThan(complexPolygon.length);
      expect(simplified[0]).toEqual(complexPolygon[0]); // First point preserved
      expect(simplified[simplified.length - 1]).toEqual(
        complexPolygon[complexPolygon.length - 1]
      ); // Last point preserved
    });

    it('should preserve polygon shape with low tolerance', () => {
      const polygon = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ];

      const simplified = simplifyPolygon(polygon, 0.01);

      expect(simplified).toEqual(polygon); // Should be unchanged
    });

    it('should reduce points significantly with high tolerance', () => {
      const complexPolygon = Array.from({ length: 100 }, (_, i) => [
        i / 100,
        Math.sin((i / 100) * Math.PI * 2) * 0.1,
      ]);

      const simplified = simplifyPolygon(complexPolygon, 0.5);

      expect(simplified.length).toBeLessThan(10);
    });
  });

  describe('validateGeoJSON', () => {
    it('should validate correct Polygon GeoJSON', () => {
      const validGeoJSON = {
        type: 'Polygon',
        coordinates: [
          [
            [-122.5, 37.7],
            [-122.3, 37.7],
            [-122.3, 37.9],
            [-122.5, 37.9],
            [-122.5, 37.7],
          ],
        ],
      };

      expect(validateGeoJSON(validGeoJSON)).toBe(true);
    });

    it('should validate correct Point GeoJSON', () => {
      const validGeoJSON = {
        type: 'Point',
        coordinates: [-122.4194, 37.7749],
      };

      expect(validateGeoJSON(validGeoJSON)).toBe(true);
    });

    it('should reject invalid GeoJSON type', () => {
      const invalidGeoJSON = {
        type: 'InvalidType',
        coordinates: [],
      };

      expect(validateGeoJSON(invalidGeoJSON as any)).toBe(false);
    });

    it('should reject polygon with less than 4 points', () => {
      const invalidGeoJSON = {
        type: 'Polygon',
        coordinates: [
          [
            [-122.5, 37.7],
            [-122.3, 37.7],
            [-122.5, 37.7],
          ],
        ],
      };

      expect(validateGeoJSON(invalidGeoJSON)).toBe(false);
    });

    it('should reject non-closed polygon', () => {
      const invalidGeoJSON = {
        type: 'Polygon',
        coordinates: [
          [
            [-122.5, 37.7],
            [-122.3, 37.7],
            [-122.3, 37.9],
            [-122.5, 37.9],
          ],
        ],
      };

      expect(validateGeoJSON(invalidGeoJSON)).toBe(false);
    });

    it('should reject coordinates outside valid range', () => {
      const invalidGeoJSON = {
        type: 'Point',
        coordinates: [-200, 100], // Invalid
      };

      expect(validateGeoJSON(invalidGeoJSON)).toBe(false);
    });
  });

  describe('calculateCenterPoint', () => {
    it('should calculate center of polygon', () => {
      const polygon = [
        [-122.5, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.9],
        [-122.5, 37.9],
        [-122.5, 37.7],
      ];

      const center = calculateCenterPoint(polygon);

      expect(center.lat).toBeCloseTo(37.8, 1);
      expect(center.lng).toBeCloseTo(-122.4, 1);
    });

    it('should calculate centroid for irregular polygon', () => {
      const polygon = [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ];

      const center = calculateCenterPoint(polygon);

      expect(center.lat).toBe(2);
      expect(center.lng).toBe(2);
    });
  });

  describe('findNearestPoint', () => {
    it('should find nearest point from array', () => {
      const target = { lat: 37.7749, lng: -122.4194 };
      const points = [
        { id: '1', lat: 37.8044, lng: -122.2711 },
        { id: '2', lat: 37.7558, lng: -122.4449 }, // Nearest
        { id: '3', lat: 37.6879, lng: -122.4702 },
      ];

      const nearest = findNearestPoint(target, points);

      expect(nearest.id).toBe('2');
    });

    it('should return null for empty array', () => {
      const target = { lat: 37.7749, lng: -122.4194 };
      const points: any[] = [];

      const nearest = findNearestPoint(target, points);

      expect(nearest).toBeNull();
    });

    it('should find multiple nearest points', () => {
      const target = { lat: 37.7749, lng: -122.4194 };
      const points = [
        { id: '1', lat: 37.7750, lng: -122.4195 }, // Very close
        { id: '2', lat: 37.7751, lng: -122.4196 }, // Very close
        { id: '3', lat: 37.8044, lng: -122.2711 }, // Far
      ];

      const nearest = findNearestPoint(target, points, 2);

      expect(nearest).toHaveLength(2);
      expect(nearest[0].id).toBe('1');
      expect(nearest[1].id).toBe('2');
    });
  });

  describe('calculateArea', () => {
    it('should calculate area of polygon in square kilometers', () => {
      const polygon = [
        [-122.5, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.9],
        [-122.5, 37.9],
        [-122.5, 37.7],
      ];

      const area = calculateArea(polygon);

      expect(area).toBeGreaterThan(0);
      expect(area).toBeCloseTo(800, -2); // Approximate area in km²
    });

    it('should return 0 for degenerate polygon', () => {
      const polygon = [
        [0, 0],
        [0, 0],
        [0, 0],
        [0, 0],
      ];

      const area = calculateArea(polygon);

      expect(area).toBe(0);
    });

    it('should support different units (km², mi², m²)', () => {
      const polygon = [
        [-122.5, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.9],
        [-122.5, 37.9],
        [-122.5, 37.7],
      ];

      const km2 = calculateArea(polygon, 'km2');
      const mi2 = calculateArea(polygon, 'mi2');
      const m2 = calculateArea(polygon, 'm2');

      expect(mi2).toBeCloseTo(km2 * 0.386102, 1);
      expect(m2).toBeCloseTo(km2 * 1000000, -3);
    });
  });

  describe('Performance', () => {
    it('should handle 1000 point-in-polygon checks quickly', () => {
      const polygon = [
        [-122.5, 37.7],
        [-122.3, 37.7],
        [-122.3, 37.9],
        [-122.5, 37.9],
        [-122.5, 37.7],
      ];

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        const lat = 37.7 + Math.random() * 0.2;
        const lng = -122.5 + Math.random() * 0.2;
        isPointInPolygon(lat, lng, polygon);
      }

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should calculate 1000 distances quickly', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        calculateDistance(
          37.7749,
          -122.4194,
          37.7749 + Math.random() * 0.1,
          -122.4194 + Math.random() * 0.1
        );
      }

      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50); // Should complete in <50ms
    });
  });
});
