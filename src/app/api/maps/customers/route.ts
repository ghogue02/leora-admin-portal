import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tenantId = searchParams.get('tenantId');
    const territories = searchParams.getAll('territories');
    const accountTypes = searchParams.getAll('accountTypes');
    const salesReps = searchParams.getAll('salesReps');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Prisma.CustomerWhereInput = {
      tenantId,
      latitude: { not: null },
      longitude: { not: null },
    };

    if (territories.length > 0) {
      where.territory = { in: territories };
    }

    if (accountTypes.length > 0) {
      where.accountType = { in: accountTypes };
    }

    if (salesReps.length > 0) {
      where.salesRepId = { in: salesReps };
    }

    // Fetch customers with location data
    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        street1: true,
        street2: true,
        city: true,
        state: true,
        postalCode: true,
        latitude: true,
        longitude: true,
        accountType: true,
        accountPriority: true,
        territory: true,
        salesRepId: true,
        phone: true,
        lastOrderDate: true,
        // Calculate revenue from orders
        orders: {
          where: {
            status: { not: 'CANCELLED' },
          },
          select: {
            totalAmount: true,
          },
        },
      },
    });

    // Transform data
    const customersWithRevenue = customers.map(customer => {
      const revenue = customer.orders.reduce(
        (sum, order) => sum + Number(order.totalAmount),
        0
      );

      return {
        id: customer.id,
        name: customer.name,
        address: `${customer.street1 || ''}`,
        city: customer.city || '',
        state: customer.state || '',
        zip: customer.postalCode || '',
        latitude: customer.latitude,
        longitude: customer.longitude,
        accountType: customer.accountType || 'PROSPECT',
        priority: customer.accountPriority || 'MEDIUM',
        revenue,
        lastOrderDate: customer.lastOrderDate?.toISOString() || null,
        phone: customer.phone || '',
        territoryId: customer.territory,
        salesRepId: customer.salesRepId,
      };
    });

    return NextResponse.json(customersWithRevenue);
  } catch (error) {
    console.error('Error fetching customers for map:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
