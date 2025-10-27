/**
 * Inventory Adjustment API Route
 *
 * POST /api/inventory/:skuId/adjust - Adjust inventory quantity
 */

import { NextRequest, NextResponse } from 'next/server';
import { adjustInventory, InventoryError } from '@/lib/inventory';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { skuId: string } }
) {
  try {
    const skuId = params.skuId;
    const body = await request.json();
    const { tenantId, quantity, reason, location = 'main', userId } = body;

    // 1. Validate inputs
    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    if (quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: 'quantity is required' },
        { status: 400 }
      );
    }

    if (typeof quantity !== 'number') {
      return NextResponse.json(
        { error: 'quantity must be a number' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json(
        { error: 'reason is required' },
        { status: 400 }
      );
    }

    // 2. Verify SKU exists
    const sku = await prisma.sku.findUnique({
      where: { id: skuId },
      include: { product: true },
    });

    if (!sku) {
      return NextResponse.json(
        { error: 'SKU not found' },
        { status: 404 }
      );
    }

    if (sku.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'SKU does not belong to this tenant' },
        { status: 403 }
      );
    }

    // 3. Adjust inventory (atomic transaction)
    await adjustInventory(tenantId, skuId, quantity, reason, location, userId);

    // 4. Get updated inventory
    const inventory = await prisma.inventory.findUnique({
      where: {
        tenantId_skuId_location: {
          tenantId,
          skuId,
          location,
        },
      },
      include: {
        sku: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Inventory adjusted successfully',
      inventory,
      adjustment: {
        quantity,
        reason,
        location,
      },
    });
  } catch (error) {
    console.error('Error adjusting inventory:', error);

    if (error instanceof InventoryError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to adjust inventory' },
      { status: 500 }
    );
  }
}
