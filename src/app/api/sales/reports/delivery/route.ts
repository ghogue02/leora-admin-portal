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
        // Build dynamic SQL query with proper parameter binding
        const conditions: string[] = ['1=1'];
        const params: any[] = [];

        if (deliveryMethod) {
          params.push(deliveryMethod);
          conditions.push(`delivery_method = $${params.length}`);
        }

        if (startDate) {
          params.push(startDate);
          conditions.push(`date >= $${params.length}::date`);
        }

        if (endDate) {
          params.push(endDate);
          conditions.push(`date <= $${params.length}::date`);
        }

        const whereClause = conditions.join(' AND ');

        // Query the legacy invoices table (lowercase table name from HAL import)
        const invoices = await db.$queryRawUnsafe<any[]>(`
          SELECT
            id,
            reference_number as "referenceNumber",
            date,
            customer_name as "customerName",
            delivery_method as "deliveryMethod",
            status,
            invoice_type as "invoiceType"
          FROM invoices
          WHERE ${whereClause}
          ORDER BY date DESC
          LIMIT 1000
        `, ...params);

        return NextResponse.json({
          invoices,
          filters: {
            deliveryMethod,
            startDate,
            endDate,
          },
          count: invoices.length,
        });
      } catch (error) {
        console.error('Error generating delivery report:', error);
        // Return detailed error for debugging
        return NextResponse.json(
          {
            error: 'Failed to generate report',
            details: error instanceof Error ? error.message : 'Unknown error',
            stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
          },
          { status: 500 }
        );
      }
    }
  );
}
