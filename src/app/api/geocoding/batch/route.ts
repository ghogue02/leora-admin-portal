/**
 * Batch Geocoding API Route
 * POST /api/geocoding/batch
 *
 * Batch geocode multiple customers
 */

import { NextRequest, NextResponse } from 'next/server';
import { batchGeocodeCustomers } from '@/lib/geocoding';
import { z } from 'zod';

const batchGeocodeSchema = z.object({
  customerIds: z.array(z.string().uuid()).min(1, 'At least one customer ID required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerIds } = batchGeocodeSchema.parse(body);

    // Limit batch size to prevent timeouts
    if (customerIds.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 customers per batch' },
        { status: 400 }
      );
    }

    const results = await batchGeocodeCustomers(customerIds);

    return NextResponse.json({
      success: true,
      results: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        skipped: results.skipped,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Batch geocoding API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
