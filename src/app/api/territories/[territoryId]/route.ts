import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateGeoJSON } from '@/lib/geospatial';
import { z } from 'zod';

const updateTerritorySchema = z.object({
  name: z.string().optional(),
  salesRepId: z.string().nullable().optional(),
  boundaries: z.any().optional(),
  color: z.string().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { territoryId: string } }
) {
  try {
    const territory = await prisma.territory.findUnique({
      where: { id: params.territoryId },
      include: {
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!territory) {
      return NextResponse.json(
        { error: 'Territory not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(territory);
  } catch (error) {
    console.error('Get territory error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch territory' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { territoryId: string } }
) {
  try {
    const body = await request.json();
    const data = updateTerritorySchema.parse(body);

    // Validate GeoJSON if provided
    if (data.boundaries && !validateGeoJSON(data.boundaries)) {
      return NextResponse.json(
        { error: 'Invalid GeoJSON format' },
        { status: 400 }
      );
    }

    // Verify sales rep exists if provided
    if (data.salesRepId) {
      const salesRep = await prisma.user.findUnique({
        where: { id: data.salesRepId }
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: 'Sales rep not found' },
          { status: 404 }
        );
      }
    }

    const territory = await prisma.territory.update({
      where: { id: params.territoryId },
      data,
      include: {
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(territory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update territory error:', error);
    return NextResponse.json(
      { error: 'Failed to update territory' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { territoryId: string } }
) {
  try {
    await prisma.territory.delete({
      where: { id: params.territoryId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete territory error:', error);
    return NextResponse.json(
      { error: 'Failed to delete territory' },
      { status: 500 }
    );
  }
}
