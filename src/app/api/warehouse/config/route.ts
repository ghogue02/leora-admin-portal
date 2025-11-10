import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { warehouseConfigSchema, updateWarehouseConfigSchema } from '@/lib/validations/warehouse';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.warehouseConfig.findUnique({
      where: { tenantId: session.user.tenantId },
    });

    if (!config) {
      return NextResponse.json({ error: 'Warehouse configuration not found' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching warehouse config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch warehouse configuration' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = warehouseConfigSchema.parse(body);

    const config = await prisma.warehouseConfig.create({
      data: {
        tenantId: session.user.tenantId,
        ...validated,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating warehouse config:', error);
    return NextResponse.json(
      { error: 'Failed to create warehouse configuration' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateWarehouseConfigSchema.parse(body);

    const config = await prisma.warehouseConfig.update({
      where: { tenantId: session.user.tenantId },
      data: validated,
    });

    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating warehouse config:', error);
    return NextResponse.json(
      { error: 'Failed to update warehouse configuration' },
      { status: 500 }
    );
  }
}
