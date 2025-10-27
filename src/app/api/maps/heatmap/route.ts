import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, filters, metric = 'revenue' } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {
      tenantId,
      latitude: { not: null },
      longitude: { not: null },
    };

    if (filters?.territories?.length > 0) {
      where.territory = { in: filters.territories };
    }

    if (filters?.accountTypes?.length > 0) {
      where.accountType = { in: filters.accountTypes };
    }

    if (filters?.salesReps?.length > 0) {
      where.salesRepId = { in: filters.salesReps };
    }

    // Date range filter for orders
    let orderWhere: any = { status: { not: 'CANCELLED' } };

    if (filters?.dateRange?.start && filters?.dateRange?.end) {
      orderWhere.createdAt = {
        gte: new Date(filters.dateRange.start),
        lte: new Date(filters.dateRange.end),
      };
    }

    // Fetch customers with their metrics
    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        latitude: true,
        longitude: true,
        orders: {
          where: orderWhere,
          select: {
            totalAmount: true,
            createdAt: true,
          },
        },
      },
    });

    // Calculate metrics for each customer
    const heatPoints = customers.map(customer => {
      const orders = customer.orders;
      const revenue = orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );
      const orderCount = orders.length;

      // Calculate growth (last 30 days vs previous 30 days)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const recentRevenue = orders
        .filter(o => o.createdAt >= thirtyDaysAgo)
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);

      const previousRevenue = orders
        .filter(o => o.createdAt >= sixtyDaysAgo && o.createdAt < thirtyDaysAgo)
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);

      const growth =
        previousRevenue > 0
          ? (recentRevenue - previousRevenue) / previousRevenue
          : 0;

      // Conversion rate (simplified - would need more data for real calc)
      const conversionRate = orderCount > 0 ? Math.min(orderCount / 100, 1) : 0;

      return {
        type: 'Feature' as const,
        properties: {
          revenue,
          orderCount,
          growth,
          conversionRate,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [customer.longitude!, customer.latitude!],
        },
      };
    });

    const heatMapData = {
      type: 'FeatureCollection' as const,
      features: heatPoints,
    };

    return NextResponse.json(heatMapData);
  } catch (error) {
    console.error('Error generating heat map:', error);
    return NextResponse.json(
      { error: 'Failed to generate heat map' },
      { status: 500 }
    );
  }
}
