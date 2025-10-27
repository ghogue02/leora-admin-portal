/**
 * Territory Customers API Route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCustomersInTerritory, assignCustomersToTerritory } from '@/lib/territory-management';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { territoryId: string } }
) {
  try {
    const customers = await getCustomersInTerritory(params.territoryId);
    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('Get territory customers error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { territoryId: string } }
) {
  try {
    const body = await request.json();
    const { boundaries } = body;

    await prisma.territory.update({
      where: { id: params.territoryId },
      data: { boundaries },
    });

    const count = await assignCustomersToTerritory(params.territoryId, boundaries);
    return NextResponse.json({ success: true, customersAssigned: count });
  } catch (error) {
    console.error('Assign territory customers error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
