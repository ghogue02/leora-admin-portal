/**
 * Geocoding Integration Tests
 *
 * Tests the geocoding service with Mapbox API integration,
 * rate limiting, caching, and error handling.
 */

import { geocodeAddress, geocodeBatch } from '@/lib/geocoding';
import { prisma } from '@/lib/prisma';

// Mock Mapbox API
jest.mock('@/lib/mapbox', () => ({
  mapboxClient: {
    geocoding: {
      forwardGeocode: jest.fn(),
    },
  },
}));

const mockMapboxClient = require('@/lib/mapbox').mapboxClient;

describe('Geocoding Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('geocodeAddress', () => {
    it('should geocode valid address successfully', async () => {
      const mockResponse = {
        body: {
          features: [
            {
              center: [-122.4194, 37.7749],
              place_name: '123 Main St, San Francisco, CA 94102',
            },
          ],
        },
      };

      mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue(mockResponse);

      const result = await geocodeAddress('123 Main St, San Francisco, CA 94102');

      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        formattedAddress: '123 Main St, San Francisco, CA 94102',
      });
    });

    it('should handle invalid addresses gracefully', async () => {
      const mockResponse = {
        body: {
          features: [],
        },
      };

      mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue(mockResponse);

      const result = await geocodeAddress('Invalid Address XYZ');

      expect(result).toBeNull();
    });

    it('should validate coordinate ranges', async () => {
      const mockResponse = {
        body: {
          features: [
            {
              center: [-200, 100], // Invalid coordinates
              place_name: 'Test Address',
            },
          ],
        },
      };

      mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue(mockResponse);

      const result = await geocodeAddress('Test Address');

      expect(result).toBeNull(); // Should reject invalid coordinates
    });

    it('should handle API failures with retry', async () => {
      mockMapboxClient.geocoding.forwardGeocode
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          body: {
            features: [
              {
                center: [-122.4194, 37.7749],
                place_name: '123 Main St',
              },
            ],
          },
        });

      const result = await geocodeAddress('123 Main St');

      expect(result).not.toBeNull();
      expect(mockMapboxClient.geocoding.forwardGeocode).toHaveBeenCalledTimes(2);
    });

    it('should cache geocoding results', async () => {
      const mockResponse = {
        body: {
          features: [
            {
              center: [-122.4194, 37.7749],
              place_name: '123 Main St',
            },
          ],
        },
      };

      mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue(mockResponse);

      // First call
      await geocodeAddress('123 Main St');

      // Second call (should use cache)
      const result = await geocodeAddress('123 Main St');

      expect(result).not.toBeNull();
      expect(mockMapboxClient.geocoding.forwardGeocode).toHaveBeenCalledTimes(1);
    });
  });

  describe('geocodeBatch', () => {
    it('should geocode batch of addresses respecting rate limits', async () => {
      const addresses = Array.from({ length: 100 }, (_, i) => `${i} Test St`);

      mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue({
        body: {
          features: [
            {
              center: [-122.4194, 37.7749],
              place_name: 'Test Address',
            },
          ],
        },
      });

      const startTime = Date.now();
      const results = await geocodeBatch(addresses);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(100);
      // Should take at least 10 seconds for 100 addresses at 600/min
      expect(duration).toBeGreaterThan(9000);
    });

    it('should handle partial failures in batch', async () => {
      const addresses = ['Valid Address 1', 'Invalid XYZ', 'Valid Address 2'];

      mockMapboxClient.geocoding.forwardGeocode
        .mockResolvedValueOnce({
          body: { features: [{ center: [-122.4194, 37.7749], place_name: 'Valid 1' }] },
        })
        .mockResolvedValueOnce({
          body: { features: [] }, // Invalid address
        })
        .mockResolvedValueOnce({
          body: { features: [{ center: [-122.4194, 37.7749], place_name: 'Valid 2' }] },
        });

      const results = await geocodeBatch(addresses);

      expect(results).toHaveLength(3);
      expect(results[0]).not.toBeNull();
      expect(results[1]).toBeNull();
      expect(results[2]).not.toBeNull();
    });

    it('should skip already geocoded addresses', async () => {
      const addresses = ['123 Main St', '456 Oak Ave'];

      // Mock database to show first address already geocoded
      jest.spyOn(prisma.customer, 'findFirst').mockResolvedValueOnce({
        id: '1',
        latitude: 37.7749,
        longitude: -122.4194,
      } as any);

      await geocodeBatch(addresses);

      // Should only geocode the second address
      expect(mockMapboxClient.geocoding.forwardGeocode).toHaveBeenCalledTimes(1);
    });

    it('should report progress during batch geocoding', async () => {
      const addresses = Array.from({ length: 10 }, (_, i) => `${i} Test St`);
      const progressCallback = jest.fn();

      mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue({
        body: { features: [{ center: [-122.4194, 37.7749], place_name: 'Test' }] },
      });

      await geocodeBatch(addresses, { onProgress: progressCallback });

      expect(progressCallback).toHaveBeenCalledTimes(10);
      expect(progressCallback).toHaveBeenLastCalledWith({
        completed: 10,
        total: 10,
        percentage: 100,
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should respect 600 requests per minute limit', async () => {
      const startTime = Date.now();
      const promises = Array.from({ length: 20 }, () =>
        geocodeAddress('Test Address')
      );

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should take at least 2 seconds (20 requests at 600/min = 1 every 100ms)
      expect(duration).toBeGreaterThan(1900);
    });

    it('should queue requests when limit exceeded', async () => {
      const callTimes: number[] = [];

      mockMapboxClient.geocoding.forwardGeocode.mockImplementation(() => {
        callTimes.push(Date.now());
        return Promise.resolve({
          body: { features: [{ center: [-122.4194, 37.7749], place_name: 'Test' }] },
        });
      });

      await Promise.all(
        Array.from({ length: 10 }, () => geocodeAddress('Test'))
      );

      // Check that calls are spaced out (at least 90ms apart)
      for (let i = 1; i < callTimes.length; i++) {
        const gap = callTimes[i] - callTimes[i - 1];
        expect(gap).toBeGreaterThan(90);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      mockMapboxClient.geocoding.forwardGeocode.mockRejectedValue(
        new Error('ETIMEDOUT')
      );

      const result = await geocodeAddress('123 Main St');

      expect(result).toBeNull();
    });

    it('should handle API rate limit errors', async () => {
      mockMapboxClient.geocoding.forwardGeocode.mockRejectedValue({
        statusCode: 429,
        message: 'Too Many Requests',
      });

      const result = await geocodeAddress('123 Main St');

      expect(result).toBeNull();
    });

    it('should handle malformed API responses', async () => {
      mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue({
        body: null, // Malformed response
      });

      const result = await geocodeAddress('123 Main St');

      expect(result).toBeNull();
    });

    it('should log errors for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockMapboxClient.geocoding.forwardGeocode.mockRejectedValue(
        new Error('API Error')
      );

      await geocodeAddress('123 Main St');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Geocoding error'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Coordinate Validation', () => {
    it('should accept valid latitude range (-90 to 90)', async () => {
      const validLatitudes = [-90, -45, 0, 45, 90];

      for (const lat of validLatitudes) {
        mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue({
          body: { features: [{ center: [-122, lat], place_name: 'Test' }] },
        });

        const result = await geocodeAddress('Test');
        expect(result).not.toBeNull();
      }
    });

    it('should reject invalid latitude range', async () => {
      const invalidLatitudes = [-91, 91, 100, -100];

      for (const lat of invalidLatitudes) {
        mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue({
          body: { features: [{ center: [-122, lat], place_name: 'Test' }] },
        });

        const result = await geocodeAddress('Test');
        expect(result).toBeNull();
      }
    });

    it('should accept valid longitude range (-180 to 180)', async () => {
      const validLongitudes = [-180, -90, 0, 90, 180];

      for (const lng of validLongitudes) {
        mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue({
          body: { features: [{ center: [lng, 37.7749], place_name: 'Test' }] },
        });

        const result = await geocodeAddress('Test');
        expect(result).not.toBeNull();
      }
    });

    it('should reject invalid longitude range', async () => {
      const invalidLongitudes = [-181, 181, 200, -200];

      for (const lng of invalidLongitudes) {
        mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue({
          body: { features: [{ center: [lng, 37.7749], place_name: 'Test' }] },
        });

        const result = await geocodeAddress('Test');
        expect(result).toBeNull();
      }
    });
  });

  describe('Performance', () => {
    it('should geocode single address in under 500ms', async () => {
      mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue({
        body: { features: [{ center: [-122.4194, 37.7749], place_name: 'Test' }] },
      });

      const startTime = Date.now();
      await geocodeAddress('123 Main St');
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(500);
    });

    it('should geocode 100 addresses in under 20 seconds', async () => {
      mockMapboxClient.geocoding.forwardGeocode.mockResolvedValue({
        body: { features: [{ center: [-122.4194, 37.7749], place_name: 'Test' }] },
      });

      const addresses = Array.from({ length: 100 }, (_, i) => `${i} Test St`);

      const startTime = Date.now();
      await geocodeBatch(addresses, { maxConcurrent: 10 });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(20000);
    });
  });
});
