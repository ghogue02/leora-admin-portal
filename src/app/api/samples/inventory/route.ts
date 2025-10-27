import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const inventoryQuerySchema = z.object({
  skuId: z.string().uuid().optional(),
  lowStock: z.coerce.boolean().optional(),
  threshold: z.coerce.number().int().nonnegative().default(10),
});

const updateInventorySchema = z.object({
  skuId: z.string().uuid(),
  availableQuantity: z.number().int().nonnegative().optional(),
  totalQuantity: z.number().int().nonnegative().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = inventoryQuerySchema.parse({
      skuId: searchParams.get('skuId') || undefined,
      lowStock: searchParams.get('lowStock') || undefined,
      threshold: searchParams.get('threshold') || undefined,
    });

    // Build where clause
    const whereClause: any = {};

    if (params.skuId) {
      whereClause.skuId = params.skuId;
    }

    if (params.lowStock) {
      whereClause.availableQuantity = {
        lte: params.threshold,
      };
    }

    // Query inventory
    const inventory = await prisma.sampleInventory.findMany({
      where: whereClause,
      include: {
        sku: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        availableQuantity: 'asc', // Show low stock first
      },
    });

    // Calculate summary statistics
    const summary = {
      totalItems: inventory.length,
      lowStockItems: inventory.filter(
        i => i.availableQuantity <= params.threshold
      ).length,
      totalAvailable: inventory.reduce((sum, i) => sum + i.availableQuantity, 0),
      totalUsed: inventory.reduce((sum, i) => sum + i.usedQuantity, 0),
    };

    return NextResponse.json({
      inventory,
      summary,
    });
  } catch (error) {
    console.error('[SampleInventory] GET Error:', error);

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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateInventorySchema.parse(body);

    // Get existing inventory
    const existing = await prisma.sampleInventory.findUnique({
      where: { skuId: validatedData.skuId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Sample inventory not found' },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {
      lastUpdated: new Date(),
    };

    if (validatedData.availableQuantity !== undefined) {
      updateData.availableQuantity = validatedData.availableQuantity;
    }

    if (validatedData.totalQuantity !== undefined) {
      updateData.totalQuantity = validatedData.totalQuantity;
      // If total changed, recalculate available
      if (validatedData.availableQuantity === undefined) {
        updateData.availableQuantity = validatedData.totalQuantity - existing.usedQuantity;
      }
    }

    // Update inventory
    const updated = await prisma.sampleInventory.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        sku: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('[SampleInventory] Updated:', updated.id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[SampleInventory] PATCH Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schema = z.object({
      skuId: z.string().uuid(),
      totalQuantity: z.number().int().positive(),
      location: z.string().optional(),
    });

    const validatedData = schema.parse(body);

    // Check if inventory already exists
    const existing = await prisma.sampleInventory.findUnique({
      where: { skuId: validatedData.skuId },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Sample inventory already exists for this SKU' },
        { status: 409 }
      );
    }

    // Create new inventory record
    const inventory = await prisma.sampleInventory.create({
      data: {
        skuId: validatedData.skuId,
        totalQuantity: validatedData.totalQuantity,
        availableQuantity: validatedData.totalQuantity,
        usedQuantity: 0,
        location: validatedData.location,
        lastUpdated: new Date(),
      },
      include: {
        sku: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('[SampleInventory] Created:', inventory.id);

    return NextResponse.json(inventory, { status: 201 });
  } catch (error) {
    console.error('[SampleInventory] POST Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
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
