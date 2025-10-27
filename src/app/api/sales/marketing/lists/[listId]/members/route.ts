/**
 * Email List Members API
 * POST /api/sales/marketing/lists/[listId]/members - Add member to list
 * DELETE /api/sales/marketing/lists/[listId]/members - Remove member from list
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { listId } = await params;
    const tenantId = request.headers.get('x-tenant-id') || '';
    const body = await request.json();

    const { customerIds } = body;

    // Add members
    await prisma.emailListMember.createMany({
      data: customerIds.map((customerId: string) => ({
        tenantId,
        listId,
        customerId,
      })),
      skipDuplicates: true,
    });

    // Update member count
    const count = await prisma.emailListMember.count({
      where: { listId },
    });

    await prisma.emailList.update({
      where: { id: listId },
      data: { memberCount: count },
    });

    return NextResponse.json({ added: customerIds.length });
  } catch (error) {
    console.error('Error adding list members:', error);
    return NextResponse.json(
      { error: 'Failed to add members' },
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
    const body = await request.json();

    const { customerIds } = body;

    // Remove members
    await prisma.emailListMember.deleteMany({
      where: {
        listId,
        customerId: {
          in: customerIds,
        },
      },
    });

    // Update member count
    const count = await prisma.emailListMember.count({
      where: { listId },
    });

    await prisma.emailList.update({
      where: { id: listId },
      data: { memberCount: count },
    });

    return NextResponse.json({ removed: customerIds.length });
  } catch (error) {
    console.error('Error removing list members:', error);
    return NextResponse.json(
      { error: 'Failed to remove members' },
      { status: 500 }
    );
  }
}
