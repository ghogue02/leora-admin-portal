import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesUserContext } from '@/lib/sales-auth';

// GET /api/sales/leora/queries - List all saved queries for current user
export async function GET(request: NextRequest) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeTemplates = searchParams.get('includeTemplates') === 'true';
    const category = searchParams.get('category');

    const whereClause: any = {
      tenantId: context.tenantId,
      OR: [
        { userId: context.userId },
        { isShared: true },
      ],
    };

    if (!includeTemplates) {
      whereClause.isTemplate = false;
    }

    if (category) {
      whereClause.category = category;
    }

    const queries = await prisma.savedQuery.findMany({
      where: whereClause,
      orderBy: [
        { lastUsedAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        description: true,
        queryText: true,
        isTemplate: true,
        isShared: true,
        category: true,
        tags: true,
        usageCount: true,
        lastUsedAt: true,
        createdAt: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ queries });
  } catch (error) {
    console.error('Error fetching saved queries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved queries' },
      { status: 500 }
    );
  }
}

// POST /api/sales/leora/queries - Create a new saved query
export async function POST(request: NextRequest) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, queryText, category, tags, isShared } = body;

    if (!name || !queryText) {
      return NextResponse.json(
        { error: 'Name and query text are required' },
        { status: 400 }
      );
    }

    const query = await prisma.savedQuery.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        name,
        description,
        queryText,
        category,
        tags: tags || [],
        isShared: isShared || false,
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

    return NextResponse.json({ query }, { status: 201 });
  } catch (error) {
    console.error('Error creating saved query:', error);
    return NextResponse.json(
      { error: 'Failed to create saved query' },
      { status: 500 }
    );
  }
}
