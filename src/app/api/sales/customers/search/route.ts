import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

/**
 * GET /api/sales/customers/search
 *
 * Search customers with query parameter
 * Returns only matching results (not all 5000+ customers)
 *
 * Performance fix: Don't load all customers at once
 */

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '50');

  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const salesRepId = session.user.salesRep?.id;
      if (!salesRepId) {
        return NextResponse.json(
          { error: "Sales rep profile required." },
          { status: 403 },
        );
      }

      // If no query, return recent customers (last 50 ordered from)
      if (!query.trim()) {
        const recentCustomers = await db.customer.findMany({
          where: {
            tenantId,
            salesRepId,
            lastOrderDate: {
              not: null,
            },
          },
          select: {
            id: true,
            name: true,
            territory: true,
            accountNumber: true,
            requiresPO: true,
            defaultWarehouseLocation: true,
            defaultDeliveryTimeWindow: true,
            paymentTerms: true,
            lastOrderDate: true,
          },
          orderBy: {
            lastOrderDate: 'desc',
          },
          take: 50,
        });

        return NextResponse.json({
          customers: recentCustomers,
          isSearchResult: false,
        });
      }

      // Search customers by name, account number, or territory
      const searchLower = query.toLowerCase();

      const customers = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { accountNumber: { contains: query, mode: 'insensitive' } },
            { territory: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          territory: true,
          accountNumber: true,
          requiresPO: true,
          defaultWarehouseLocation: true,
          defaultDeliveryTimeWindow: true,
          paymentTerms: true,
        },
        orderBy: {
          name: 'asc',
        },
        take: limit,
      });

      return NextResponse.json({
        customers,
        isSearchResult: true,
        query,
      });
    }
  );
}
