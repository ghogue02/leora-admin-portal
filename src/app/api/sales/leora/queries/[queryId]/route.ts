import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesUserContext } from '@/lib/sales-auth';

// GET /api/sales/leora/queries/[queryId] - Get a specific saved query
export async function GET(
  request: NextRequest,
  { params }: { params: { queryId: string } }
) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = await prisma.savedQuery.findFirst({
      where: {
        id: params.queryId,
        tenantId: context.tenantId,
        OR: [
          { userId: context.userId },
          { isShared: true },
        ],
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    return NextResponse.json({ query });
  } catch (error) {
    console.error('Error fetching saved query:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved query' },
      { status: 500 }
    );
  }
}

// PUT /api/sales/leora/queries/[queryId] - Update a saved query
export async function PUT(
  request: NextRequest,
  { params }: { params: { queryId: string } }
) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, queryText, category, tags, isShared } = body;

    // Check ownership
    const existing = await prisma.savedQuery.findFirst({
      where: {
        id: params.queryId,
        tenantId: context.tenantId,
        userId: context.userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Query not found or access denied' },
        { status: 404 }
      );
    }

    const query = await prisma.savedQuery.update({
      where: { id: params.queryId },
      data: {
        name,
        description,
        queryText,
        category,
        tags,
        isShared,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ query });
  } catch (error) {
    console.error('Error updating saved query:', error);
    return NextResponse.json(
      { error: 'Failed to update saved query' },
      { status: 500 }
    );
  }
}

// DELETE /api/sales/leora/queries/[queryId] - Delete a saved query
export async function DELETE(
  request: NextRequest,
  { params }: { params: { queryId: string } }
) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check ownership
    const existing = await prisma.savedQuery.findFirst({
      where: {
        id: params.queryId,
        tenantId: context.tenantId,
        userId: context.userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Query not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.savedQuery.delete({
      where: { id: params.queryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved query:', error);
    return NextResponse.json(
      { error: 'Failed to delete saved query' },
      { status: 500 }
    );
  }
}
