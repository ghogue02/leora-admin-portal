import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findPointsWithinRadius } from '@/lib/geospatial';
import { z } from 'zod';

const nearbySchema = z.object({
  lat: z.string(),
  lng: z.string(),
  radiusMiles: z.string().default('10'),
  limit: z.string().default('20')
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      lat: searchParams.get('lat') || '',
      lng: searchParams.get('lng') || '',
      radiusMiles: searchParams.get('radiusMiles') || '10',
      limit: searchParams.get('limit') || '20'
    };

    const validated = nearbySchema.parse(params);

    const lat = Number(validated.lat);
    const lng = Number(validated.lng);
    const radius = Number(validated.radiusMiles);
    const limit = Number(validated.limit);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius) || isNaN(limit)) {
      return NextResponse.json(
        { error: 'Invalid numeric parameters' },
        { status: 400 }
      );
    }

    // Get all customers with coordinates
    const customers = await prisma.customer.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        accountType: true,
        accountPriority: true,
        territory: true,
        addressLine1: true,
        city: true,
        state: true
      }
    });

    // Find customers within radius
    const customersWithCoords = customers.map(c => ({
      id: c.id,
      latitude: c.latitude!,
      longitude: c.longitude!,
      ...c
    }));

    const nearby = findPointsWithinRadius(
      { latitude: lat, longitude: lng },
      customersWithCoords,
      radius
    );

    // Limit results
    const limitedResults = nearby.slice(0, limit);

    return NextResponse.json({
      customers: limitedResults,
      total: nearby.length
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Nearby customers error:', error);
    return NextResponse.json(
      { error: 'Failed to find nearby customers' },
      { status: 500 }
    );
  }
}
