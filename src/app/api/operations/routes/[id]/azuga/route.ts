import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const route = await prisma.deliveryRoute.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
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
    });

    if (!route) {
      return NextResponse.json(
        { error: 'Route not found' },
        { status: 404 }
      );
    }

    // Generate CSV for Azuga
    const csvRows: string[] = [
      // Header
      'Stop #,Customer Name,Contact,Phone,Address,City,State,Zip,Products,Total Items,Estimated Arrival,Notes',
    ];

    route.stops.forEach((stop) => {
      const customer = stop.order.customer;
      const products = stop.order.lines
        .map(line => `${line.sku.product.name} (${line.quantity})`)
        .join('; ');

      const totalItems = stop.order.lines.reduce((sum, line) => sum + line.quantity, 0);

      const estimatedArrival = new Date(stop.estimatedArrival).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      csvRows.push([
        stop.stopNumber,
        customer?.businessName || 'Unknown',
        customer?.contactName || '',
        customer?.phone || '',
        customer?.shippingAddress || '',
        customer?.shippingCity || '',
        customer?.shippingState || '',
        customer?.shippingZip || '',
        `"${products}"`,
        totalItems,
        estimatedArrival,
        stop.notes || '',
      ].join(','));
    });

    const csvContent = csvRows.join('\n');

    // Record export
    await prisma.routeExport.create({
      data: {
        tenantId: session.user.tenantId,
        orderCount: route.stops.length,
        filename: `route-${route.routeName}-${new Date().toISOString().split('T')[0]}.csv`,
        exportedBy: session.user.id,
      },
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="route-${route.routeName}-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting route to Azuga:', error);
    return NextResponse.json(
      { error: 'Failed to export route' },
      { status: 500 }
    );
  }
}
