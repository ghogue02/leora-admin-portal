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
    const routeId = searchParams.get('routeId');
    const date = searchParams.get('date');

    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (routeId) {
      where.routeId = routeId;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      where.estimatedArrival = {
        gte: startDate,
        lt: endDate,
      };
    }

    const stops = await prisma.routeStop.findMany({
      where,
      include: {
        route: {
          select: {
            id: true,
            routeName: true,
            driverName: true,
            truckNumber: true,
          },
        },
        order: {
          include: {
            customer: {
              select: {
                id: true,
                businessName: true,
                contactName: true,
                phone: true,
                email: true,
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
      orderBy: [
        { route: { routeDate: 'desc' } },
        { stopNumber: 'asc' },
      ],
    });

    return NextResponse.json({ stops });
  } catch (error) {
    console.error('Error fetching delivery tracking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch delivery tracking' },
      { status: 500 }
    );
  }
}
