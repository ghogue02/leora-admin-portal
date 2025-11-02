import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withSalesSession } from '@/lib/auth/sales';

// GET /api/sales/leora/queries - List all saved queries for current user
export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, session }) => {
      try {
        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const includeTemplates = searchParams.get('includeTemplates') === 'true';
        const category = searchParams.get('category');

        const whereClause: any = {
          tenantId,
          OR: [
            { userId },
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
    },
    { requireSalesRep: false },
  );
}

// POST /api/sales/leora/queries - Create a new saved query
export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, session }) => {
      try {
        const userId = session.user.id;
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
            tenantId,
            userId,
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
    },
    { requireSalesRep: false },
  );
}
