import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pickSheet = await prisma.pickSheet.findFirst({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
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
                order: true,
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
    });

    if (!pickSheet) {
      return NextResponse.json(
        { error: 'Pick sheet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ pickSheet });
  } catch (error) {
    console.error('Error fetching pick sheet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pick sheet' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, pickerName, startedAt, completedAt } = body;

    const updateData: any = {};

    if (status) updateData.status = status;
    if (pickerName) updateData.pickerName = pickerName;
    if (startedAt) updateData.startedAt = new Date(startedAt);
    if (completedAt) updateData.completedAt = new Date(completedAt);

    const pickSheet = await prisma.pickSheet.update({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      data: updateData,
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

    return NextResponse.json({ pickSheet });
  } catch (error) {
    console.error('Error updating pick sheet:', error);
    return NextResponse.json(
      { error: 'Failed to update pick sheet' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.pickSheet.delete({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pick sheet:', error);
    return NextResponse.json(
      { error: 'Failed to delete pick sheet' },
      { status: 500 }
    );
  }
}
