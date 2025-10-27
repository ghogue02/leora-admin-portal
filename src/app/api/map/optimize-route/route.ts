import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { optimizeRoute } from '@/lib/geospatial';
import { z } from 'zod';

const optimizeRouteSchema = z.object({
  customerIds: z.array(z.string()).min(1),
  startLocation: z.object({
    lat: z.number(),
    lng: z.number()
  })
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerIds, startLocation } = optimizeRouteSchema.parse(body);

    // Get customers with coordinates
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        addressLine1: true,
        city: true,
        state: true
      }
    });

    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'No customers found with coordinates' },
        { status: 404 }
      );
    }

    // Optimize route
    const destinations = customers.map(c => ({
      id: c.id,
      latitude: c.latitude!,
      longitude: c.longitude!
    }));

    const result = optimizeRoute(
      { latitude: startLocation.lat, longitude: startLocation.lng },
      destinations
    );

    // Map back to full customer objects
    const optimizedCustomers = result.optimizedOrder.map(point => {
      const customer = customers.find(c => c.id === point.id);
      return { ...customer, distance: point.distance };
    });

    return NextResponse.json({
      optimizedOrder: optimizedCustomers,
      totalDistance: result.totalDistance
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Route optimization error:', error);
    return NextResponse.json(
      { error: 'Failed to optimize route' },
      { status: 500 }
    );
  }
}
