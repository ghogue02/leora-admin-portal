import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

const leaderboardQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '365d']).default('30d'),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = leaderboardQuerySchema.parse({
      period: searchParams.get('period') || undefined,
      limit: searchParams.get('limit') || undefined,
    });

    // Calculate date ranges
    const days = parseInt(params.period);
    const currentPeriodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000);

    // Query current period metrics
    const currentMetrics = await prisma.sampleMetrics.findMany({
      where: {
        periodStart: {
          gte: currentPeriodStart,
        },
        salesRepId: {
          not: null,
        },
      },
      include: {
        salesRep: true,
      },
    });

    // Query previous period metrics for trend analysis
    const previousMetrics = await prisma.sampleMetrics.findMany({
      where: {
        periodStart: {
          gte: previousPeriodStart,
          lt: currentPeriodStart,
        },
        salesRepId: {
          not: null,
        },
      },
    });

    // Aggregate current period by sales rep
    type SalesRepSummary = {
      id?: string | null;
      name?: string | null;
    };

    const currentRepMap = new Map<
      string,
      {
        salesRep: SalesRepSummary | null;
        samplesGiven: number;
        conversions: number;
        conversionRate: number;
        revenue: Decimal;
      }
    >();

    currentMetrics.forEach(m => {
      if (!m.salesRepId) return;

      const key = m.salesRepId;
      if (!currentRepMap.has(key)) {
        currentRepMap.set(key, {
          salesRep: m.salesRep,
          samplesGiven: 0,
          conversions: 0,
          conversionRate: 0,
          revenue: new Decimal(0),
        });
      }
      const rep = currentRepMap.get(key)!;
      rep.samplesGiven += m.samplesGiven;
      rep.conversions += m.conversions;
      rep.revenue = rep.revenue.add(m.totalRevenue);
    });

    // Aggregate previous period for trends
    const previousRepMap = new Map<string, {
      conversions: number;
      samplesGiven: number;
    }>();

    previousMetrics.forEach(m => {
      if (!m.salesRepId) return;

      const key = m.salesRepId;
      if (!previousRepMap.has(key)) {
        previousRepMap.set(key, {
          conversions: 0,
          samplesGiven: 0,
        });
      }
      const rep = previousRepMap.get(key)!;
      rep.conversions += m.conversions;
      rep.samplesGiven += m.samplesGiven;
    });

    // Calculate conversion rates and trends
    const leaderboard = Array.from(currentRepMap.entries()).map(([repId, data]) => {
      const conversionRate = data.samplesGiven > 0
        ? (data.conversions / data.samplesGiven) * 100
        : 0;

      // Calculate trend
      const previous = previousRepMap.get(repId);
      let trend: 'up' | 'down' | 'stable' = 'stable';

      if (previous) {
        const previousRate = previous.samplesGiven > 0
          ? (previous.conversions / previous.samplesGiven) * 100
          : 0;

        const diff = conversionRate - previousRate;
        if (Math.abs(diff) > 2) { // Threshold: 2% change
          trend = diff > 0 ? 'up' : 'down';
        }
      }

      return {
        salesRep: data.salesRep,
        samplesGiven: data.samplesGiven,
        conversions: data.conversions,
        conversionRate,
        revenue: data.revenue,
        trend,
        rank: 0, // Will be assigned after sorting
      };
    });

    // Sort by conversion rate
    leaderboard.sort((a, b) => b.conversionRate - a.conversionRate);

    // Assign ranks
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Limit results
    const limitedLeaderboard = leaderboard.slice(0, params.limit);

    return NextResponse.json({
      leaderboard: limitedLeaderboard,
      metadata: {
        period: params.period,
        totalReps: leaderboard.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[RepLeaderboard] Error:', error);

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
