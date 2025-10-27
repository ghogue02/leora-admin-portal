/**
 * Geocoding Service - Mapbox Integration
 *
 * Provides geocoding functionality for customer addresses using Mapbox Geocoding API.
 * Features:
 * - Address geocoding with rate limiting
 * - Coordinate validation
 * - Caching to prevent duplicate API calls
 * - Batch geocoding support
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Rate limiting configuration
const RATE_LIMIT = parseInt(process.env.GEOCODING_RATE_LIMIT || '600'); // requests per minute
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

// In-memory cache for geocoding results
const geocodeCache = new Map<string, [number, number] | null>();

// Rate limiting tracker
let requestCount = 0;
let windowStart = Date.now();

/**
 * Rate limiter - ensures we don't exceed Mapbox API limits
 */
async function rateLimitCheck(): Promise<void> {
  const now = Date.now();

  // Reset window if needed
  if (now - windowStart >= RATE_WINDOW_MS) {
    requestCount = 0;
    windowStart = now;
  }

  // Check if we're over limit
  if (requestCount >= RATE_LIMIT) {
    const waitTime = RATE_WINDOW_MS - (now - windowStart);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestCount = 0;
    windowStart = Date.now();
  }

  requestCount++;
}

/**
 * Geocode an address using Mapbox Geocoding API
 *
 * @param address - Full address string
 * @returns [latitude, longitude] or null if geocoding fails
 */
export async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }

  // Check cache first
  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // Rate limit check
  await rateLimitCheck();

  const mapboxToken = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!mapboxToken) {
    console.error('Mapbox token not configured');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Mapbox API error: ${response.status} ${response.statusText}`);
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn(`No geocoding results for address: ${address}`);
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const [longitude, latitude] = data.features[0].center;

    if (!isValidCoordinates(latitude, longitude)) {
      console.error(`Invalid coordinates returned: [${latitude}, ${longitude}]`);
      geocodeCache.set(cacheKey, null);
      return null;
    }

    const result: [number, number] = [latitude, longitude];
    geocodeCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Build a complete address string from customer fields
 */
export function buildAddress(customer: {
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string {
  const parts = [
    customer.street1,
    customer.street2,
    customer.city,
    customer.state,
    customer.postalCode,
    customer.country || 'US'
  ].filter(part => part && part.trim().length > 0);

  return parts.join(', ');
}

/**
 * Geocode a customer by ID
 *
 * @param customerId - Customer UUID
 * @returns true if successful, false otherwise
 */
export async function geocodeCustomer(customerId: string): Promise<boolean> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        street1: true,
        street2: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        latitude: true,
        longitude: true,
      }
    });

    if (!customer) {
      console.error(`Customer not found: ${customerId}`);
      return false;
    }

    // Skip if already geocoded
    if (customer.latitude !== null && customer.longitude !== null) {
      console.log(`Customer ${customerId} already geocoded`);
      return true;
    }

    const address = buildAddress(customer);
    if (!address) {
      console.warn(`Customer ${customerId} has no address`);
      return false;
    }

    const coordinates = await geocodeAddress(address);
    if (!coordinates) {
      console.warn(`Failed to geocode customer ${customerId}: ${address}`);
      return false;
    }

    const [latitude, longitude] = coordinates;

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        latitude,
        longitude,
        geocodedAt: new Date(),
      }
    });

    console.log(`Successfully geocoded customer ${customerId}: [${latitude}, ${longitude}]`);
    return true;
  } catch (error) {
    console.error(`Error geocoding customer ${customerId}:`, error);
    return false;
  }
}

/**
 * Batch geocode multiple customers
 *
 * @param customerIds - Array of customer UUIDs
 * @returns Object with success/failure counts
 */
export async function batchGeocodeCustomers(customerIds: string[]): Promise<{
  total: number;
  success: number;
  failed: number;
  skipped: number;
}> {
  const results = {
    total: customerIds.length,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (let i = 0; i < customerIds.length; i++) {
    const customerId = customerIds[i];

    // Progress reporting every 50 customers
    if (i > 0 && i % 50 === 0) {
      console.log(`Geocoding progress: ${i}/${customerIds.length} (${Math.round(i/customerIds.length*100)}%)`);
    }

    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          latitude: true,
          longitude: true,
        }
      });

      if (customer?.latitude !== null && customer?.longitude !== null) {
        results.skipped++;
        continue;
      }

      const success = await geocodeCustomer(customerId);
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }

      // Rate limiting delay (100ms between requests)
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error processing customer ${customerId}:`, error);
      results.failed++;
    }
  }

  return results;
}

/**
 * Validate coordinate values
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Clear the geocoding cache
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}
