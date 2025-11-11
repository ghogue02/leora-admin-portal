import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPickSheetSchema, pickSheetQuerySchema } from '@/lib/validations/warehouse';
import { formatUTCDate } from '@/lib/dates';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getTenantChannelName } from '@/lib/realtime/channels.server';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = pickSheetQuerySchema.parse(Object.fromEntries(searchParams));

    const where: Prisma.PickSheetWhereInput = {
      tenantId: session.user.tenantId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate) dateFilter.lte = new Date(query.endDate);
      where.createdAt = dateFilter;
    }

    const pickSheets = await prisma.pickSheet.findMany({
      where,
      include: {
        items: {
          include: {
            sku: {
              include: {
                product: true,
              },
            },
            customer: true,
          },
          orderBy: {
            pickOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const warehouseChannel = getTenantChannelName(session.user.tenantId, "warehouse");
    return NextResponse.json({
      pickSheets,
      realtimeChannels: {
        warehouse: warehouseChannel,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 });
    }
    console.error('Error fetching pick sheets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pick sheets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createPickSheetSchema.parse(body);

    let pickSheet;
    let itemCount = 0;

    await prisma.$transaction(async (tx) => {
      // Find orders to include in pick sheet
      const where: Prisma.OrderWhereInput = {
        tenantId: session.user.tenantId,
        status: 'SUBMITTED',
        pickSheetStatus: 'NONE',
      };

      if (validated.orderIds && validated.orderIds.length > 0) {
        where.id = { in: validated.orderIds };
      }

      const orders = await tx.order.findMany({
        where,
        include: {
          lines: {
            include: {
              sku: {
                include: {
                  inventories: {
                    where: {
                      tenantId: session.user.tenantId,
                      pickOrder: { not: null },
                    },
                    orderBy: {
                      pickOrder: 'asc',
                    },
                    take: 1,
                  },
                },
              },
            },
          },
          customer: true,
        },
      });

      if (orders.length === 0) {
        throw new Error('No eligible orders found for pick sheet');
      }

      // Generate sheet number
      const today = new Date();
      const dateStr = formatUTCDate(today).replace(/-/g, '');
      const count = await tx.pickSheet.count({
        where: {
          tenantId: session.user.tenantId,
          sheetNumber: { startsWith: `PS-${dateStr}` },
        },
      });
      const sheetNumber = `PS-${dateStr}-${String(count + 1).padStart(3, '0')}`;

      // Create pick sheet
      pickSheet = await tx.pickSheet.create({
        data: {
          tenantId: session.user.tenantId,
          sheetNumber,
          pickerName: validated.pickerName,
          status: 'READY',
        },
      });

      // Create pick sheet items
      const items: Prisma.PickSheetItemCreateManyInput[] = [];
      for (const order of orders) {
        for (const line of order.lines) {
          const inventory = line.sku.inventories[0];
          items.push({
            tenantId: session.user.tenantId,
            pickSheetId: pickSheet.id,
            orderLineId: line.id,
            skuId: line.skuId,
            customerId: order.customerId,
            quantity: line.quantity,
            location: inventory?.location,
            pickOrder: inventory?.pickOrder,
          });
        }
      }

      // Sort items by pick order
      items.sort((a, b) => (a.pickOrder || Infinity) - (b.pickOrder || Infinity));

      await tx.pickSheetItem.createMany({
        data: items,
      });

      itemCount = items.length;

      // Update orders
      await tx.order.updateMany({
        where: { id: { in: orders.map(o => o.id) } },
        data: { pickSheetStatus: 'ON_SHEET' },
      });
    });

    return NextResponse.json({
      pickSheet,
      itemCount,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating pick sheet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create pick sheet' },
      { status: 500 }
    );
  }
}
