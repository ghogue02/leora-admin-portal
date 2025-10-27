import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    const where: any = {
      tenantId: session.user.tenantId,
    };

    if (search) {
      where.OR = [
        {
          location: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          sku: {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
        {
          sku: {
            product: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        },
      ];
    }

    const inventories = await prisma.inventory.findMany({
      where,
      include: {
        sku: {
          include: {
            product: true,
          },
        },
      },
      orderBy: [
        { location: 'asc' },
      ],
    });

    return NextResponse.json({ inventories });
  } catch (error) {
    console.error('Error fetching inventory locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { skuId, location, aisle, row } = body;

    if (!skuId || !location) {
      return NextResponse.json(
        { error: 'SKU ID and location are required' },
        { status: 400 }
      );
    }

    // Validate location format (Aisle-Bay-Shelf)
    const locationRegex = /^[A-Z]\d+-[A-Z]?\d+-[A-Z]?\d+$/;
    if (!locationRegex.test(location)) {
      return NextResponse.json(
        { error: 'Invalid location format. Use: A1-B2-S3' },
        { status: 400 }
      );
    }

    // Check if inventory record exists
    const existingInventory = await prisma.inventory.findFirst({
      where: {
        tenantId: session.user.tenantId,
        skuId,
      },
    });

    let inventory;

    if (existingInventory) {
      // Update existing inventory location
      inventory = await prisma.inventory.update({
        where: {
          id: existingInventory.id,
        },
        data: {
          location,
          aisle,
          row,
        },
        include: {
          sku: {
            include: {
              product: true,
            },
          },
        },
      });
    } else {
      // Create new inventory record
      inventory = await prisma.inventory.create({
        data: {
          tenantId: session.user.tenantId,
          skuId,
          location,
          aisle,
          row,
          onHand: 0,
          allocated: 0,
        },
        include: {
          sku: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    return NextResponse.json({ inventory }, { status: existingInventory ? 200 : 201 });
  } catch (error) {
    console.error('Error setting location:', error);
    return NextResponse.json(
      { error: 'Failed to set location' },
      { status: 500 }
    );
  }
}
