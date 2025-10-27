/**
 * Map Customers API Route
 * GET /api/map/customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

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
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        accountType: true,
        riskStatus: true,
        city: true,
        state: true,
      },
      take: 1000,
    });

    return NextResponse.json({ success: true, count: customers.length, customers });
  } catch (error) {
    console.error('Map customers error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
