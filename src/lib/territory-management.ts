/**
 * Territory Management Service
 *
 * Manages sales territories with GeoJSON boundaries and customer assignments.
 * Uses @turf/turf for geospatial calculations.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import * as turf from '@turf/turf';

const prisma = new PrismaClient();

export interface Territory {
  id: string;
  tenantId: string;
  name: string;
  salesRepId: string | null;
  boundaries: Prisma.JsonValue | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTerritoryInput {
  tenantId: string;
  name: string;
  salesRepId?: string;
  boundaries?: Prisma.JsonValue;
  color?: string;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Create a new territory
 */
export async function createTerritory(data: CreateTerritoryInput): Promise<Territory> {
  // Validate GeoJSON boundaries if provided
  if (data.boundaries) {
    const isValid = validateGeoJSONBoundary(data.boundaries);
    if (!isValid) {
      throw new Error('Invalid GeoJSON boundary format');
    }
  }

  const territory = await prisma.territory.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      salesRepId: data.salesRepId || null,
      boundaries: data.boundaries || null,
      color: data.color || '#3b82f6',
      isActive: true,
    },
  });

  return territory;
}

/**
 * Validate GeoJSON boundary format
 */
function validateGeoJSONBoundary(boundaries: Prisma.JsonValue): boolean {
  try {
    const geoJSON = boundaries as any;

    if (!geoJSON || typeof geoJSON !== 'object') {
      return false;
    }

    // Must be a Polygon or MultiPolygon
    if (geoJSON.type !== 'Polygon' && geoJSON.type !== 'MultiPolygon') {
      return false;
    }

    // Validate coordinates structure
    if (!Array.isArray(geoJSON.coordinates)) {
      return false;
    }

    // Use turf for validation
    const feature = turf.feature(geoJSON);
    return feature !== null;
  } catch (error) {
    console.error('GeoJSON validation error:', error);
    return false;
  }
}

/**
 * Check if a point is inside a polygon
 */
export function isPointInPolygon(lat: number, lng: number, polygon: Prisma.JsonValue): boolean {
  try {
    const point = turf.point([lng, lat]); // Note: GeoJSON uses [lng, lat] order
    const poly = turf.feature(polygon as any);

    return turf.booleanPointInPolygon(point, poly);
  } catch (error) {
    console.error('Point-in-polygon check error:', error);
    return false;
  }
}

/**
 * Get all customers within specified bounding box
 */
export async function getCustomersInBounds(
  tenantId: string,
  bounds: BoundingBox
): Promise<Array<{
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  accountType: string | null;
  riskStatus: string;
}>> {
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      latitude: {
        gte: bounds.south,
        lte: bounds.north,
      },
      longitude: {
        gte: bounds.west,
        lte: bounds.east,
      },
      latitude_longitude_not_null: {
        latitude: { not: null },
        longitude: { not: null },
      },
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      accountType: true,
      riskStatus: true,
    },
  });

  // Filter out any null coordinates that slipped through
  return customers.filter(c => c.latitude !== null && c.longitude !== null) as any;
}

/**
 * Assign customers to a territory based on boundaries
 */
export async function assignCustomersToTerritory(
  territoryId: string,
  boundaries: Prisma.JsonValue
): Promise<number> {
  const territory = await prisma.territory.findUnique({
    where: { id: territoryId },
    include: { salesRep: true },
  });

  if (!territory) {
    throw new Error('Territory not found');
  }

  if (!boundaries) {
    throw new Error('Boundaries required for assignment');
  }

  // Get all customers with coordinates in the tenant
  const customers = await prisma.customer.findMany({
    where: {
      tenantId: territory.tenantId,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
    },
  });

  // Filter customers within the boundary
  const customersInTerritory = customers.filter(customer => {
    if (customer.latitude === null || customer.longitude === null) return false;
    return isPointInPolygon(customer.latitude, customer.longitude, boundaries);
  });

  // Update customers with the sales rep (if territory has one)
  if (territory.salesRepId && customersInTerritory.length > 0) {
    await prisma.customer.updateMany({
      where: {
        id: { in: customersInTerritory.map(c => c.id) },
      },
      data: {
        salesRepId: territory.salesRepId,
      },
    });
  }

  return customersInTerritory.length;
}

/**
 * Suggest territory boundaries based on sales rep's existing customers
 * Uses clustering to create a convex hull around customer locations
 */
export async function suggestTerritoryBoundaries(
  salesRepId: string
): Promise<Prisma.JsonValue | null> {
  const customers = await prisma.customer.findMany({
    where: {
      salesRepId,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      latitude: true,
      longitude: true,
    },
  });

  if (customers.length < 3) {
    console.warn('Not enough customers to generate boundary (need at least 3)');
    return null;
  }

  try {
    // Create points collection
    const points = customers
      .filter(c => c.latitude !== null && c.longitude !== null)
      .map(c => turf.point([c.longitude!, c.latitude!]));

    if (points.length < 3) {
      return null;
    }

    const featureCollection = turf.featureCollection(points);

    // Create convex hull
    const hull = turf.convex(featureCollection);

    if (!hull) {
      return null;
    }

    // Buffer the hull by ~5km to create some margin
    const buffered = turf.buffer(hull, 5, { units: 'kilometers' });

    if (!buffered) {
      return hull.geometry as Prisma.JsonValue;
    }

    return buffered.geometry as Prisma.JsonValue;
  } catch (error) {
    console.error('Error generating boundary suggestion:', error);
    return null;
  }
}

/**
 * Get all territories for a tenant
 */
export async function getTerritories(tenantId: string): Promise<Territory[]> {
  return prisma.territory.findMany({
    where: { tenantId },
    orderBy: { name: 'asc' },
  });
}

/**
 * Get customers within a specific territory
 */
export async function getCustomersInTerritory(
  territoryId: string
): Promise<Array<{
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  accountType: string | null;
  riskStatus: string;
}>> {
  const territory = await prisma.territory.findUnique({
    where: { id: territoryId },
  });

  if (!territory || !territory.boundaries) {
    return [];
  }

  const customers = await prisma.customer.findMany({
    where: {
      tenantId: territory.tenantId,
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      accountType: true,
      riskStatus: true,
    },
  });

  return customers.filter(customer => {
    if (customer.latitude === null || customer.longitude === null) return false;
    return isPointInPolygon(customer.latitude, customer.longitude, territory.boundaries!);
  });
}

/**
 * Update territory boundaries
 */
export async function updateTerritoryBoundaries(
  territoryId: string,
  boundaries: Prisma.JsonValue
): Promise<Territory> {
  const isValid = validateGeoJSONBoundary(boundaries);
  if (!isValid) {
    throw new Error('Invalid GeoJSON boundary format');
  }

  return prisma.territory.update({
    where: { id: territoryId },
    data: { boundaries },
  });
}

/**
 * Delete a territory
 */
export async function deleteTerritory(territoryId: string): Promise<void> {
  await prisma.territory.delete({
    where: { id: territoryId },
  });
}
