import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/dashboard/widgets/revenue-trend
 * Retrieve revenue trend data for the current sales rep (last 8 weeks)
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

    // Calculate date ranges for the last 8 weeks
    const weeks = [];
    const now = new Date();

    for (let i = 0; i < 8; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - (i * 7));
      weekEnd.setHours(23, 59, 59, 999);

      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);

      weeks.push({ start: weekStart, end: weekEnd });
    }

    weeks.reverse(); // Show oldest to newest

    // Fetch revenue data for each week
    const revenueData = await Promise.all(
      weeks.map(async ({ start, end }, index) => {
        const orders = await db.order.findMany({
          where: {
            salesRepId: salesRep.id,
            createdAt: { gte: start, lte: end },
            status: { not: 'cancelled' }
          },
          select: { totalAmount: true }
        });

        const revenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
        const target = salesRep.weeklyQuota;

        // Calculate growth compared to previous week
        let growth = 0;
        if (index > 0 && weeks[index - 1]) {
          const prevOrders = await db.order.findMany({
            where: {
              salesRepId: salesRep.id,
              createdAt: { gte: weeks[index - 1].start, lte: weeks[index - 1].end },
              status: { not: 'cancelled' }
            },
            select: { totalAmount: true }
          });
          const prevRevenue = prevOrders.reduce((sum, order) => sum + order.totalAmount, 0);
          growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
        }

        return {
          period: `${start.getMonth() + 1}/${start.getDate()}`,
          revenue,
          target,
          growth
        };
      })
    );

    // Calculate summary statistics
    const totalRevenue = revenueData.reduce((sum, week) => sum + week.revenue, 0);
    const averageGrowth = revenueData.length > 1
      ? revenueData.slice(1).reduce((sum, week) => sum + week.growth, 0) / (revenueData.length - 1)
      : 0;
    const targetAchievement = (totalRevenue / (salesRep.weeklyQuota * 8)) * 100;

    return NextResponse.json({
      data: revenueData,
      summary: {
        totalRevenue,
        averageGrowth,
        targetAchievement
      }
    });
  } catch (error) {
    console.error('Failed to fetch revenue trend:', error);
    return NextResponse.json(
      { error: 'Failed to fetch revenue data' },
      { status: 500 }
    );
  }
}
