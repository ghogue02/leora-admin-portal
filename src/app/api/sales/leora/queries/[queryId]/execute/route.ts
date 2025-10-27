import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesUserContext } from '@/lib/sales-auth';

// POST /api/sales/leora/queries/[queryId]/execute - Execute a saved query
export async function POST(
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
    });

    if (!query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 });
    }

    // Update usage stats
    await prisma.savedQuery.update({
      where: { id: params.queryId },
      data: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    // Add to query history
    await prisma.queryHistory.create({
      data: {
        tenantId: context.tenantId,
        userId: context.userId,
        queryText: query.queryText,
      },
    });

    // Return the query text for the UI to send to the copilot
    return NextResponse.json({
      query: query.queryText,
      name: query.name,
    });
  } catch (error) {
    console.error('Error executing saved query:', error);
    return NextResponse.json(
      { error: 'Failed to execute saved query' },
      { status: 500 }
    );
  }
}
