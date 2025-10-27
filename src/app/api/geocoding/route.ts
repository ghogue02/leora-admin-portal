/**
 * Geocoding API Route
 * POST /api/geocoding
 *
 * Geocode a single address
 */

import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocoding';
import { z } from 'zod';

const geocodeSchema = z.object({
  address: z.string().min(1, 'Address is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = geocodeSchema.parse(body);

    const coordinates = await geocodeAddress(address);

    if (!coordinates) {
      return NextResponse.json(
        { error: 'Failed to geocode address' },
        { status: 400 }
      );
    }

    const [latitude, longitude] = coordinates;

    return NextResponse.json({
      success: true,
      address,
      coordinates: {
        latitude,
        longitude,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Geocoding API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
