import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }
    const body = await request.json();

    const { targetRevenue, targetCases } = body;

    const goal = await db.repProductGoal.update({
      where: {
        id: params.id,
        tenantId: salesRep.tenantId,
        salesRepId: salesRep.id,
      },
      data: {
        targetRevenue: targetRevenue ? Number(targetRevenue) : undefined,
        targetCases: targetCases || undefined,
      },
    });

    return NextResponse.json(goal);
    } catch (error) {
      console.error('Update product goal error:', error);
      return NextResponse.json(
        { error: 'Failed to update product goal' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

    await db.repProductGoal.delete({
      where: {
        id: params.id,
        tenantId: salesRep.tenantId,
        salesRepId: salesRep.id,
      },
    });

    return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Delete product goal error:', error);
      return NextResponse.json(
        { error: 'Failed to delete product goal' },
        { status: 500 }
      );
    }
  });
}
