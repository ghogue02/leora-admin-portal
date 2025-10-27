/**
 * Heat Map Data API Route
 * GET /api/map/heat
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const metric = (searchParams.get('metric') || 'revenue') as 'revenue' | 'orders';

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        latitude: true,
        longitude: true,
        establishedRevenue: true,
        orders: {
          where: { status: 'FULFILLED' },
          select: { total: true },
        },
      },
    });

    const heatData = customers.map(c => ({
      latitude: c.latitude,
      longitude: c.longitude,
      value: metric === 'revenue' 
        ? c.orders.reduce((sum, o) => sum + Number(o.total || 0), 0)
        : c.orders.length,
    })).filter(d => d.value > 0);

    return NextResponse.json({ success: true, metric, data: heatData });
  } catch (error) {
    console.error('Heat map error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
