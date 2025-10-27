'use server';

import { NextRequest, NextResponse } from 'next/server';
import { addDays, endOfDay, formatISO, parseISO, startOfDay, subDays, isValid } from 'date-fns';
import { withSalesSession } from '@/lib/auth/sales';

type TrendPoint = {
  date: string;
  samples: number;
  conversions: number;
  revenue: number;
};

type ProductAggregate = {
  id: string;
  productName: string;
  skuCode: string;
  brand: string;
  events: number;
  samplesGiven: number;
  conversions: number;
  orders: number;
  revenue: number;
};

type RepAggregate = {
  id: string;
  name: string;
  events: number;
  samplesGiven: number;
  conversions: number;
  revenue: number;
};

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) {
    return fallback;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { searchParams } = request.nextUrl;
    const endParam = searchParams.get('endDate');
    const startParam = searchParams.get('startDate');

    const now = new Date();
    const rawEnd = parseDateParam(endParam, now);
    const endDate = endOfDay(rawEnd);
    const defaultStart = subDays(endDate, 90);
    const rawStart = parseDateParam(startParam, defaultStart);
    const startDate = startOfDay(rawStart);

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'Invalid date range: startDate must be before endDate' },
        { status: 400 }
      );
    }

    const samples = await db.sampleUsage.findMany({
      where: {
        tenantId,
        tastedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        sku: {
          select: {
            id: true,
            code: true,
            product: {
              select: {
                name: true,
                brand: true,
              },
            },
          },
        },
        salesRep: {
          select: {
            id: true,
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
      },
      orderBy: {
        tastedAt: 'asc',
      },
    });

    if (samples.length === 0) {
      return NextResponse.json({
        overview: {
          totalSamples: 0,
          conversionRate: 0,
          totalRevenue: 0,
          activeProducts: 0,
        },
        trends: [] as TrendPoint[],
        topProducts: [] as any[],
        repPerformance: [] as any[],
      });
    }

    const customerIds = Array.from(new Set(samples.map((sample) => sample.customerId)));
    const skuIds = Array.from(new Set(samples.map((sample) => sample.skuId)));

    const orders = await db.order.findMany({
      where: {
        tenantId,
        customerId: {
          in: customerIds,
        },
        orderedAt: {
          gte: startDate,
          lte: addDays(endDate, 30),
        },
        lines: {
          some: {
            skuId: {
              in: skuIds,
            },
          },
        },
      },
      include: {
        lines: {
          where: {
            skuId: {
              in: skuIds,
            },
          },
          select: {
            skuId: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    const trends = new Map<string, TrendPoint>();
    const productAggregates = new Map<string, ProductAggregate>();
    const repAggregates = new Map<string, RepAggregate>();

    let totalRevenue = 0;
    let totalConversions = 0;

    for (const sample of samples) {
      const sampleDateKey = formatISO(sample.tastedAt, { representation: 'date' });
      const attributionWindowEnd = addDays(sample.tastedAt, 30);

      const matchingOrders = orders.filter((order) => {
        if (!order.orderedAt) {
          return false;
        }
        return (
          order.customerId === sample.customerId &&
          order.orderedAt >= sample.tastedAt &&
          order.orderedAt <= attributionWindowEnd
        );
      });

      const sampleRevenue = matchingOrders.reduce((sum, order) => {
        const revenueForSample = order.lines
          .filter((line) => line.skuId === sample.skuId)
          .reduce((lineSum, line) => lineSum + Number(line.unitPrice) * line.quantity, 0);
        return sum + revenueForSample;
      }, 0);

      const sampleConverted = sample.resultedInOrder || matchingOrders.length > 0;
      if (sampleConverted) {
        totalConversions += 1;
      }
      totalRevenue += sampleRevenue;

      const trendPoint = trends.get(sampleDateKey) ?? {
        date: sampleDateKey,
        samples: 0,
        conversions: 0,
        revenue: 0,
      };
      trendPoint.samples += 1;
      if (sampleConverted) {
        trendPoint.conversions += 1;
      }
      trendPoint.revenue += sampleRevenue;
      trends.set(sampleDateKey, trendPoint);

      const product = productAggregates.get(sample.skuId) ?? {
        id: sample.skuId,
        productName: sample.sku.product.name ?? 'Unknown Product',
        skuCode: sample.sku.code,
        brand: sample.sku.product.brand ?? '',
        events: 0,
        samplesGiven: 0,
        conversions: 0,
        orders: 0,
        revenue: 0,
      };
      product.events += 1;
      product.samplesGiven += sample.quantity ?? 1;
      product.revenue += sampleRevenue;
      product.orders += matchingOrders.length;
      if (sampleConverted) {
        product.conversions += 1;
      }
      productAggregates.set(sample.skuId, product);

      if (sample.salesRepId) {
        const rep = repAggregates.get(sample.salesRepId) ?? {
          id: sample.salesRepId,
          name: sample.salesRep?.user?.fullName ?? 'Unknown Sales Rep',
          events: 0,
          samplesGiven: 0,
          conversions: 0,
          revenue: 0,
        };
        rep.events += 1;
        rep.samplesGiven += sample.quantity ?? 1;
        rep.revenue += sampleRevenue;
        if (sampleConverted) {
          rep.conversions += 1;
        }
        repAggregates.set(sample.salesRepId, rep);
      }
    }

    const totalSamples = samples.length;
    const overview = {
      totalSamples,
      conversionRate: totalSamples > 0 ? totalConversions / totalSamples : 0,
      totalRevenue,
      activeProducts: productAggregates.size,
    };

    const trendsData = Array.from(trends.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const topProducts = Array.from(productAggregates.values())
      .map((product) => ({
        id: product.id,
        productName: product.productName,
        skuCode: product.skuCode,
        brand: product.brand,
        samplesGiven: product.samplesGiven,
        orders: product.orders,
        conversionRate: product.events > 0 ? product.conversions / product.events : 0,
        revenue: product.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const repPerformance = Array.from(repAggregates.values())
      .map((rep) => ({
        id: rep.id,
        name: rep.name,
        samplesGiven: rep.samplesGiven,
        conversions: rep.conversions,
        revenue: rep.revenue,
        conversionRate: rep.events > 0 ? rep.conversions / rep.events : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json({
      overview,
      trends: trendsData,
      topProducts,
      repPerformance,
    });
  });
}
