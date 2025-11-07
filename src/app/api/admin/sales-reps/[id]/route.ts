import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';

/**
 * GET /api/admin/sales-reps/[id]
 * Get detailed information about a specific sales rep
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    const { id } = await params;

    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          id,
          tenantId,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          productGoals: {
            include: {
              sku: {
                select: {
                  code: true,
                  product: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              periodStart: 'desc',
            },
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: 'Sales rep not found' },
          { status: 404 }
        );
      }

      // Calculate performance metrics
      const customersAssigned = await db.customer.count({
        where: { tenantId, salesRepId: salesRep.id },
      });

      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

      const activeCustomers = await db.customer.count({
        where: {
          tenantId,
          salesRepId: salesRep.id,
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
          customer: { salesRepId: salesRep.id },
          orderedAt: { gte: yearStart },
          status: { not: 'CANCELLED' },
        },
        select: {
          total: true,
        },
      });

      const ytdRevenue = ytdOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
      const ytdOrdersCount = ytdOrders.length;

      const annualQuotaPercent = salesRep.annualRevenueQuota
        ? (ytdRevenue / Number(salesRep.annualRevenueQuota)) * 100
        : 0;

      return NextResponse.json({
        rep: {
          ...salesRep,
          performance: {
            ytdRevenue,
            ytdOrders: ytdOrdersCount,
            annualQuotaPercent,
            customersAssigned,
            activeCustomers,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching sales rep details:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales rep details' },
        { status: 500 }
      );
    }
  });
}

/**
 * PUT /api/admin/sales-reps/[id]
 * Update sales rep information
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    const { id } = await params;

    try {
      const body = await request.json();

      // Verify sales rep exists and belongs to tenant
      const existingSalesRep = await db.salesRep.findUnique({
        where: { id, tenantId },
      });

      if (!existingSalesRep) {
        return NextResponse.json(
          { error: 'Sales rep not found' },
          { status: 404 }
        );
      }

      // Update sales rep
      const updatedSalesRep = await db.salesRep.update({
        where: { id },
        data: {
          territoryName: body.territoryName,
          deliveryDay: body.deliveryDay,
          weeklyRevenueQuota: body.weeklyRevenueQuota,
          monthlyRevenueQuota: body.monthlyRevenueQuota,
          quarterlyRevenueQuota: body.quarterlyRevenueQuota,
          annualRevenueQuota: body.annualRevenueQuota,
          weeklyCustomerQuota: body.weeklyCustomerQuota,
          sampleAllowancePerMonth: body.sampleAllowancePerMonth,
          isActive: body.isActive,
          orderEntryEnabled: typeof body.orderEntryEnabled === 'boolean'
            ? body.orderEntryEnabled
            : existingSalesRep.orderEntryEnabled,
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
        rep: updatedSalesRep,
        message: 'Sales rep updated successfully',
      });
    } catch (error) {
      console.error('Error updating sales rep:', error);
      return NextResponse.json(
        { error: 'Failed to update sales rep' },
        { status: 500 }
      );
    }
  });
}
