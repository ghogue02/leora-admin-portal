import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";
import { buildDeliverySummary } from "./summary";

const deliveryMethodSchema = z.enum(["Delivery", "Pick up", "Will Call", "all"]).optional();
const usageFilterSchema = z.enum(["all", "standard", "promotion", "sample"]).optional();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

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
  const deliveryMethod = deliveryMethodSchema.parse(
    searchParams.get("deliveryMethod") ?? undefined
  );
  const startDate = dateSchema.parse(searchParams.get("startDate") ?? undefined);
  const endDate = dateSchema.parse(searchParams.get("endDate") ?? undefined);
  const usageFilter = usageFilterSchema.parse(searchParams.get("usageFilter") ?? undefined);

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      try {
        // Build Prisma where clause
        const where: Prisma.InvoiceWhereInput = {
          tenantId,
          order: {},
        };

        // Filter by delivery time window (closest to delivery method)
        if (deliveryMethod && deliveryMethod !== "all") {
          where.order = {
            ...(where.order || {}),
            deliveryTimeWindow: deliveryMethod,
          };
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
                lines: {
                  select: {
                    usageType: true,
                  },
                },
              },
            },
          },
          orderBy: {
            issuedAt: 'desc',
          },
          take: 1000,
        });

        const filteredInvoices = invoices.filter((invoice) => {
          if (!usageFilter || usageFilter === 'all') return true;
          const usageValues =
            invoice.order?.lines
              ?.map((line) => line.usageType)
              .filter((value): value is string => !!value) ?? [];

          if (usageFilter === 'standard') {
            return usageValues.length === 0;
          }

          return usageValues.includes(usageFilter);
        });

        const summary = buildDeliverySummary(
          filteredInvoices.map((invoice) => ({
            id: invoice.id,
            total: invoice.total,
            status: invoice.status,
            issuedAt: invoice.issuedAt,
            order: {
              deliveryTimeWindow: invoice.order?.deliveryTimeWindow,
              deliveryDate: invoice.order?.deliveryDate ?? null,
            },
          }))
        );

        // Transform to expected format
        const transformedInvoices = filteredInvoices.map((invoice) => ({
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
          summary,
          filters: {
            deliveryMethod,
            startDate,
            endDate,
            usageFilter,
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
