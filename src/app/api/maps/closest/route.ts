import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateDistance, estimateDrivingTime } from '@/lib/distance';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, latitude, longitude, radiusMiles = 50, limit = 50 } = body;

    if (!tenantId || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Tenant ID, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    // Fetch all customers with coordinates
    const customers = await prisma.customer.findMany({
      where: {
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
        accountType: true,
        accountPriority: true,
        territory: true,
        phone: true,
        lastOrderDate: true,
        salesRep: {
          select: {
            id: true,
            name: true,
          },
        },
        orders: {
          where: {
            status: { not: 'CANCELLED' },
          },
          select: {
            totalAmount: true,
          },
        },
      },
    });

    // Calculate distances
    const customersWithDistance = customers.map(customer => {
      const distance = calculateDistance(
        { latitude, longitude },
        { latitude: customer.latitude!, longitude: customer.longitude! }
      );

      const drivingTime = estimateDrivingTime(distance);

      const revenue = customer.orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );

      return {
        id: customer.id,
        name: customer.name,
        address: [customer.street1, customer.street2]
          .filter(Boolean)
          .join(', '),
        city: customer.city || '',
        state: customer.state || '',
        postalCode: customer.postalCode || '',
        latitude: customer.latitude,
        longitude: customer.longitude,
        accountType: customer.accountType || 'PROSPECT',
        priority: customer.accountPriority || 'MEDIUM',
        territory: customer.territory,
        phone: customer.phone || '',
        lastOrderDate: customer.lastOrderDate?.toISOString() || null,
        salesRep: customer.salesRep,
        revenue,
        distance,
        drivingTime,
      };
    });

    // Filter by radius and sort by distance
    const nearbyCustomers = customersWithDistance
      .filter(c => c.distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return NextResponse.json({
      origin: { latitude, longitude },
      radiusMiles,
      total: nearbyCustomers.length,
      customers: nearbyCustomers,
    });
  } catch (error) {
    console.error('Error finding nearest customers:', error);
    return NextResponse.json(
      { error: 'Failed to find nearest customers' },
      { status: 500 }
    );
  }
}
