/**
 * Order Shipping API Route
 *
 * POST /api/orders/:id/ship - Mark order as shipped and deduct inventory
 */

import { NextRequest, NextResponse } from 'next/server';
import { shipInventory, InventoryError } from '@/lib/inventory';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { trackingNumber, location = 'main', userId } = body;

    // 1. Validate tracking number
    if (!trackingNumber || typeof trackingNumber !== 'string') {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      );
    }

    // 2. Get order
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

    // 3. Check order status
    if (order.status !== 'SUBMITTED') {
      return NextResponse.json(
        {
          error: `Order cannot be shipped with status ${order.status}`,
          currentStatus: order.status,
        },
        { status: 400 }
      );
    }

    // 4. Ship inventory (atomic transaction)
    await shipInventory(orderId, trackingNumber, location, userId);

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
      message: 'Order shipped successfully',
      order: updatedOrder,
      trackingNumber,
    });
  } catch (error) {
    console.error('Error shipping order:', error);

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
      { error: 'Failed to ship order' },
      { status: 500 }
    );
  }
}
