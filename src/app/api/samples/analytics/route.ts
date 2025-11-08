import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Validation schema for query parameters
const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  skuId: z.string().uuid().optional(),
  salesRepId: z.string().uuid().optional(),
});

interface ProductMetrics {
  productId: string;
  productName: string;
  sku: string;
  totalSamples: number;
  conversions: number;
  conversionRate: number;
  revenue: Decimal;
}

interface RepMetrics {
  salesRepId: string;
  salesRepName: string;
  totalSamples: number;
  conversions: number;
  conversionRate: number;
  revenue: Decimal;
}

interface TimelinePoint {
  date: Date;
  samples: number;
  conversions: number;
  revenue: Decimal;
}

type DateRangeFilter = {
  gte?: Date;
  lte?: Date;
};

type AnalyticsWhereClause = {
  dateGiven?: DateRangeFilter;
  skuId?: string;
  salesRepId?: string;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const params = analyticsQuerySchema.parse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      skuId: searchParams.get('skuId') || undefined,
      salesRepId: searchParams.get('salesRepId') || undefined,
    });

    // Build date filter
    const dateFilter: DateRangeFilter = {};
    if (params.startDate) {
      dateFilter.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      dateFilter.lte = new Date(params.endDate);
    }

    // Build where clause
    const whereClause: AnalyticsWhereClause = {};
    if (Object.keys(dateFilter).length > 0) {
      whereClause.dateGiven = dateFilter;
    }
    if (params.skuId) {
      whereClause.skuId = params.skuId;
    }
    if (params.salesRepId) {
      whereClause.salesRepId = params.salesRepId;
    }

    // Query SampleMetrics table
    const metrics = await prisma.sampleMetrics.findMany({
      where: whereClause as unknown as Prisma.SampleMetricsWhereInput,
      include: {
        sku: {
          include: { product: true },
        },
        salesRep: true,
      },
    });

    // Calculate overview
    const overview = {
      totalSamples: metrics.reduce((sum, m) => sum + m.samplesGiven, 0),
      totalCustomers: new Set(metrics.map(m => m.customerId)).size,
      conversions: metrics.reduce((sum, m) => sum + m.conversions, 0),
      conversionRate: 0,
      totalRevenue: metrics.reduce(
        (sum, m) => sum.add(m.totalRevenue),
        new Decimal(0)
      ),
    };

    if (overview.totalSamples > 0) {
      overview.conversionRate = (overview.conversions / overview.totalSamples) * 100;
    }

    // Aggregate by product
    const productMap = new Map<string, ProductMetrics>();
    metrics.forEach(m => {
      const key = m.skuId;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: m.sku.productId,
          productName: m.sku.product.name,
          sku: m.sku.skuCode,
          totalSamples: 0,
          conversions: 0,
          conversionRate: 0,
          revenue: new Decimal(0),
        });
      }
      const product = productMap.get(key)!;
      product.totalSamples += m.samplesGiven;
      product.conversions += m.conversions;
      product.revenue = product.revenue.add(m.totalRevenue);
    });

    // Calculate conversion rates for products
    const byProduct = Array.from(productMap.values()).map(p => ({
      ...p,
      conversionRate: p.totalSamples > 0 ? (p.conversions / p.totalSamples) * 100 : 0,
    }));

    // Aggregate by sales rep
    const repMap = new Map<string, RepMetrics>();
    metrics.forEach(m => {
      if (!m.salesRepId) return;

      const key = m.salesRepId;
      if (!repMap.has(key)) {
        repMap.set(key, {
          salesRepId: m.salesRepId,
          salesRepName: m.salesRep?.name || 'Unknown',
          totalSamples: 0,
          conversions: 0,
          conversionRate: 0,
          revenue: new Decimal(0),
        });
      }
      const rep = repMap.get(key)!;
      rep.totalSamples += m.samplesGiven;
      rep.conversions += m.conversions;
      rep.revenue = rep.revenue.add(m.totalRevenue);
    });

    // Calculate conversion rates for reps
    const byRep = Array.from(repMap.values()).map(r => ({
      ...r,
      conversionRate: r.totalSamples > 0 ? (r.conversions / r.totalSamples) * 100 : 0,
    }));

    // Create timeline (group by month)
    const timelineMap = new Map<string, TimelinePoint>();
    metrics.forEach(m => {
      const monthKey = m.periodStart.toISOString().substring(0, 7); // YYYY-MM
      if (!timelineMap.has(monthKey)) {
        timelineMap.set(monthKey, {
          date: new Date(monthKey + '-01'),
          samples: 0,
          conversions: 0,
          revenue: new Decimal(0),
        });
      }
      const point = timelineMap.get(monthKey)!;
      point.samples += m.samplesGiven;
      point.conversions += m.conversions;
      point.revenue = point.revenue.add(m.totalRevenue);
    });

    const timeline = Array.from(timelineMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return NextResponse.json({
      overview,
      byProduct,
      byRep,
      timeline,
    });
  } catch (error) {
    console.error('[Analytics] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
