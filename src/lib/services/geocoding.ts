import { prisma } from '@/lib/prisma';

interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

interface GeocodingCache {
  address: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  cachedAt: Date;
}

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
const CACHE_DURATION_DAYS = 30;

// Rate limiting for Mapbox (600 requests/minute)
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 600;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      // Reset window if a minute has passed
      const now = Date.now();
      if (now - this.windowStart >= 60000) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      // Wait if we've hit the rate limit
      if (this.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
        const waitTime = 60000 - (now - this.windowStart);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.windowStart = Date.now();
      }

      const task = this.queue.shift();
      if (task) {
        this.requestCount++;
        await task();
      }
    }

    this.processing = false;
  }
}

const rateLimiter = new RateLimiter();

/**
 * Get cached geocoding result if available and not expired
 */
async function getCachedGeocoding(address: string): Promise<GeocodingResult | null> {
  try {
    const cached = await prisma.$queryRaw<GeocodingCache[]>`
      SELECT address, latitude, longitude, "formattedAddress", "cachedAt"
      FROM "GeocodingCache"
      WHERE address = ${address}
        AND "cachedAt" > NOW() - INTERVAL '${CACHE_DURATION_DAYS} days'
      LIMIT 1
    `;

    if (cached.length > 0) {
      const result = cached[0];
      return {
        latitude: result.latitude,
        longitude: result.longitude,
        formattedAddress: result.formattedAddress
      };
    }
  } catch (error) {
    console.error('Cache lookup error:', error);
  }

  return null;
}

/**
 * Save geocoding result to cache
 */
async function cacheGeocoding(
  address: string,
  result: GeocodingResult
): Promise<void> {
  try {
    await prisma.$executeRaw`
      INSERT INTO "GeocodingCache" (address, latitude, longitude, "formattedAddress", "cachedAt")
      VALUES (${address}, ${result.latitude}, ${result.longitude}, ${result.formattedAddress}, NOW())
      ON CONFLICT (address)
      DO UPDATE SET
        latitude = ${result.latitude},
        longitude = ${result.longitude},
        "formattedAddress" = ${result.formattedAddress},
        "cachedAt" = NOW()
    `;
  } catch (error) {
    console.error('Cache save error:', error);
  }
}

/**
 * Geocode an address using Mapbox API
 */
async function geocodeWithMapbox(address: string): Promise<GeocodingResult> {
  if (!MAPBOX_TOKEN) {
    throw new Error('MAPBOX_ACCESS_TOKEN not configured');
  }

  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&limit=1`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Mapbox API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error('No geocoding results found');
  }

  const feature = data.features[0];
  const [longitude, latitude] = feature.center;

  return {
    latitude,
    longitude,
    formattedAddress: feature.place_name
  };
}

/**
 * Geocode a single address with caching and rate limiting
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  // Check cache first
  const cached = await getCachedGeocoding(address);
  if (cached) {
    return cached;
  }

  // Use rate limiter for API call
  const result = await rateLimiter.execute(() => geocodeWithMapbox(address));

  // Cache the result
  await cacheGeocoding(address, result);

  return result;
}

/**
 * Batch geocode multiple addresses with progress tracking
 */
export async function batchGeocodeAddresses(
  addresses: Array<{ id: string; address: string }>
): Promise<{
  geocoded: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    coordinates?: { latitude: number; longitude: number };
    formattedAddress?: string;
    error?: string;
  }>;
}> {
  const results = [];
  let geocoded = 0;
  let failed = 0;

  for (const item of addresses) {
    try {
      const result = await geocodeAddress(item.address);
      results.push({
        id: item.id,
        success: true,
        coordinates: {
          latitude: result.latitude,
          longitude: result.longitude
        },
        formattedAddress: result.formattedAddress
      });
      geocoded++;
    } catch (error) {
      results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      failed++;
    }
  }

  return { geocoded, failed, results };
}

/**
 * Geocode customer addresses and update database
 */
export async function geocodeCustomers(customerIds: string[]): Promise<{
  geocoded: number;
  failed: number;
  results: Array<{
    customerId: string;
    success: boolean;
    coordinates?: { latitude: number; longitude: number };
  }>;
}> {
  // Fetch customers
  const customers = await prisma.customer.findMany({
    where: { id: { in: customerIds } },
    select: {
      id: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true
    }
  });

  const addresses = customers.map(c => ({
    id: c.id,
    address: [
      c.addressLine1,
      c.addressLine2,
      c.city,
      c.state,
      c.postalCode
    ].filter(Boolean).join(', ')
  }));

  const batchResult = await batchGeocodeAddresses(addresses);

  // Update successful geocodings
  for (const result of batchResult.results) {
    if (result.success && result.coordinates) {
      await prisma.customer.update({
        where: { id: result.id },
        data: {
          latitude: result.coordinates.latitude,
          longitude: result.coordinates.longitude
        }
      });
    }
  }

  return {
    geocoded: batchResult.geocoded,
    failed: batchResult.failed,
    results: batchResult.results.map(r => ({
      customerId: r.id,
      success: r.success,
      coordinates: r.coordinates
    }))
  };
}
