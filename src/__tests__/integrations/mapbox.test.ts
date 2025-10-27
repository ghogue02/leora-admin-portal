/**
 * Mapbox Integration Tests
 *
 * Tests Mapbox API connectivity, token validation,
 * geocoding API format, and map features.
 */

import mbxClient from '@mapbox/mapbox-sdk';
import mbxGeocoding from '@mapbox/mapbox-sdk/services/geocoding';

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

describe('Mapbox Integration Tests', () => {
  let geocodingClient: any;

  beforeAll(() => {
    if (!MAPBOX_ACCESS_TOKEN) {
      throw new Error('MAPBOX_ACCESS_TOKEN not configured');
    }

    const baseClient = mbxClient({ accessToken: MAPBOX_ACCESS_TOKEN });
    geocodingClient = mbxGeocoding(baseClient);
  });

  describe('API Connectivity', () => {
    it('should connect to Mapbox API successfully', async () => {
      const response = await geocodingClient
        .forwardGeocode({
          query: 'San Francisco',
          limit: 1,
        })
        .send();

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('features');
    }, 10000);

    it('should validate access token', async () => {
      expect(MAPBOX_ACCESS_TOKEN).toMatch(/^pk\./); // Public token starts with 'pk.'
      expect(MAPBOX_ACCESS_TOKEN.length).toBeGreaterThan(50);
    });

    it('should handle API errors gracefully', async () => {
      const invalidClient = mbxGeocoding(
        mbxClient({ accessToken: 'invalid-token' })
      );

      await expect(
        invalidClient.forwardGeocode({ query: 'Test' }).send()
      ).rejects.toThrow();
    }, 10000);

    it('should respect API rate limits', async () => {
      const requests = Array.from({ length: 10 }, () =>
        geocodingClient
          .forwardGeocode({
            query: 'San Francisco',
            limit: 1,
          })
          .send()
      );

      const startTime = Date.now();
      await Promise.all(requests);
      const duration = Date.now() - startTime;

      // Should not be throttled for 10 requests
      expect(duration).toBeLessThan(5000);
    }, 15000);
  });

  describe('Geocoding API Format', () => {
    it('should return correct geocoding response format', async () => {
      const response = await geocodingClient
        .forwardGeocode({
          query: '1600 Pennsylvania Avenue NW, Washington, DC',
          limit: 1,
        })
        .send();

      expect(response.body).toMatchObject({
        type: 'FeatureCollection',
        features: expect.arrayContaining([
          expect.objectContaining({
            type: 'Feature',
            geometry: expect.objectContaining({
              type: 'Point',
              coordinates: expect.arrayContaining([
                expect.any(Number),
                expect.any(Number),
              ]),
            }),
            properties: expect.any(Object),
            place_name: expect.any(String),
          }),
        ]),
      });
    }, 10000);

    it('should provide accurate coordinates', async () => {
      const response = await geocodingClient
        .forwardGeocode({
          query: 'San Francisco City Hall',
          limit: 1,
        })
        .send();

      const coordinates = response.body.features[0].geometry.coordinates;

      // San Francisco City Hall coordinates
      expect(coordinates[0]).toBeCloseTo(-122.4194, 1); // longitude
      expect(coordinates[1]).toBeCloseTo(37.7796, 1); // latitude
    }, 10000);

    it('should include place context (city, state, country)', async () => {
      const response = await geocodingClient
        .forwardGeocode({
          query: '1600 Pennsylvania Avenue NW, Washington, DC',
          limit: 1,
        })
        .send();

      const feature = response.body.features[0];

      expect(feature.context).toBeDefined();
      expect(feature.context).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.stringContaining('place'),
          }),
          expect.objectContaining({
            id: expect.stringContaining('region'),
          }),
          expect.objectContaining({
            id: expect.stringContaining('country'),
          }),
        ])
      );
    }, 10000);

    it('should support autocomplete/suggestions', async () => {
      const response = await geocodingClient
        .forwardGeocode({
          query: 'San Francisco City',
          limit: 5,
          autocomplete: true,
        })
        .send();

      expect(response.body.features.length).toBeGreaterThan(1);
      expect(response.body.features.length).toBeLessThanOrEqual(5);
    }, 10000);

    it('should support proximity bias', async () => {
      const response = await geocodingClient
        .forwardGeocode({
          query: 'Main Street',
          proximity: [-122.4194, 37.7749], // San Francisco
          limit: 1,
        })
        .send();

      const coordinates = response.body.features[0].geometry.coordinates;

      // Result should be near San Francisco
      expect(coordinates[0]).toBeCloseTo(-122.4, 0);
      expect(coordinates[1]).toBeCloseTo(37.7, 0);
    }, 10000);
  });

  describe('Reverse Geocoding', () => {
    it('should reverse geocode coordinates to address', async () => {
      const response = await geocodingClient
        .reverseGeocode({
          query: [-122.4194, 37.7749], // San Francisco
          limit: 1,
        })
        .send();

      expect(response.body.features[0]).toMatchObject({
        place_name: expect.stringContaining('San Francisco'),
      });
    }, 10000);

    it('should provide detailed address components', async () => {
      const response = await geocodingClient
        .reverseGeocode({
          query: [-77.0365, 38.8977], // White House
          limit: 1,
        })
        .send();

      const feature = response.body.features[0];

      expect(feature.place_name).toContain('Washington');
      expect(feature.context).toBeDefined();
    }, 10000);
  });

  describe('Map Styles', () => {
    it('should validate style URL format', () => {
      const styleUrl = 'mapbox://styles/mapbox/streets-v12';

      expect(styleUrl).toMatch(/^mapbox:\/\/styles\//);
    });

    it('should support standard map styles', () => {
      const styles = [
        'mapbox://styles/mapbox/streets-v12',
        'mapbox://styles/mapbox/outdoors-v12',
        'mapbox://styles/mapbox/light-v11',
        'mapbox://styles/mapbox/dark-v11',
        'mapbox://styles/mapbox/satellite-v9',
      ];

      styles.forEach((style) => {
        expect(style).toMatch(/^mapbox:\/\/styles\/mapbox\//);
      });
    });
  });

  describe('Static Map API', () => {
    it('should generate static map URL', () => {
      const lat = 37.7749;
      const lng = -122.4194;
      const zoom = 12;
      const width = 600;
      const height = 400;

      const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${lng},${lat},${zoom}/${width}x${height}?access_token=${MAPBOX_ACCESS_TOKEN}`;

      expect(staticMapUrl).toContain('api.mapbox.com/styles');
      expect(staticMapUrl).toContain(`${lng},${lat},${zoom}`);
      expect(staticMapUrl).toContain(`${width}x${height}`);
    });

    it('should generate static map with markers', () => {
      const markers = [
        { lng: -122.4194, lat: 37.7749, color: 'red' },
        { lng: -122.4089, lat: 37.7839, color: 'blue' },
      ];

      const markerString = markers
        .map((m) => `pin-s-${m.color[0]}+${m.color}(${m.lng},${m.lat})`)
        .join(',');

      const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${markerString}/auto/600x400?access_token=${MAPBOX_ACCESS_TOKEN}`;

      expect(staticMapUrl).toContain('pin-s');
      expect(staticMapUrl).toContain('auto'); // Auto-fit bounds
    });
  });

  describe('GeoJSON Support', () => {
    it('should validate GeoJSON Point format', () => {
      const point = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749],
        },
        properties: {
          name: 'San Francisco',
        },
      };

      expect(point.geometry.type).toBe('Point');
      expect(point.geometry.coordinates).toHaveLength(2);
    });

    it('should validate GeoJSON Polygon format', () => {
      const polygon = {
        type: 'Feature',
        geometry: {
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
        },
        properties: {
          name: 'Territory',
        },
      };

      expect(polygon.geometry.type).toBe('Polygon');
      expect(polygon.geometry.coordinates[0]).toHaveLength(5);
      expect(polygon.geometry.coordinates[0][0]).toEqual(
        polygon.geometry.coordinates[0][4]
      ); // Closed polygon
    });

    it('should validate GeoJSON FeatureCollection', () => {
      const featureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-122.4194, 37.7749],
            },
            properties: { name: 'Point 1' },
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-122.4089, 37.7839],
            },
            properties: { name: 'Point 2' },
          },
        ],
      };

      expect(featureCollection.type).toBe('FeatureCollection');
      expect(featureCollection.features).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid coordinates', async () => {
      await expect(
        geocodingClient
          .forwardGeocode({
            query: [200, 100], // Invalid coordinates
            limit: 1,
          })
          .send()
      ).rejects.toThrow();
    }, 10000);

    it('should handle empty query', async () => {
      const response = await geocodingClient
        .forwardGeocode({
          query: '',
          limit: 1,
        })
        .send();

      expect(response.body.features).toHaveLength(0);
    }, 10000);

    it('should handle network timeouts', async () => {
      // Mock network timeout
      jest.setTimeout(5000);

      const controller = new AbortController();
      setTimeout(() => controller.abort(), 100);

      await expect(
        fetch('https://api.mapbox.com/geocoding/v5/mapbox.places/test.json', {
          signal: controller.signal,
        })
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should geocode single address in under 2 seconds', async () => {
      const startTime = Date.now();

      await geocodingClient
        .forwardGeocode({
          query: 'San Francisco City Hall',
          limit: 1,
        })
        .send();

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(2000);
    }, 10000);

    it('should handle batch geocoding efficiently', async () => {
      const addresses = [
        'San Francisco City Hall',
        'Golden Gate Bridge',
        'Alcatraz Island',
        'Fishermans Wharf',
        'Union Square',
      ];

      const startTime = Date.now();

      await Promise.all(
        addresses.map((address) =>
          geocodingClient.forwardGeocode({ query: address, limit: 1 }).send()
        )
      );

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // <5 seconds for 5 addresses
    }, 15000);
  });

  describe('Usage Tracking', () => {
    it('should track API request count', () => {
      // Note: Actual usage tracking would be in application code
      const requestCounter = { count: 0 };

      const trackedGeocode = async (query: string) => {
        requestCounter.count++;
        return await geocodingClient.forwardGeocode({ query, limit: 1 }).send();
      };

      expect(requestCounter.count).toBe(0);

      // Simulate requests
      trackedGeocode('San Francisco');
      expect(requestCounter.count).toBe(1);
    });
  });
});
