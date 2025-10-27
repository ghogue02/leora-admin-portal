import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { updatePickItemSchema } from '@/lib/validations/warehouse';
import { z } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sheetId: string; itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { isPicked } = updatePickItemSchema.parse(body);

    const item = await prisma.pickSheetItem.update({
      where: {
        id: params.itemId,
        tenantId: session.user.tenantId,
        pickSheetId: params.sheetId,
      },
      data: {
        isPicked,
        pickedAt: isPicked ? new Date() : null,
      },
      include: {
        sku: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating pick item:', error);
    return NextResponse.json(
      { error: 'Failed to update pick item' },
      { status: 500 }
    );
  }
}
