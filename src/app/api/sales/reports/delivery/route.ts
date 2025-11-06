import { NextRequest, NextResponse } from 'next/server';
import { withSalesSession } from '@/lib/auth/sales';

/**
 * GET /api/sales/reports/delivery
 *
 * Sprint 4 Quick Win Feature
 * Filter invoices by delivery method and date range
 *
 * Query parameters:
 * - deliveryMethod: Delivery, Pick up, Will Call (optional)
 * - startDate: YYYY-MM-DD (optional)
 * - endDate: YYYY-MM-DD (optional)
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const deliveryMethod = searchParams.get('deliveryMethod');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        // Build Prisma where clause
        const where: any = {
          tenantId,
          order: {},
        };

        // Filter by delivery time window (closest to delivery method)
        if (deliveryMethod && deliveryMethod !== 'all') {
          where.order.deliveryTimeWindow = deliveryMethod;
        }

        // Filter by invoice issue date
        if (startDate || endDate) {
          where.issuedAt = {};
          if (startDate) {
            where.issuedAt.gte = new Date(startDate);
          }
          if (endDate) {
            where.issuedAt.lte = new Date(endDate);
          }
        }

        // Query invoices using Prisma
        const invoices = await db.invoice.findMany({
          where,
          select: {
            id: true,
            invoiceNumber: true,
            issuedAt: true,
            status: true,
            total: true,
            shippingMethod: true,
            customer: {
              select: {
                name: true,
              },
            },
            order: {
              select: {
                deliveryTimeWindow: true,
                deliveryDate: true,
                orderNumber: true,
              },
            },
          },
          orderBy: {
            issuedAt: 'desc',
          },
          take: 1000,
        });

        // Transform to expected format
        const transformedInvoices = invoices.map((invoice) => ({
          id: invoice.id,
          referenceNumber: invoice.invoiceNumber || 'N/A',
          date: invoice.issuedAt?.toISOString() || new Date().toISOString(),
          customerName: invoice.customer?.name || 'Unknown',
          deliveryMethod:
            invoice.order?.deliveryTimeWindow ||
            invoice.shippingMethod ||
            'Not Specified',
          status: invoice.status,
          invoiceType: 'Invoice',
          total: invoice.total?.toString() || '0',
        }));

        return NextResponse.json({
          invoices: transformedInvoices,
          filters: {
            deliveryMethod,
            startDate,
            endDate,
          },
          count: transformedInvoices.length,
        });
      } catch (error) {
        console.error('Error generating delivery report:', error);
        // Return detailed error for debugging
        return NextResponse.json(
          {
            error: 'Failed to generate report',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack:
              process.env.NODE_ENV === 'development' && error instanceof Error
                ? error.stack
                : undefined,
          },
          { status: 500 }
        );
      }
    }
  );
}
