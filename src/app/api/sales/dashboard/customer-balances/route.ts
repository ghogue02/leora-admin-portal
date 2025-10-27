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

    // Get all unpaid/overdue invoices for the rep's customers
    const now = new Date();

    const invoices = await db.invoice.findMany({
      where: {
        tenantId: salesRep.tenantId,
        status: {
          in: ['SENT', 'OVERDUE'],
        },
        customer: {
          salesRepId: salesRep.id,
        },
        dueDate: {
          lt: now, // Past due
        },
      },
      select: {
        id: true,
        total: true,
        dueDate: true,
        customerId: true,
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    // Calculate aging buckets
    const buckets = {
      '0-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+': { count: 0, amount: 0 },
    };

    let totalAmount = 0;
    const uniqueCustomers = new Set<string>();

    invoices.forEach((invoice) => {
      const daysOverdue = Math.floor(
        (now.getTime() - new Date(invoice.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
      );

      const amount = Number(invoice.total || 0);
      totalAmount += amount;
      uniqueCustomers.add(invoice.customerId!);

      if (daysOverdue <= 30) {
        buckets['0-30'].count++;
        buckets['0-30'].amount += amount;
      } else if (daysOverdue <= 60) {
        buckets['31-60'].count++;
        buckets['31-60'].amount += amount;
      } else if (daysOverdue <= 90) {
        buckets['61-90'].count++;
        buckets['61-90'].amount += amount;
      } else {
        buckets['90+'].count++;
        buckets['90+'].amount += amount;
      }
    });

    return NextResponse.json({
      total: totalAmount,
      totalCustomers: uniqueCustomers.size,
      buckets: Object.entries(buckets).map(([range, data]) => ({
        range,
        count: data.count,
        amount: data.amount,
      })),
      criticalCount: buckets['90+'].count,
    });
  } catch (error) {
    console.error('Customer balances error:', error);
    return NextResponse.json(
      { error: 'Failed to load customer balances' },
      { status: 500 }
    );
    }
  });
}
