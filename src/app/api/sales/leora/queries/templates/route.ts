import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalesUserContext } from '@/lib/sales-auth';

// Pre-defined query templates
const QUERY_TEMPLATES = [
  {
    name: 'Top Customers This Month',
    description: 'Show the top 10 customers by revenue this month',
    queryText: 'Who are my top 10 customers by revenue this month?',
    category: 'Customers',
    tags: ['revenue', 'customers', 'monthly'],
  },
  {
    name: 'At-Risk Accounts in Territory',
    description: 'List all at-risk accounts that need attention',
    queryText: 'Show me all at-risk customers in my territory who need immediate attention',
    category: 'Customers',
    tags: ['at-risk', 'territory', 'cadence'],
  },
  {
    name: 'Products Trending Down',
    description: 'Products with declining sales compared to last month',
    queryText: 'Which products are selling less this month compared to last month?',
    category: 'Products',
    tags: ['products', 'trends', 'declining'],
  },
  {
    name: 'New Customers This Week',
    description: 'Customers who placed their first order this week',
    queryText: 'Show me all new customers who placed their first order this week',
    category: 'Customers',
    tags: ['new', 'customers', 'weekly'],
  },
  {
    name: 'Dormant Customers to Reactivate',
    description: 'Customers who haven\'t ordered in 60+ days',
    queryText: 'List dormant customers who haven\'t ordered in 60+ days with reactivation strategies',
    category: 'Customers',
    tags: ['dormant', 'reactivation'],
  },
  {
    name: 'Weekly Revenue Breakdown',
    description: 'Detailed breakdown of this week\'s revenue',
    queryText: 'Give me a detailed breakdown of my revenue for this week',
    category: 'Revenue',
    tags: ['revenue', 'weekly', 'breakdown'],
  },
  {
    name: 'Sample Conversion Analysis',
    description: 'Analyze which samples are converting to orders',
    queryText: 'Which product samples have the highest conversion rate to orders?',
    category: 'Samples',
    tags: ['samples', 'conversion', 'products'],
  },
  {
    name: 'Priority Call List',
    description: 'Who to call today based on cadence and risk',
    queryText: 'Based on customer cadence and risk status, who should I prioritize calling today?',
    category: 'Call Planning',
    tags: ['calls', 'priority', 'cadence'],
  },
  {
    name: 'Quota Progress Report',
    description: 'How am I tracking toward my weekly/monthly quota?',
    queryText: 'How am I tracking toward my weekly and monthly quotas? What do I need to close?',
    category: 'Performance',
    tags: ['quota', 'progress', 'goals'],
  },
  {
    name: 'Territory Health Overview',
    description: 'Overall health snapshot of my territory',
    queryText: 'Give me a comprehensive health overview of my territory including risks and opportunities',
    category: 'Territory',
    tags: ['territory', 'health', 'overview'],
  },
];

// GET /api/sales/leora/queries/templates - Get all query templates
export async function GET(request: NextRequest) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user-created templates
    const userTemplates = await prisma.savedQuery.findMany({
      where: {
        tenantId: context.tenantId,
        isTemplate: true,
        OR: [
          { userId: context.userId },
          { isShared: true },
        ],
      },
      orderBy: { usageCount: 'desc' },
    });

    // Combine with pre-defined templates
    return NextResponse.json({
      predefined: QUERY_TEMPLATES,
      custom: userTemplates,
    });
  } catch (error) {
    console.error('Error fetching query templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch query templates' },
      { status: 500 }
    );
  }
}

// POST /api/sales/leora/queries/templates - Create template from existing query
export async function POST(request: NextRequest) {
  try {
    const context = await getSalesUserContext(request);
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { queryId } = body;

    if (!queryId) {
      return NextResponse.json(
        { error: 'Query ID is required' },
        { status: 400 }
      );
    }

    // Mark query as template
    const query = await prisma.savedQuery.update({
      where: {
        id: queryId,
        tenantId: context.tenantId,
        userId: context.userId,
      },
      data: {
        isTemplate: true,
      },
    });

    return NextResponse.json({ query });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
