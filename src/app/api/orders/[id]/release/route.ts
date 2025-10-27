/**
 * Order Release API Route
 *
 * POST /api/orders/:id/release - Release allocated inventory (cancel order)
 */

import { NextRequest, NextResponse } from 'next/server';
import { releaseInventory, InventoryError } from '@/lib/inventory';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { location = 'main', userId } = body;

    // 1. Get order
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

    // 2. Check if order can be cancelled
    if (order.status === 'FULFILLED') {
      return NextResponse.json(
        { error: 'Cannot cancel a fulfilled order' },
        { status: 400 }
      );
    }

    if (order.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      );
    }

    // 3. Release inventory (atomic transaction)
    await releaseInventory(orderId, location, userId);

    // 4. Get updated order
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
      message: 'Inventory released and order cancelled',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error releasing inventory:', error);

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
      { error: 'Failed to release inventory' },
      { status: 500 }
    );
  }
}
