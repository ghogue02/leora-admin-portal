/**
 * Email List Detail API
 * GET /api/sales/marketing/lists/[listId] - Get list details
 * PATCH /api/sales/marketing/lists/[listId] - Update list
 * DELETE /api/sales/marketing/lists/[listId] - Delete list
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { populateSmartList } from '@/lib/marketing/smart-lists';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    const tenantId = request.headers.get('x-tenant-id') || '';

    const list = await prisma.emailList.findUnique({
      where: { id: listId },
      include: {
        members: {
          include: {
            // Would include customer data here
          },
          take: 100, // Limit for performance
        },
        _count: {
          select: { members: true },
        },
      },
    });

    if (!list || list.tenantId !== tenantId) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Error fetching email list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email list' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    const tenantId = request.headers.get('x-tenant-id') || '';
    const body = await request.json();

    const { name, description, smartCriteria } = body;

    const list = await prisma.emailList.update({
      where: { id: listId },
      data: {
        name,
        description,
        smartCriteria,
      },
    });

    // Re-populate if smart list and criteria changed
    if (list.isSmartList && smartCriteria) {
      await populateSmartList(tenantId, listId);
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('Error updating email list:', error);
    return NextResponse.json(
      { error: 'Failed to update email list' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;

    await prisma.emailList.delete({
      where: { id: listId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email list:', error);
    return NextResponse.json(
      { error: 'Failed to delete email list' },
      { status: 500 }
    );
  }
}
