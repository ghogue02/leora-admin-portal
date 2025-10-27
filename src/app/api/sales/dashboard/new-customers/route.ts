import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

    // Get current week and month boundaries
    const now = new Date();

    // Week: Monday to Sunday
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    // Month: First day of current month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);

    // Get new customers (based on first order date)
    const newCustomersThisWeek = await db.customer.findMany({
      where: {
        tenantId: salesRep.tenantId,
        salesRepId: salesRep.id,
        lastOrderDate: {
          gte: weekStart,
        },
        // Check if this is their first order
        orders: {
          some: {
            status: 'FULFILLED',
            isFirstOrder: true,
            deliveredAt: {
              gte: weekStart,
            },
          },
        },
      },
      include: {
        orders: {
          where: {
            status: 'FULFILLED',
            isFirstOrder: true,
          },
          orderBy: {
            deliveredAt: 'asc',
          },
          take: 1,
          select: {
            id: true,
            total: true,
            deliveredAt: true,
          },
        },
      },
    });

    const newCustomersThisMonth = await db.customer.findMany({
      where: {
        tenantId: salesRep.tenantId,
        salesRepId: salesRep.id,
        lastOrderDate: {
          gte: monthStart,
        },
        orders: {
          some: {
            status: 'FULFILLED',
            isFirstOrder: true,
            deliveredAt: {
              gte: monthStart,
            },
          },
        },
      },
    });

    // Format customer data
    const customers = newCustomersThisWeek.map((customer) => ({
      id: customer.id,
      name: customer.name,
      firstOrderDate: customer.orders[0]?.deliveredAt?.toISOString() || customer.lastOrderDate?.toISOString() || '',
      firstOrderAmount: Number(customer.orders[0]?.total || 0),
    }));

    return NextResponse.json({
      thisWeek: newCustomersThisWeek.length,
      thisMonth: newCustomersThisMonth.length,
      weekStart: weekStart.toISOString(),
      weekEnd: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      monthStart: monthStart.toISOString(),
      customers,
    });
  } catch (error) {
    console.error('New customers error:', error);
    return NextResponse.json(
      { error: 'Failed to load new customers' },
      { status: 500 }
    );
    }
  });
}
