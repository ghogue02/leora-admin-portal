/**
 * Territories API Route
 * GET /api/territories - List territories
 * POST /api/territories - Create territory
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTerritory, getTerritories } from '@/lib/territory-management';
import { z } from 'zod';

const createSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  salesRepId: z.string().uuid().optional(),
  boundaries: z.any().optional(),
  color: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
    }

    const territories = await getTerritories(tenantId);
    return NextResponse.json({ success: true, territories });
  } catch (error) {
    console.error('Get territories error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createSchema.parse(body);
    const territory = await createTerritory(data);
    return NextResponse.json({ success: true, territory }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Create territory error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
