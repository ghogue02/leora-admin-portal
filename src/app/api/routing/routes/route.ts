/**
 * Delivery Routes API
 * GET /api/routing/routes - List delivery routes
 * POST /api/routing/routes - Import route from Azuga CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { listRoutes, importRouteFromAzuga } from "@/lib/route-import";
import { z } from "zod";

const ImportRouteSchema = z.object({
  csvData: z.string().min(1),
  routeDate: z.string().datetime(),
  routeName: z.string().min(1),
  driverName: z.string().min(1),
  truckNumber: z.string().optional(),
  startTime: z.string().datetime(),
});

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const routeDate = searchParams.get('routeDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const routes = await listRoutes(tenantId, {
      routeDate: routeDate ? new Date(routeDate) : undefined,
      limit,
      offset,
    });

    return NextResponse.json({ routes, count: routes.length });
  } catch (error) {
    console.error('Error listing routes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get('x-tenant-id');
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = ImportRouteSchema.parse(body);

    const route = await importRouteFromAzuga(tenantId, validatedData.csvData, {
      routeDate: new Date(validatedData.routeDate),
      routeName: validatedData.routeName,
      driverName: validatedData.driverName,
      truckNumber: validatedData.truckNumber,
      startTime: new Date(validatedData.startTime),
    });

    return NextResponse.json(route, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error importing route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
