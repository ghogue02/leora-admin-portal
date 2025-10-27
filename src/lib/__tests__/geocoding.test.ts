/**
 * Geocoding Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  geocodeAddress,
  buildAddress,
  isValidCoordinates,
  clearGeocodeCache,
} from '../geocoding';

// Mock fetch
global.fetch = vi.fn();

describe('Geocoding Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGeocodeCache();
  });

  describe('geocodeAddress', () => {
    it('should geocode a valid address', async () => {
      const mockResponse = {
        features: [
          {
            center: [-122.4194, 37.7749], // [lng, lat] - San Francisco
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await geocodeAddress('San Francisco, CA');

      expect(result).toEqual([37.7749, -122.4194]); // Returns [lat, lng]
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return null for empty address', async () => {
      const result = await geocodeAddress('');
      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return null when API returns no results', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [] }),
      });

      const result = await geocodeAddress('Invalid Address');
      expect(result).toBeNull();
    });

    it('should return null on API error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const result = await geocodeAddress('123 Main St');
      expect(result).toBeNull();
    });

    it('should cache results', async () => {
      const mockResponse = {
        features: [
          {
            center: [-122.4194, 37.7749],
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      // First call - should fetch
      const result1 = await geocodeAddress('San Francisco, CA');
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await geocodeAddress('San Francisco, CA');
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1
      expect(result2).toEqual(result1);
    });

    it('should validate coordinates', async () => {
      const mockResponse = {
        features: [
          {
            center: [200, 100], // Invalid coordinates
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await geocodeAddress('Invalid Coords');
      expect(result).toBeNull();
    });
  });

  describe('buildAddress', () => {
    it('should build complete address', () => {
      const customer = {
        street1: '123 Main St',
        street2: 'Apt 4',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94102',
        country: 'US',
      };

      const address = buildAddress(customer);
      expect(address).toBe('123 Main St, Apt 4, San Francisco, CA, 94102, US');
    });

    it('should handle partial address', () => {
      const customer = {
        street1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
      };

      const address = buildAddress(customer);
      expect(address).toBe('123 Main St, San Francisco, CA, US');
    });

    it('should handle null values', () => {
      const customer = {
        street1: null,
        city: 'San Francisco',
        state: null,
      };

      const address = buildAddress(customer);
      expect(address).toBe('San Francisco, US');
    });

    it('should default to US for country', () => {
      const customer = {
        city: 'San Francisco',
        country: null,
      };

      const address = buildAddress(customer);
      expect(address).toBe('San Francisco, US');
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      expect(isValidCoordinates(37.7749, -122.4194)).toBe(true);
      expect(isValidCoordinates(0, 0)).toBe(true);
      expect(isValidCoordinates(90, 180)).toBe(true);
      expect(isValidCoordinates(-90, -180)).toBe(true);
    });

    it('should reject invalid latitudes', () => {
      expect(isValidCoordinates(91, 0)).toBe(false);
      expect(isValidCoordinates(-91, 0)).toBe(false);
    });

    it('should reject invalid longitudes', () => {
      expect(isValidCoordinates(0, 181)).toBe(false);
      expect(isValidCoordinates(0, -181)).toBe(false);
    });

    it('should reject NaN values', () => {
      expect(isValidCoordinates(NaN, 0)).toBe(false);
      expect(isValidCoordinates(0, NaN)).toBe(false);
    });

    it('should reject non-numeric values', () => {
      expect(isValidCoordinates('37' as any, 0)).toBe(false);
      expect(isValidCoordinates(0, '122' as any)).toBe(false);
    });
  });
});
