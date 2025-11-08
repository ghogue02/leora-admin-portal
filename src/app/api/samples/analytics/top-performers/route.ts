import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Validation schema
const topPerformersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.enum(['conversion', 'revenue']).default('conversion'),
  period: z.enum(['7d', '30d', '90d', '365d', 'all']).default('30d'),
});

type SampleMetricWithSku = Prisma.SampleMetricsGetPayload<{
  include: {
    sku: {
      include: { product: true };
    };
  };
}>;

type PerformerAggregate = {
  sku: SampleMetricWithSku['sku'];
  samplesGiven: number;
  conversions: number;
  conversionRate: number;
  revenue: Decimal;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = topPerformersQuerySchema.parse({
      limit: searchParams.get('limit') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      period: searchParams.get('period') || undefined,
    });

    // Calculate date filter based on period
    let dateFilter: Date | undefined;
    if (params.period !== 'all') {
      const days = parseInt(params.period);
      dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    // Query sample metrics grouped by SKU
    const metrics = await prisma.sampleMetrics.findMany({
      where: dateFilter
        ? {
            periodStart: {
              gte: dateFilter,
            },
          }
        : undefined,
      include: {
        sku: {
          include: { product: true },
        },
      },
    });

    // Aggregate by SKU
    const skuMap = new Map<string, PerformerAggregate>();

    metrics.forEach(m => {
      const key = m.skuId;
      if (!skuMap.has(key)) {
        skuMap.set(key, {
          sku: m.sku,
          samplesGiven: 0,
          conversions: 0,
          conversionRate: 0,
          revenue: new Decimal(0),
        });
      }
      const performer = skuMap.get(key)!;
      performer.samplesGiven += m.samplesGiven;
      performer.conversions += m.conversions;
      performer.revenue = performer.revenue.add(m.totalRevenue);
    });

    // Calculate conversion rates
    const performers = Array.from(skuMap.values()).map(p => ({
      ...p,
      conversionRate: p.samplesGiven > 0 ? (p.conversions / p.samplesGiven) * 100 : 0,
    }));

    // Sort by selected metric
    performers.sort((a, b) => {
      if (params.sortBy === 'conversion') {
        return b.conversionRate - a.conversionRate;
      } else {
        return b.revenue.toNumber() - a.revenue.toNumber();
      }
    });

    // Add rank and limit
    const topPerformers = performers.slice(0, params.limit).map((p, index) => ({
      ...p,
      rank: index + 1,
    }));

    return NextResponse.json({
      performers: topPerformers,
      metadata: {
        period: params.period,
        sortBy: params.sortBy,
        totalProducts: performers.length,
      },
    });
  } catch (error) {
    console.error('[TopPerformers] Error:', error);

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
