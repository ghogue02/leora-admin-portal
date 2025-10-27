import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; stopId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, actualArrival, notes } = body;

    const updateData: any = {};

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    if (status === 'completed' || status === 'delivered') {
      updateData.actualArrival = actualArrival ? new Date(actualArrival) : new Date();
    }

    const stop = await prisma.routeStop.update({
      where: {
        id: params.stopId,
        tenantId: session.user.tenantId,
      },
      data: updateData,
      include: {
        order: {
          include: {
            customer: true,
          },
        },
      },
    });

    // Update order delivery status
    if (status === 'completed' || status === 'delivered') {
      await prisma.order.update({
        where: {
          id: stop.orderId,
        },
        data: {
          deliveredAt: updateData.actualArrival,
          status: 'FULFILLED',
        },
      });
    }

    return NextResponse.json({ stop });
  } catch (error) {
    console.error('Error updating route stop:', error);
    return NextResponse.json(
      { error: 'Failed to update stop' },
      { status: 500 }
    );
  }
}
