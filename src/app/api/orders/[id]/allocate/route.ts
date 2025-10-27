/**
 * Order Allocation API Route
 *
 * POST /api/orders/:id/allocate - Allocate inventory for an order
 */

import { NextRequest, NextResponse } from 'next/server';
import { allocateInventory, canAllocateOrder, InventoryError } from '@/lib/inventory';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { location = 'main', userId } = body;

    // 1. Get order with lines
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 2. Check if already allocated
    if (order.status === 'SUBMITTED' || order.status === 'FULFILLED') {
      return NextResponse.json(
        { error: `Order already ${order.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // 3. Pre-check inventory availability
    const allocationCheck = await canAllocateOrder(orderId, location);

    if (!allocationCheck.canAllocate) {
      const insufficientItems = allocationCheck.details
        .filter((d) => !d.sufficient)
        .map((d) => ({
          skuId: d.skuId,
          required: d.required,
          available: d.available,
          shortage: d.required - d.available,
        }));

      return NextResponse.json(
        {
          error: 'Insufficient inventory for one or more items',
          insufficientItems,
        },
        { status: 400 }
      );
    }

    // 4. Allocate inventory (atomic transaction)
    const items = order.lines.map((line) => ({
      skuId: line.skuId,
      quantity: line.quantity,
    }));

    await allocateInventory(orderId, items, location, userId);

    // 5. Get updated order
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          include: {
            sku: {
              include: {
                product: true,
              },
            },
          },
        },
        customer: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Inventory allocated successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error allocating inventory:', error);

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
      { error: 'Failed to allocate inventory' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders/:id/allocate - Check if order can be allocated
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location') || 'main';

    const allocationCheck = await canAllocateOrder(orderId, location);

    return NextResponse.json({
      orderId,
      location,
      ...allocationCheck,
    });
  } catch (error) {
    console.error('Error checking allocation:', error);

    if (error instanceof InventoryError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to check allocation availability' },
      { status: 500 }
    );
  }
}
