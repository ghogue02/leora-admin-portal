import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (date) {
      const routeDate = new Date(date);
      const nextDay = new Date(routeDate);
      nextDay.setDate(nextDay.getDate() + 1);

      where.routeDate = {
        gte: routeDate,
        lt: nextDay,
      };
    }

    const routes = await prisma.deliveryRoute.findMany({
      where,
      include: {
        stops: {
          include: {
            order: {
              include: {
                customer: {
                  select: {
                    id: true,
                    businessName: true,
                    contactName: true,
                    phone: true,
                    shippingAddress: true,
                    shippingCity: true,
                    shippingState: true,
                    shippingZip: true,
                  },
                },
                lines: {
                  include: {
                    sku: {
                      include: {
                        product: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            stopNumber: 'asc',
          },
        },
      },
      orderBy: {
        routeDate: 'desc',
      },
    });

    return NextResponse.json({ routes });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch routes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { routeName, routeDate, driverName, truckNumber, orderIds, startTime } = body;

    if (!routeName || !routeDate || !orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch orders with customer addresses for route optimization
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        tenantId: session.user.tenantId,
      },
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            shippingAddress: true,
            shippingCity: true,
            shippingState: true,
            shippingZip: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'No valid orders found' },
        { status: 400 }
      );
    }

    // Simple route optimization: sort by zip code for now
    // In production, use actual geocoding and routing algorithms
    const sortedOrders = orders.sort((a, b) => {
      const zipA = a.customer?.shippingZip || '';
      const zipB = b.customer?.shippingZip || '';
      return zipA.localeCompare(zipB);
    });

    const routeStartTime = new Date(startTime || `${routeDate}T08:00:00`);
    const avgStopDuration = 30; // 30 minutes per stop

    // Create route with optimized stops
    const route = await prisma.deliveryRoute.create({
      data: {
        tenantId: session.user.tenantId,
        routeName,
        routeDate: new Date(routeDate),
        driverName: driverName || 'Unassigned',
        truckNumber: truckNumber || '',
        startTime: routeStartTime,
        estimatedEndTime: new Date(
          routeStartTime.getTime() + sortedOrders.length * avgStopDuration * 60000
        ),
        stops: {
          create: sortedOrders.map((order, index) => {
            const estimatedArrival = new Date(
              routeStartTime.getTime() + index * avgStopDuration * 60000
            );

            return {
              tenantId: session.user.tenantId,
              orderId: order.id,
              stopNumber: index + 1,
              estimatedArrival,
              status: 'pending',
            };
          }),
        },
      },
      include: {
        stops: {
          include: {
            order: {
              include: {
                customer: true,
                lines: {
                  include: {
                    sku: {
                      include: {
                        product: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            stopNumber: 'asc',
          },
        },
      },
    });

    return NextResponse.json({ route }, { status: 201 });
  } catch (error) {
    console.error('Error creating route:', error);
    return NextResponse.json(
      { error: 'Failed to create route' },
      { status: 500 }
    );
  }
}
