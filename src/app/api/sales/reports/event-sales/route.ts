import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

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
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      // Build date filter
      let dateFilter = "";
      if (startDate && endDate) {
        dateFilter = `AND o."deliveredAt" >= '${startDate}'::timestamp AND o."deliveredAt" <= '${endDate}'::timestamp`;
      } else if (startDate) {
        dateFilter = `AND o."deliveredAt" >= '${startDate}'::timestamp`;
      } else if (endDate) {
        dateFilter = `AND o."deliveredAt" <= '${endDate}'::timestamp`;
      }

      const eventSalesReport = await db.$queryRaw`
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
          ${dateFilter}
        WHERE c."tenantId" = ${tenantId}::uuid
          AND c."isPermanentlyClosed" = false
        GROUP BY ct."tagValue"
        ORDER BY "totalRevenue" DESC
      `;

      // Calculate totals
      const totals = (eventSalesReport as any[]).reduce(
        (acc, row) => ({
          totalCustomers: acc.totalCustomers + Number(row.customerCount),
          totalOrders: acc.totalOrders + Number(row.orderCount),
          totalRevenue: acc.totalRevenue + Number(row.totalRevenue),
        }),
        { totalCustomers: 0, totalOrders: 0, totalRevenue: 0 }
      );

      return NextResponse.json({
        report: eventSalesReport || [],
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
