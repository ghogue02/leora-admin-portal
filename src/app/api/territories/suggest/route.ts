import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clusterPoints } from '@/lib/geospatial';
import { z } from 'zod';

const suggestSchema = z.object({
  salesRepId: z.string().optional(),
  clusterCount: z.number().min(1).max(10).default(3)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salesRepId, clusterCount } = suggestSchema.parse(body);

    // Get customers with coordinates
    let whereClause: any = {
      latitude: { not: null },
      longitude: { not: null }
    };

    // If sales rep specified, filter by their territory
    if (salesRepId) {
      const territories = await prisma.territory.findMany({
        where: { salesRepId },
        select: { name: true }
      });

      if (territories.length > 0) {
        whereClause.territory = {
          in: territories.map(t => t.name)
        };
      }
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        latitude: true,
        longitude: true
      }
    });

    if (customers.length < clusterCount * 3) {
      return NextResponse.json(
        { error: 'Not enough customers for clustering' },
        { status: 400 }
      );
    }

    // Cluster customers
    const points = customers.map(c => ({
      id: c.id,
      latitude: c.latitude!,
      longitude: c.longitude!
    }));

    const suggestions = clusterPoints(points, clusterCount);

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Territory suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to generate territory suggestions' },
      { status: 500 }
    );
  }
}
