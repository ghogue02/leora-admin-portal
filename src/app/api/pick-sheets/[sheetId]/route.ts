import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updatePickSheetSchema } from '@/lib/validations/warehouse';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { getTenantChannelName } from '@/lib/realtime/channels.server';

export async function GET(
  request: NextRequest,
  { params }: { params: { sheetId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pickSheet = await prisma.pickSheet.findUnique({
      where: {
        id: params.sheetId,
        tenantId: session.user.tenantId,
      },
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
    });

    if (!pickSheet) {
      return NextResponse.json({ error: 'Pick sheet not found' }, { status: 404 });
    }

    const warehouseChannel = getTenantChannelName(session.user.tenantId, 'warehouse');
    return NextResponse.json({
      pickSheet,
      realtimeChannels: {
        warehouse: warehouseChannel,
      },
    });
  } catch (error) {
    console.error('Error fetching pick sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pick sheet' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sheetId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, pickerName } = updatePickSheetSchema.parse(body);

    let pickSheet;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.pickSheet.findUnique({
        where: {
          id: params.sheetId,
          tenantId: session.user.tenantId,
        },
        include: {
          items: true,
        },
      });

      if (!existing) {
        throw new Error('Pick sheet not found');
      }

      const updates: Prisma.PickSheetUpdateInput = {};

      switch (action) {
        case 'start':
          if (existing.status !== 'READY') {
            throw new Error('Can only start pick sheets in READY status');
          }
          updates.status = 'PICKING';
          updates.startedAt = new Date();
          if (pickerName) updates.pickerName = pickerName;
          break;

        case 'complete':
          if (existing.status !== 'PICKING') {
            throw new Error('Can only complete pick sheets in PICKING status');
          }
          // Validate all items are picked
          const unpickedCount = existing.items.filter(item => !item.isPicked).length;
          if (unpickedCount > 0) {
            throw new Error(`Cannot complete: ${unpickedCount} items not yet picked`);
          }
          updates.status = 'PICKED';
          updates.completedAt = new Date();
          break;

        case 'cancel':
          if (existing.status === 'PICKED') {
            throw new Error('Cannot cancel completed pick sheets');
          }
          updates.status = 'CANCELLED';

          // Restore order pick sheet status
          const orderLineIds = existing.items.map(item => item.orderLineId);
          const orderIds = await tx.orderLine.findMany({
            where: { id: { in: orderLineIds } },
            select: { orderId: true },
          });

          await tx.order.updateMany({
            where: { id: { in: orderIds.map(o => o.orderId) } },
            data: { pickSheetStatus: 'NONE' },
          });
          break;
      }

      pickSheet = await tx.pickSheet.update({
        where: { id: params.sheetId },
        data: updates,
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
      });
    });

    return NextResponse.json(pickSheet);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating pick sheet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update pick sheet' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sheetId: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.$transaction(async (tx) => {
      const pickSheet = await tx.pickSheet.findUnique({
        where: {
          id: params.sheetId,
          tenantId: session.user.tenantId,
        },
        include: {
          items: true,
        },
      });

      if (!pickSheet) {
        throw new Error('Pick sheet not found');
      }

      if (!['DRAFT', 'READY'].includes(pickSheet.status)) {
        throw new Error('Can only delete pick sheets in DRAFT or READY status');
      }

      // Restore order statuses
      const orderLineIds = pickSheet.items.map(item => item.orderLineId);
      const orderIds = await tx.orderLine.findMany({
        where: { id: { in: orderLineIds } },
        select: { orderId: true },
      });

      await tx.order.updateMany({
        where: { id: { in: orderIds.map(o => o.orderId) } },
        data: { pickSheetStatus: 'NONE' },
      });

      // Delete pick sheet items
      await tx.pickSheetItem.deleteMany({
        where: { pickSheetId: params.sheetId },
      });

      // Delete pick sheet
      await tx.pickSheet.delete({
        where: { id: params.sheetId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pick sheet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete pick sheet' },
      { status: 500 }
    );
  }
}
