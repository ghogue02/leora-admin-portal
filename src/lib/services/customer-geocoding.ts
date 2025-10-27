import { geocodeAddress } from './geocoding';
import { prisma } from '@/lib/prisma';

/**
 * Check if customer address has changed
 */
function hasAddressChanged(
  current: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  },
  updates: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  }
): boolean {
  const fields = ['addressLine1', 'addressLine2', 'city', 'state', 'postalCode'];

  return fields.some(field => {
    const key = field as keyof typeof updates;
    return updates[key] !== undefined && updates[key] !== current[key];
  });
}

/**
 * Build full address string from customer data
 */
function buildAddressString(customer: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}): string {
  return [
    customer.addressLine1,
    customer.addressLine2,
    customer.city,
    customer.state,
    customer.postalCode
  ].filter(Boolean).join(', ');
}

/**
 * Find territory for coordinates using point-in-polygon
 */
async function findTerritoryForCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const territories = await prisma.territory.findMany({
    select: {
      name: true,
      boundaries: true
    }
  });

  // Import geospatial helper
  const { isPointInPolygon } = await import('@/lib/geospatial');

  for (const territory of territories) {
    if (isPointInPolygon(
      { latitude, longitude },
      territory.boundaries as any
    )) {
      return territory.name;
    }
  }

  return null;
}

/**
 * Auto-geocode customer on address update
 * Returns updated coordinates and territory
 */
export async function autoGeocodeCustomer(
  customerId: string,
  addressUpdates: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  }
): Promise<{
  latitude?: number;
  longitude?: number;
  territory?: string | null;
}> {
  // Get current customer data
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      latitude: true,
      longitude: true
    }
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Check if address changed
  if (!hasAddressChanged(customer, addressUpdates)) {
    return {};
  }

  // Build new address
  const newAddress = {
    ...customer,
    ...addressUpdates
  };

  const addressString = buildAddressString(newAddress);

  if (!addressString) {
    return {};
  }

  try {
    // Geocode new address
    const result = await geocodeAddress(addressString);

    // Find territory
    const territory = await findTerritoryForCoordinates(
      result.latitude,
      result.longitude
    );

    return {
      latitude: result.latitude,
      longitude: result.longitude,
      territory
    };
  } catch (error) {
    console.error('Auto-geocoding failed:', error);
    // Don't throw - allow update to continue even if geocoding fails
    return {};
  }
}
