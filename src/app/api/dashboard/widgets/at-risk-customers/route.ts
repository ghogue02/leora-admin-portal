import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/dashboard/widgets/at-risk-customers
 * Retrieve at-risk customers for the current sales rep
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get sales rep ID
    const salesRep = await db.salesRep.findUnique({
      where: { userId: session.user.id }
    });

    if (!salesRep) {
      return NextResponse.json({ error: 'Sales rep not found' }, { status: 404 });
    }

    // Fetch at-risk customers
    const customers = await db.customer.findMany({
      where: {
        salesRepId: salesRep.id,
        riskStatus: { in: ['at_risk_cadence', 'at_risk_revenue', 'dormant'] }
      },
      orderBy: [
        { riskStatus: 'asc' },
        { daysOverdue: 'desc' }
      ],
      take: 15,
      select: {
        id: true,
        name: true,
        riskStatus: true,
        lastOrderDate: true,
        daysOverdue: true,
        averageOrderIntervalDays: true,
        orders: {
          where: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
          select: { totalAmount: true }
        }
      }
    });

    // Calculate revenue impact
    const customersWithImpact = customers.map(customer => {
      const recentRevenue = customer.orders.reduce((sum, order) => sum + order.totalAmount, 0);
      return {
        id: customer.id,
        name: customer.name,
        riskStatus: customer.riskStatus as 'at_risk_cadence' | 'at_risk_revenue' | 'dormant',
        lastOrderDate: customer.lastOrderDate?.toISOString() || null,
        daysOverdue: customer.daysOverdue || 0,
        averageOrderIntervalDays: customer.averageOrderIntervalDays,
        revenueImpact: recentRevenue / 3 // Estimated monthly impact
      };
    });

    return NextResponse.json({ customers: customersWithImpact });
  } catch (error) {
    console.error('Failed to fetch at-risk customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}
