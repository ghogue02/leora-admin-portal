import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const pulledQuerySchema = z.object({
  salesRepId: z.string().uuid().optional(),
  days: z.coerce.number().int().positive().default(21),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = pulledQuerySchema.parse({
      salesRepId: searchParams.get('salesRepId') || undefined,
      days: searchParams.get('days') || undefined,
    });

    // Calculate date threshold
    const dateThreshold = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);

    // Build where clause
    const whereClause: any = {
      dateGiven: {
        gte: dateThreshold,
      },
    };

    if (params.salesRepId) {
      whereClause.salesRepId = params.salesRepId;
    }

    // Query pulled samples
    const pulled = await prisma.sampleUsage.findMany({
      where: whereClause,
      include: {
        sku: {
          include: { product: true },
        },
        customer: true,
        salesRep: true,
      },
      orderBy: {
        dateGiven: 'desc',
      },
    });

    // Filter samples needing follow-up
    // Follow-up needed if: followUpDate is past and not yet converted
    const now = new Date();
    const needFollowup = pulled.filter(sample => {
      return (
        sample.followUpDate &&
        sample.followUpDate <= now &&
        !sample.converted &&
        !sample.conversionDate
      );
    });

    return NextResponse.json({
      pulled,
      needFollowup,
      summary: {
        totalPulled: pulled.length,
        needFollowupCount: needFollowup.length,
        conversions: pulled.filter(s => s.converted).length,
        conversionRate: pulled.length > 0
          ? (pulled.filter(s => s.converted).length / pulled.length) * 100
          : 0,
      },
    });
  } catch (error) {
    console.error('[PulledSamples] Error:', error);

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
