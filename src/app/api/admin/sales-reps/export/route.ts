import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { createCSVResponse, arrayToCSV, formatCurrencyForCSV, formatDateForCSV } from '@/lib/csv-helper';

/**
 * POST /api/admin/sales-reps/export
 * Export sales reps to CSV
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      const body = await request.json().catch(() => ({}));
      const { filters = {} } = body;

      // Build where clause from filters
      const where: any = {
        tenantId,
      };

      if (filters.search) {
        where.user = {
          OR: [
            { fullName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        };
      }

      if (filters.territory) {
        where.territoryName = { contains: filters.territory, mode: 'insensitive' };
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      // Fetch sales reps with related data
      const salesReps = await db.salesRep.findMany({
        where,
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              isActive: true,
            },
          },
          customers: {
            select: {
              id: true,
            },
          },
          weeklyMetrics: {
            orderBy: {
              weekStartDate: 'desc',
            },
            take: 1,
            select: {
              revenue: true,
            },
          },
        },
        orderBy: {
          user: {
            fullName: 'asc',
          },
        },
      });

      // Calculate metrics for each sales rep
      const exportData = await Promise.all(
        salesReps.map(async (rep) => {
          // Calculate YTD revenue
          const currentYear = new Date().getFullYear();
          const ytdMetrics = await db.repWeeklyMetric.aggregate({
            where: {
              salesRepId: rep.id,
              weekStartDate: {
                gte: new Date(`${currentYear}-01-01`),
              },
            },
            _sum: {
              revenue: true,
            },
          });

          const ytdRevenue = ytdMetrics._sum.revenue || 0;
          const annualQuota = rep.annualRevenueQuota || 0;
          const quotaAchievement = annualQuota > 0 ? (Number(ytdRevenue) / Number(annualQuota)) * 100 : 0;

          return {
            'Sales Rep ID': rep.id,
            'Name': rep.user.fullName,
            'Email': rep.user.email,
            'Territory': rep.territoryName,
            'Delivery Day': rep.deliveryDay || '',
            'Active Customers': rep.customers.length,
            'YTD Revenue': formatCurrencyForCSV(ytdRevenue),
            'Annual Quota': formatCurrencyForCSV(annualQuota),
            'Quota Achievement %': quotaAchievement.toFixed(2),
            'Weekly Quota': formatCurrencyForCSV(rep.weeklyRevenueQuota),
            'Monthly Quota': formatCurrencyForCSV(rep.monthlyRevenueQuota),
            'Quarterly Quota': formatCurrencyForCSV(rep.quarterlyRevenueQuota),
            'Sample Allowance/Month': rep.sampleAllowancePerMonth,
            'Status': rep.isActive ? 'Active' : 'Inactive',
          };
        })
      );

      const headers = [
        'Sales Rep ID',
        'Name',
        'Email',
        'Territory',
        'Delivery Day',
        'Active Customers',
        'YTD Revenue',
        'Annual Quota',
        'Quota Achievement %',
        'Weekly Quota',
        'Monthly Quota',
        'Quarterly Quota',
        'Sample Allowance/Month',
        'Status',
      ];

      const csvContent = arrayToCSV(exportData, headers);

      // Add metadata header
      const metadata = [
        `# Sales Reps Export`,
        `# Exported by: ${user.fullName}`,
        `# Exported at: ${new Date().toISOString()}`,
        `# Total records: ${exportData.length}`,
        '',
      ].join('\n');

      return createCSVResponse(
        metadata + csvContent,
        `sales-reps-export-${new Date().toISOString().split('T')[0]}.csv`
      );
    } catch (error) {
      console.error('Error exporting sales reps:', error);
      return NextResponse.json(
        { error: 'Failed to export sales reps' },
        { status: 500 }
      );
    }
  });
}
