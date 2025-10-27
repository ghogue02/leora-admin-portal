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
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);

      where.createdAt = {
        gte: startDate,
        lt: endDate,
      };
    }

    const pickSheets = await prisma.pickSheet.findMany({
      where,
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true,
                inventories: {
                  where: {
                    tenantId: session.user.tenantId,
                  },
                  take: 1,
                },
              },
            },
            customer: {
              select: {
                id: true,
                businessName: true,
                shippingAddress: true,
                shippingCity: true,
                shippingState: true,
                shippingZip: true,
              },
            },
            OrderLine: {
              include: {
                order: {
                  select: {
                    id: true,
                    orderedAt: true,
                  },
                },
              },
            },
          },
          orderBy: {
            pickOrder: 'asc',
          },
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ pickSheets });
  } catch (error) {
    console.error('Error fetching pick sheets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pick sheets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderIds, pickerName, routeOptimization = 'location' } = body;

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one order is required' },
        { status: 400 }
      );
    }

    // Get the next pick sheet number
    const lastPickSheet = await prisma.pickSheet.findFirst({
      where: { tenantId: session.user.tenantId },
      orderBy: { sheetNumber: 'desc' },
    });

    const nextNumber = lastPickSheet
      ? parseInt(lastPickSheet.sheetNumber.split('-').pop() || '0') + 1
      : 1;

    const sheetNumber = `PS-${new Date().getFullYear()}-${String(nextNumber).padStart(3, '0')}`;

    // Fetch order lines for selected orders
    const orderLines = await prisma.orderLine.findMany({
      where: {
        tenantId: session.user.tenantId,
        orderId: { in: orderIds },
      },
      include: {
        sku: {
          include: {
            inventories: {
              where: {
                tenantId: session.user.tenantId,
              },
              orderBy: {
                onHand: 'desc',
              },
              take: 1,
            },
            product: true,
          },
        },
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (orderLines.length === 0) {
      return NextResponse.json(
        { error: 'No items found in selected orders' },
        { status: 400 }
      );
    }

    // Optimize pick order based on location
    const optimizedItems = orderLines.map((line, index) => {
      const location = line.sku.inventories[0]?.location || 'ZZZ-999-999';
      const [aisle = 'ZZZ', bay = '999', shelf = '999'] = location.split('-');

      return {
        orderLine: line,
        location,
        aisle,
        bay: parseInt(bay) || 999,
        shelf: parseInt(shelf) || 999,
        sortKey: `${aisle}-${String(parseInt(bay) || 999).padStart(3, '0')}-${String(parseInt(shelf) || 999).padStart(3, '0')}`,
      };
    });

    // Sort by location for efficient picking
    optimizedItems.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Create pick sheet with items
    const pickSheet = await prisma.pickSheet.create({
      data: {
        tenantId: session.user.tenantId,
        sheetNumber,
        pickerName: pickerName || 'Unassigned',
        status: 'READY',
        createdById: session.user.id,
        items: {
          create: optimizedItems.map((item, index) => ({
            tenantId: session.user.tenantId,
            orderLineId: item.orderLine.id,
            skuId: item.orderLine.skuId,
            customerId: item.orderLine.order.customerId,
            quantity: item.orderLine.quantity,
            pickOrder: index + 1,
          })),
        },
      },
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true,
                inventories: true,
              },
            },
            customer: true,
          },
          orderBy: {
            pickOrder: 'asc',
          },
        },
      },
    });

    // Update orders with pick sheet status
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
        tenantId: session.user.tenantId,
      },
      data: {
        pickSheetStatus: 'picking',
        pickSheetId: pickSheet.id,
      },
    });

    return NextResponse.json({ pickSheet }, { status: 201 });
  } catch (error) {
    console.error('Error creating pick sheet:', error);
    return NextResponse.json(
      { error: 'Failed to create pick sheet' },
      { status: 500 }
    );
  }
}
