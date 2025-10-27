import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    const { itemId, isPicked } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      isPicked,
    };

    if (isPicked) {
      updateData.pickedAt = new Date();
    } else {
      updateData.pickedAt = null;
    }

    const item = await prisma.pickSheetItem.update({
      where: {
        id: itemId,
        tenantId: session.user.tenantId,
      },
      data: updateData,
    });

    // Check if all items are picked
    const pickSheet = await prisma.pickSheet.findUnique({
      where: { id: params.id },
      include: {
        items: true,
      },
    });

    if (pickSheet) {
      const allPicked = pickSheet.items.every(item => item.isPicked);

      if (allPicked && pickSheet.status !== 'PICKED') {
        await prisma.pickSheet.update({
          where: { id: params.id },
          data: {
            status: 'PICKED',
            completedAt: new Date(),
          },
        });
      } else if (!allPicked && pickSheet.status === 'PICKED') {
        await prisma.pickSheet.update({
          where: { id: params.id },
          data: {
            status: 'PICKING',
            completedAt: null,
          },
        });
      }
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error updating pick sheet item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}
