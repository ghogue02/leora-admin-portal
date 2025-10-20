import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { createCSVResponse, arrayToCSV, formatCurrencyForCSV, formatDateForCSV } from '@/lib/csv-helper';
import { Prisma } from '@prisma/client';

/**
 * POST /api/admin/orders/export
 * Export orders to CSV
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      const body = await request.json().catch(() => ({}));
      const { filters = {}, orderIds } = body;

      // Build where clause
      let where: Prisma.OrderWhereInput = {
        tenantId,
      };

      // Export specific orders or use filters
      if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
        where.id = { in: orderIds };
      } else if (filters) {
        if (filters.status) {
          where.status = { in: filters.status.split(',') };
        }

        if (filters.customerId) {
          where.customerId = filters.customerId;
        }

        if (filters.dateFrom || filters.dateTo) {
          where.orderedAt = {};
          if (filters.dateFrom) {
            where.orderedAt.gte = new Date(filters.dateFrom);
          }
          if (filters.dateTo) {
            where.orderedAt.lte = new Date(filters.dateTo);
          }
        }
      }

      // Fetch orders (limit to 10000)
      const orders = await db.order.findMany({
        where,
        include: {
          customer: {
            select: {
              name: true,
              accountNumber: true,
              salesRep: {
                select: {
                  user: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
          portalUser: {
            select: {
              fullName: true,
              email: true,
            },
          },
          lines: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
            },
          },
          invoices: {
            select: {
              status: true,
            },
          },
        },
        orderBy: {
          orderedAt: 'desc',
        },
        take: 10000,
      });

      // Transform to export format
      const exportData = orders.map((order) => {
        const lineItemCount = order.lines.length;
        const totalItems = order.lines.reduce((sum, line) => sum + line.quantity, 0);
        const invoiceStatus = order.invoices.length > 0 ? order.invoices[0].status : 'No Invoice';

        return {
          'Order ID': order.id,
          'Customer Name': order.customer.name,
          'Account Number': order.customer.accountNumber || '',
          'Sales Rep': order.customer.salesRep?.user.fullName || 'Unassigned',
          'Order Date': formatDateForCSV(order.orderedAt),
          'Fulfilled Date': formatDateForCSV(order.fulfilledAt),
          'Delivered Date': formatDateForCSV(order.deliveredAt),
          'Status': order.status,
          'Invoice Status': invoiceStatus,
          'Line Items': lineItemCount,
          'Total Items': totalItems,
          'Total Amount': formatCurrencyForCSV(order.total ? Number(order.total) : null),
          'Currency': order.currency,
          'Is First Order': order.isFirstOrder ? 'Yes' : 'No',
          'Portal User': order.portalUser?.fullName || '',
        };
      });

      const headers = [
        'Order ID',
        'Customer Name',
        'Account Number',
        'Sales Rep',
        'Order Date',
        'Fulfilled Date',
        'Delivered Date',
        'Status',
        'Invoice Status',
        'Line Items',
        'Total Items',
        'Total Amount',
        'Currency',
        'Is First Order',
        'Portal User',
      ];

      const csvContent = arrayToCSV(exportData, headers);

      // Add metadata header
      const metadata = [
        `# Orders Export`,
        `# Exported by: ${user.fullName}`,
        `# Exported at: ${new Date().toISOString()}`,
        `# Total records: ${exportData.length}`,
        ...(exportData.length >= 10000 ? ['# WARNING: Limited to 10,000 records'] : []),
        '',
      ].join('\n');

      return createCSVResponse(
        metadata + csvContent,
        `orders-export-${new Date().toISOString().split('T')[0]}.csv`
      );
    } catch (error) {
      console.error('Error exporting orders:', error);
      return NextResponse.json(
        { error: 'Failed to export orders' },
        { status: 500 }
      );
    }
  });
}
