import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateDistance } from '@/lib/distance';

const prisma = new PrismaClient();

/**
 * Optimize route using 2-opt algorithm
 */
function optimizeRoute2Opt(
  start: { latitude: number; longitude: number },
  stops: Array<{ id: string; latitude: number; longitude: number; [key: string]: any }>
): typeof stops {
  if (stops.length <= 2) return stops;

  let route = [...stops];
  let improved = true;
  let iterations = 0;
  const maxIterations = 100;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < route.length - 1; i++) {
      for (let j = i + 2; j < route.length; j++) {
        const currentDistance =
          (i === 0
            ? calculateDistance(start, route[i])
            : calculateDistance(route[i - 1], route[i])) +
          calculateDistance(route[i], route[i + 1]) +
          calculateDistance(route[j - 1], route[j]) +
          (j < route.length - 1
            ? calculateDistance(route[j], route[j + 1])
            : 0);

        // Reverse segment
        const newRoute = [
          ...route.slice(0, i),
          ...route.slice(i, j + 1).reverse(),
          ...route.slice(j + 1),
        ];

        const newDistance =
          (i === 0
            ? calculateDistance(start, newRoute[i])
            : calculateDistance(newRoute[i - 1], newRoute[i])) +
          calculateDistance(newRoute[i], newRoute[i + 1]) +
          calculateDistance(newRoute[j - 1], newRoute[j]) +
          (j < newRoute.length - 1
            ? calculateDistance(newRoute[j], newRoute[j + 1])
            : 0);

        if (newDistance < currentDistance) {
          route = newRoute;
          improved = true;
        }
      }
    }
  }

  return route;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tenantId,
      startLatitude,
      startLongitude,
      customerIds,
      algorithm = '2-opt',
    } = body;

    if (!tenantId || !customerIds || customerIds.length === 0) {
      return NextResponse.json(
        { error: 'Tenant ID and customer IDs are required' },
        { status: 400 }
      );
    }

    if (startLatitude === undefined || startLongitude === undefined) {
      return NextResponse.json(
        { error: 'Start location (latitude, longitude) is required' },
        { status: 400 }
      );
    }

    // Fetch customers
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        tenantId,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        street1: true,
        street2: true,
        city: true,
        state: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        phone: true,
        accountType: true,
      },
    });

    if (customers.length === 0) {
      return NextResponse.json(
        { error: 'No valid customers found' },
        { status: 404 }
      );
    }

    const start = {
      latitude: startLatitude,
      longitude: startLongitude,
    };

    // Optimize route
    const optimizedStops = optimizeRoute2Opt(
      start,
      customers.map(c => ({
        ...c,
        latitude: c.latitude!,
        longitude: c.longitude!,
      }))
    );

    // Calculate route segments
    const segments = [];
    let totalDistance = 0;
    let totalDuration = 0;
    let currentPosition = start;

    for (let i = 0; i < optimizedStops.length; i++) {
      const stop = optimizedStops[i];
      const distance = calculateDistance(currentPosition, stop);
      const drivingTime = Math.round((distance / 35) * 60); // 35 mph average
      const stopDuration = 15; // 15 minutes per stop

      segments.push({
        from:
          i === 0
            ? { ...start, name: 'Start', address: 'Starting location' }
            : {
                name: optimizedStops[i - 1].name,
                address: optimizedStops[i - 1].street1 || '',
              },
        to: {
          id: stop.id,
          name: stop.name,
          address: [stop.street1, stop.street2].filter(Boolean).join(', '),
          city: stop.city || '',
          state: stop.state || '',
          postalCode: stop.postalCode || '',
        },
        distance,
        drivingTime,
      });

      totalDistance += distance;
      totalDuration += drivingTime + stopDuration;
      currentPosition = stop;
    }

    // Generate turn-by-turn directions
    const directions = segments.map((seg, idx) => ({
      step: idx + 1,
      instruction: `Drive ${seg.distance.toFixed(1)} miles to ${seg.to.name}`,
      address: seg.to.address,
      distance: seg.distance,
      duration: seg.drivingTime,
    }));

    return NextResponse.json({
      optimizedRoute: {
        stops: optimizedStops.map((stop, idx) => ({
          order: idx + 1,
          id: stop.id,
          name: stop.name,
          address: [stop.street1, stop.street2].filter(Boolean).join(', '),
          city: stop.city || '',
          state: stop.state || '',
          postalCode: stop.postalCode || '',
          latitude: stop.latitude,
          longitude: stop.longitude,
          phone: stop.phone || '',
          accountType: stop.accountType,
        })),
        totalDistance,
        totalDuration,
        segments,
        directions,
      },
      algorithm,
      iterations: algorithm === '2-opt' ? 100 : 1,
    });
  } catch (error) {
    console.error('Error optimizing route:', error);
    return NextResponse.json(
      { error: 'Failed to optimize route' },
      { status: 500 }
    );
  }
}
