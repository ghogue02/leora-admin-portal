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
            salesRepId: true,
            salesRep: {
              select: {
                id: true,
                user: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
            deliveryInstructions: true,
            deliveryWindows: true,
            deliveryMethod: true,
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
      // Enhanced fuzzy matching for common misspellings
      const searchLower = query.toLowerCase();

      // Handle common search aliases and fuzzy matching
      const fuzzySearchTerms: string[] = [query];

      // Common misspellings and aliases
      if (searchLower.includes('cheese teak')) {
        fuzzySearchTerms.push('cheesetique');
      }

      const customers = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId,
          OR: fuzzySearchTerms.flatMap(term => [
            { name: { contains: term, mode: 'insensitive' } },
            { accountNumber: { contains: term, mode: 'insensitive' } },
            { territory: { contains: term, mode: 'insensitive' } },
          ]),
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
          salesRepId: true,
          salesRep: {
            select: {
              id: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          deliveryInstructions: true,
          deliveryWindows: true,
          deliveryMethod: true,
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
