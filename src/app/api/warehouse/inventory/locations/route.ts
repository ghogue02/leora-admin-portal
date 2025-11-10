import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { inventoryLocationQuerySchema, bulkLocationUpdateSchema } from '@/lib/validations/warehouse';
import { calculatePickOrder, parseLocation } from '@/lib/warehouse';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = inventoryLocationQuerySchema.parse(Object.fromEntries(searchParams));

    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (query.search) {
      where.OR = [
        { sku: { code: { contains: query.search, mode: 'insensitive' } } },
        { sku: { product: { name: { contains: query.search, mode: 'insensitive' } } } },
        { location: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.aisle) {
      where.aisle = query.aisle;
    }

    if (query.unassigned) {
      where.pickOrder = null;
    }

    const items = await prisma.inventory.findMany({
      where,
      include: {
        sku: {
          include: {
            product: true,
          },
        },
      },
      orderBy: query.unassigned ? { updatedAt: 'desc' } : { pickOrder: 'asc' },
      take: query.limit,
      skip: query.offset,
    });

    const total = await prisma.inventory.count({ where });

    return NextResponse.json({
      items,
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid query parameters', details: error.errors }, { status: 400 });
    }
    console.error('Error fetching inventory locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory locations' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = bulkLocationUpdateSchema.parse(body);

    const errors: Array<{ id: string; error: string }> = [];
    let updatedCount = 0;

    // Process updates in transaction
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        try {
          // Parse and validate location
          const locationResult = parseLocation({
            aisle: update.aisle,
            row: update.row,
            shelf: update.shelf,
          });

          if (!locationResult.success) {
            errors.push({ id: update.id, error: locationResult.error || 'Invalid location' });
            continue;
          }

          const pickOrder = locationResult.pickOrder!;

          await tx.inventory.update({
            where: {
              id: update.id,
              tenantId: session.user.tenantId,
            },
            data: {
              aisle: update.aisle,
              row: update.row,
              shelf: update.shelf,
              bin: update.bin,
              pickOrder,
              location: `${update.aisle}-${update.row}-${update.shelf}${update.bin ? `-${update.bin}` : ''}`,
            },
          });

          updatedCount++;
        } catch (err: any) {
          errors.push({ id: update.id, error: err.message || 'Update failed' });
        }
      }
    });

    return NextResponse.json({
      updated: updatedCount,
      errors,
      total: updates.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating inventory locations:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory locations' },
      { status: 500 }
    );
  }
}
