import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Updates array is required' },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { skuId, location, aisle, row } = update;

        if (!skuId || !location) {
          errors.push({ skuId, error: 'Missing skuId or location' });
          continue;
        }

        // Find or create inventory record
        const existingInventory = await prisma.inventory.findFirst({
          where: {
            tenantId: session.user.tenantId,
            skuId,
          },
        });

        if (existingInventory) {
          const updated = await prisma.inventory.update({
            where: { id: existingInventory.id },
            data: { location, aisle, row },
            include: {
              sku: {
                include: {
                  product: true,
                },
              },
            },
          });
          results.push(updated);
        } else {
          const created = await prisma.inventory.create({
            data: {
              tenantId: session.user.tenantId,
              skuId,
              location,
              aisle,
              row,
              onHand: 0,
              allocated: 0,
            },
            include: {
              sku: {
                include: {
                  product: true,
                },
              },
            },
          });
          results.push(created);
        }
      } catch (error) {
        errors.push({ skuId: update.skuId, error: String(error) });
      }
    }

    return NextResponse.json({
      success: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (error) {
    console.error('Error bulk updating locations:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update locations' },
      { status: 500 }
    );
  }
}
