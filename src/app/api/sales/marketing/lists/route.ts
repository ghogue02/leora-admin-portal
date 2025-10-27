/**
 * Email Lists API
 * GET /api/sales/marketing/lists - List all email lists
 * POST /api/sales/marketing/lists - Create new email list
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { populateSmartList, previewSmartList } from '@/lib/marketing/smart-lists';

export async function GET(request: NextRequest) {
  try {
    // TODO: Get tenantId from auth session
    const tenantId = request.headers.get('x-tenant-id') || '';

    const searchParams = request.nextUrl.searchParams;
    const ownerId = searchParams.get('ownerId');
    const isSmartList = searchParams.get('isSmartList');

    const where: any = { tenantId };

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (isSmartList !== null) {
      where.isSmartList = isSmartList === 'true';
    }

    const lists = await prisma.emailList.findMany({
      where,
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error('Error fetching email lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email lists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Get tenantId and userId from auth session
    const tenantId = request.headers.get('x-tenant-id') || '';
    const userId = request.headers.get('x-user-id') || '';

    const body = await request.json();
    const { name, description, isSmartList, smartCriteria } = body;

    // Create email list
    const list = await prisma.emailList.create({
      data: {
        tenantId,
        name,
        description,
        ownerId: userId,
        isSmartList: isSmartList || false,
        smartCriteria: smartCriteria || null,
      },
    });

    // If smart list, populate immediately
    if (isSmartList && smartCriteria) {
      await populateSmartList(tenantId, list.id);
    }

    return NextResponse.json(list, { status: 201 });
  } catch (error) {
    console.error('Error creating email list:', error);
    return NextResponse.json(
      { error: 'Failed to create email list' },
      { status: 500 }
    );
  }
}
