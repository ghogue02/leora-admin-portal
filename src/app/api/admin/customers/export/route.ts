import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { Prisma } from '@prisma/client';
import { formatUTCDate } from '@/lib/dates';

/**
 * POST /api/admin/customers/export
 * Export customers to CSV
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db } = context;
    try {
      const body = await request.json();
      const { customerIds, filters } = body;

      let where: Prisma.CustomerWhereInput = {
        tenantId,
      };

      // Export specific customers or use filters
      if (customerIds && Array.isArray(customerIds) && customerIds.length > 0) {
        where.id = { in: customerIds };
      } else if (filters) {
        // Apply filters (similar to GET route)
        if (filters.search) {
          where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { accountNumber: { contains: filters.search, mode: 'insensitive' } },
            { billingEmail: { contains: filters.search, mode: 'insensitive' } },
          ];
        }
        if (filters.territory) {
          where.salesRep = { territoryName: filters.territory };
        }
        if (filters.salesRepId) {
          where.salesRepId = filters.salesRepId;
        }
        if (filters.riskStatus) {
          const statuses = filters.riskStatus.split(',');
          where.riskStatus = { in: statuses };
        }
      }

      const customers = await db.customer.findMany({
        where,
        include: {
          salesRep: {
            include: {
              user: {
                select: { fullName: true, email: true }
              }
            }
          },
          orders: {
            select: { id: true, total: true },
            where: { status: { not: 'CANCELLED' } }
          },
        },
        orderBy: { name: 'asc' },
      });

      // Generate CSV
      const headers = [
        'Customer ID',
        'Account Number',
        'Customer Name',
        'Billing Email',
        'Phone',
        'Street',
        'City',
        'State',
        'Postal Code',
        'Territory',
        'Sales Rep',
        'Sales Rep Email',
        'Last Order Date',
        'Total Orders',
        'Total Revenue',
        'Risk Status',
        'Payment Terms',
      ];

      const rows = customers.map(customer => {
        const totalRevenue = customer.orders.reduce(
          (sum, order) => sum + (Number(order.total) || 0),
          0
        );

        return [
          customer.id,
          customer.accountNumber || '',
          customer.name,
          customer.billingEmail || '',
          customer.phone || '',
          customer.street1 || '',
          customer.city || '',
          customer.state || '',
          customer.postalCode || '',
          customer.salesRep?.territoryName || '',
          customer.salesRep?.user.fullName || '',
          customer.salesRep?.user.email || '',
          customer.lastOrderDate ? formatUTCDate(customer.lastOrderDate) : '',
          customer.orders.length.toString(),
          totalRevenue.toFixed(2),
          customer.riskStatus,
          customer.paymentTerms || '',
        ];
      });

      // Convert to CSV format
      const csvContent = [
        headers.join(','),
        ...rows.map(row =>
          row.map(cell =>
            // Escape cells containing commas, quotes, or newlines
            typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          ).join(',')
        )
      ].join('\n');

      // Return CSV file
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="customers-export-${formatUTCDate(new Date())}.csv"`,
        },
      });
    } catch (error) {
      console.error('Error exporting customers:', error);
      return NextResponse.json(
        { error: 'Failed to export customers' },
        { status: 500 }
      );
    }
  });
}
