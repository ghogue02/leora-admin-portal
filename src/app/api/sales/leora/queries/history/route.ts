import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withSalesSession } from '@/lib/auth/sales';

// GET /api/sales/leora/queries/history - Get query history for current user
export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, session }) => {
      try {
        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10', 10);

        const history = await prisma.queryHistory.findMany({
          where: {
            tenantId,
            userId,
          },
          orderBy: { executedAt: 'desc' },
          take: Math.min(limit, 50), // Max 50 records
          select: {
            id: true,
            queryText: true,
            executedAt: true,
          },
        });

        return NextResponse.json({ history });
      } catch (error) {
        console.error('Error fetching query history:', error);
        return NextResponse.json(
          { error: 'Failed to fetch query history' },
          { status: 500 }
        );
      }
    },
    { requireSalesRep: false },
  );
}

// POST /api/sales/leora/queries/history - Add query to history
export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, session }) => {
      try {
        const userId = session.user.id;

        const body = await request.json();
        const { queryText } = body;

        if (!queryText) {
          return NextResponse.json(
            { error: 'Query text is required' },
            { status: 400 }
          );
        }

        const entry = await prisma.queryHistory.create({
          data: {
            tenantId,
            userId,
            queryText,
          },
        });

        return NextResponse.json({ entry }, { status: 201 });
      } catch (error) {
        console.error('Error adding to query history:', error);
        return NextResponse.json(
          { error: 'Failed to add to query history' },
          { status: 500 }
        );
      }
    },
    { requireSalesRep: false },
  );
}
