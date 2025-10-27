/**
 * Customer Geocoding Hooks
 *
 * Auto-geocode customers when addresses are created or updated.
 * This can be implemented as:
 * 1. Prisma middleware (for all database operations)
 * 2. API route hooks (for specific endpoints)
 * 3. Background job (for batch processing)
 */

import { PrismaClient } from '@prisma/client';
import { geocodeCustomer, buildAddress } from '../geocoding';

const prisma = new PrismaClient();

/**
 * Check if customer address fields have changed
 */
function addressFieldsChanged(args: any): boolean {
  if (!args.data) return false;

  const addressFields = ['street1', 'street2', 'city', 'state', 'postalCode', 'country'];

  return addressFields.some(field => {
    return args.data[field] !== undefined;
  });
}

/**
 * Prisma middleware for auto-geocoding on customer create/update
 *
 * Usage in your main Prisma client setup:
 * ```
 * import { setupGeocodingMiddleware } from '@/lib/hooks/customer-geocoding';
 * setupGeocodingMiddleware(prisma);
 * ```
 */
export function setupGeocodingMiddleware(client: PrismaClient) {
  client.$use(async (params, next) => {
    // Only process Customer model operations
    if (params.model !== 'Customer') {
      return next(params);
    }

    // Process the main operation first
    const result = await next(params);

    // Auto-geocode on create
    if (params.action === 'create') {
      const customerId = result.id;

      // Geocode in background (don't await to avoid blocking the response)
      geocodeCustomer(customerId).catch(error => {
        console.error(`Background geocoding failed for customer ${customerId}:`, error);
      });
    }

    // Auto-geocode on update if address changed
    if (params.action === 'update' || params.action === 'updateMany') {
      if (addressFieldsChanged(params.args)) {
        const customerId = params.action === 'update' ? params.args.where.id : result.id;

        if (customerId) {
          // Clear existing geocoding and re-geocode
          await client.customer.update({
            where: { id: customerId },
            data: {
              latitude: null,
              longitude: null,
              geocodedAt: null,
            },
          });

          // Geocode in background
          geocodeCustomer(customerId).catch(error => {
            console.error(`Background geocoding failed for customer ${customerId}:`, error);
          });
        }
      }
    }

    return result;
  });
}

/**
 * Manually trigger geocoding for a customer (for use in API routes)
 */
export async function triggerCustomerGeocoding(customerId: string): Promise<{
  success: boolean;
  coordinates?: [number, number];
  error?: string;
}> {
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
      }
    });

    if (!customer) {
      return {
        success: false,
        error: 'Customer not found',
      };
    }

    const address = buildAddress(customer);
    if (!address) {
      return {
        success: false,
        error: 'Customer has no address',
      };
    }

    const success = await geocodeCustomer(customerId);

    if (!success) {
      return {
        success: false,
        error: 'Geocoding failed',
      };
    }

    // Fetch updated coordinates
    const updated = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { latitude: true, longitude: true },
    });

    if (!updated?.latitude || !updated?.longitude) {
      return {
        success: false,
        error: 'Geocoding completed but coordinates not saved',
      };
    }

    return {
      success: true,
      coordinates: [updated.latitude, updated.longitude],
    };
  } catch (error) {
    console.error('Error triggering customer geocoding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch geocode multiple customers (for import operations)
 */
export async function bulkGeocodeCustomers(
  customerIds: string[]
): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  const results = {
    total: customerIds.length,
    success: 0,
    failed: 0,
  };

  for (const customerId of customerIds) {
    try {
      const success = await geocodeCustomer(customerId);
      if (success) {
        results.success++;
      } else {
        results.failed++;
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error geocoding customer ${customerId}:`, error);
      results.failed++;
    }
  }

  return results;
}
