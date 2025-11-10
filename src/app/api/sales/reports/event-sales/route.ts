import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withSalesSession } from "@/lib/auth/sales";

const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

type EventSalesRow = {
  eventType: string;
  customerCount: bigint | number;
  orderCount: bigint | number;
  totalRevenue: number;
  avgOrderValue: number;
};

/**
 * GET /api/sales/reports/event-sales
 * Get event sales report
 * Group by eventType (from CustomerTag where tagType = 'eventType'),
 * show revenue and customer counts
 */
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const startDate = dateParamSchema.parse(searchParams.get("startDate") ?? undefined);
      const endDate = dateParamSchema.parse(searchParams.get("endDate") ?? undefined);

      const dateFilters: Prisma.Sql[] = [];
      if (startDate) {
        dateFilters.push(Prisma.sql`AND o."deliveredAt" >= ${new Date(startDate)}`);
      }
      if (endDate) {
        dateFilters.push(Prisma.sql`AND o."deliveredAt" <= ${new Date(endDate)}`);
      }

      let dateFilterSql = Prisma.empty;
      let hasDateFilters = false;
      for (const fragment of dateFilters) {
        dateFilterSql = hasDateFilters
          ? Prisma.sql`${dateFilterSql} ${fragment}`
          : Prisma.sql`${fragment}`;
        hasDateFilters = true;
      }
      if (!hasDateFilters) {
        dateFilterSql = Prisma.empty;
      }

      const eventSalesReport = await db.$queryRaw<EventSalesRow[]>(Prisma.sql`
        SELECT
          COALESCE(ct."tagValue", 'Untagged') AS "eventType",
          COUNT(DISTINCT c."id") AS "customerCount",
          COUNT(DISTINCT o."id") AS "orderCount",
          COALESCE(SUM(
            CASE
              WHEN o."status" != 'CANCELLED'
              THEN o."total"
              ELSE 0
            END
          ), 0)::numeric::float8 AS "totalRevenue",
          COALESCE(AVG(
            CASE
              WHEN o."status" != 'CANCELLED'
              THEN o."total"
              ELSE NULL
            END
          ), 0)::numeric::float8 AS "avgOrderValue"
        FROM "Customer" c
        LEFT JOIN "CustomerTag" ct ON c."id" = ct."customerId"
          AND ct."tenantId" = c."tenantId"
          AND ct."tagType" = 'eventType'
          AND ct."removedAt" IS NULL
        LEFT JOIN "Order" o ON c."id" = o."customerId"
          AND c."tenantId" = o."tenantId"
          ${dateFilterSql}
        WHERE c."tenantId" = ${tenantId}::uuid
          AND c."isPermanentlyClosed" = false
        GROUP BY ct."tagValue"
        ORDER BY "totalRevenue" DESC
      `);

      // Calculate totals
      const totals = eventSalesReport.reduce(
        (acc, row) => ({
          totalCustomers: acc.totalCustomers + Number(row.customerCount),
          totalOrders: acc.totalOrders + Number(row.orderCount),
          totalRevenue: acc.totalRevenue + Number(row.totalRevenue),
        }),
        { totalCustomers: 0, totalOrders: 0, totalRevenue: 0 }
      );

      return NextResponse.json({
        report: eventSalesReport.map((row) => ({
          eventType: row.eventType,
          customerCount: Number(row.customerCount),
          orderCount: Number(row.orderCount),
          totalRevenue: Number(row.totalRevenue),
          avgOrderValue: Number(row.avgOrderValue),
        })),
        summary: {
          totalCustomers: totals.totalCustomers,
          totalOrders: totals.totalOrders,
          totalRevenue: totals.totalRevenue,
          avgRevenuePerCustomer:
            totals.totalCustomers > 0
              ? totals.totalRevenue / totals.totalCustomers
              : 0,
        },
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
    } catch (error) {
      console.error("Error generating event sales report:", error);
      return NextResponse.json(
        { error: "Failed to generate event sales report" },
        { status: 500 }
      );
    }
  });
}
