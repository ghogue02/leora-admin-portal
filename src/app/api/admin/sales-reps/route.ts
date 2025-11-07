import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';

/**
 * POST /api/admin/sales-reps
 * Create a new sales rep
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;

    try {
      const body = await request.json();

      // Validate required fields
      if (!body.userId || !body.territoryName) {
        return NextResponse.json(
          { error: 'userId and territoryName are required' },
          { status: 400 }
        );
      }

      // Check if user exists and belongs to tenant
      const user = await db.user.findUnique({
        where: { id: body.userId },
      });

      if (!user || user.tenantId !== tenantId) {
        return NextResponse.json(
          { error: 'User not found or does not belong to this tenant' },
          { status: 404 }
        );
      }

      // Check if user already has a sales rep profile
      const existingSalesRep = await db.salesRep.findUnique({
        where: { userId: body.userId },
      });

      if (existingSalesRep) {
        return NextResponse.json(
          { error: 'User already has a sales rep profile' },
          { status: 400 }
        );
      }

      const orderEntryEnabled =
        typeof body.orderEntryEnabled === 'boolean' ? body.orderEntryEnabled : false;

      // Create sales rep
      const salesRep = await db.salesRep.create({
        data: {
          tenantId,
          userId: body.userId,
          territoryName: body.territoryName,
          deliveryDay: body.deliveryDay || null,
          weeklyRevenueQuota: body.weeklyRevenueQuota || null,
          monthlyRevenueQuota: body.monthlyRevenueQuota || null,
          quarterlyRevenueQuota: body.quarterlyRevenueQuota || null,
          annualRevenueQuota: body.annualRevenueQuota || null,
          weeklyCustomerQuota: body.weeklyCustomerQuota || null,
          sampleAllowancePerMonth: body.sampleAllowancePerMonth ?? 60,
          isActive: body.isActive ?? true,
          orderEntryEnabled,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json({
        rep: salesRep,
        message: 'Sales rep created successfully',
      }, { status: 201 });
    } catch (error) {
      console.error('Error creating sales rep:', error);
      return NextResponse.json(
        { error: 'Failed to create sales rep' },
        { status: 500 }
      );
    }
  });
}

/**
 * GET /api/admin/sales-reps
 * List active sales reps for dropdowns and assignments
 */
export async function GET(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;

    try {
      const salesReps = await db.salesRep.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          territoryName: 'asc',
        },
      });

      // Calculate performance metrics for each rep
      const repsWithPerformance = await Promise.all(
        salesReps.map(async (rep) => {
          // Get customer count
          const customerCount = await db.customer.count({
            where: { tenantId, salesRepId: rep.id },
          });

          // Get active customers (ordered in last 45 days)
          const fortyFiveDaysAgo = new Date();
          fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

          const activeCustomerCount = await db.customer.count({
            where: {
              tenantId,
              salesRepId: rep.id,
              lastOrderDate: {
                gte: fortyFiveDaysAgo,
              },
            },
          });

          // Get YTD revenue and orders
          const yearStart = new Date(new Date().getFullYear(), 0, 1);
          const ytdOrders = await db.order.findMany({
            where: {
              tenantId,
              customer: { salesRepId: rep.id },
              orderedAt: { gte: yearStart },
              status: { not: 'CANCELLED' },
            },
            select: {
              total: true,
            },
          });

          const ytdRevenue = ytdOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);

          // Get this week's revenue
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);

          const weekOrders = await db.order.findMany({
            where: {
              tenantId,
              customer: { salesRepId: rep.id },
              orderedAt: { gte: weekStart },
              status: { not: 'CANCELLED' },
            },
            select: {
              total: true,
            },
          });

          const currentWeekRevenue = weekOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
          const ordersThisWeek = weekOrders.length;

          // Calculate quota achievement
          const quotaAchievementPercent = rep.annualRevenueQuota
            ? (ytdRevenue / Number(rep.annualRevenueQuota)) * 100
            : 0;

          return {
            ...rep,
            performance: {
              customerCount,
              activeCustomerCount,
              ytdRevenue,
              currentWeekRevenue,
              ordersThisWeek,
              quotaAchievementPercent,
            },
          };
        })
      );

      return NextResponse.json({ salesReps: repsWithPerformance });
    } catch (error) {
      console.error('Error fetching sales reps:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales reps' },
        { status: 500 }
      );
    }
  });
}
