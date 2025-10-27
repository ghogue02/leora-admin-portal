import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

/**
 * GET /api/sales/reports/tag-performance
 * Performance metrics by tag type
 * Show customer count, total revenue, avg revenue per customer
 */
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const tagType = searchParams.get("tagType"); // Optional: filter by specific tag type

      // Build date filter
      let dateFilter = "";
      if (startDate && endDate) {
        dateFilter = `AND o."deliveredAt" >= '${startDate}'::timestamp AND o."deliveredAt" <= '${endDate}'::timestamp`;
      } else if (startDate) {
        dateFilter = `AND o."deliveredAt" >= '${startDate}'::timestamp`;
      } else if (endDate) {
        dateFilter = `AND o."deliveredAt" <= '${endDate}'::timestamp`;
      }

      // Build tag type filter
      const tagTypeFilter = tagType
        ? `AND ct."tagType" = '${tagType}'`
        : "";

      const tagPerformance = await db.$queryRaw`
        WITH TaggedCustomerRevenue AS (
          SELECT
            ct."tagType",
            ct."tagValue",
            c."id" AS "customerId",
            COALESCE(SUM(
              CASE
                WHEN o."status" != 'CANCELLED'
                THEN o."total"
                ELSE 0
              END
            ), 0) AS revenue
          FROM "CustomerTag" ct
          INNER JOIN "Customer" c ON ct."customerId" = c."id" AND ct."tenantId" = c."tenantId"
          LEFT JOIN "Order" o ON c."id" = o."customerId" AND c."tenantId" = o."tenantId"
            ${dateFilter}
          WHERE ct."tenantId" = ${tenantId}::uuid
            AND ct."removedAt" IS NULL
            AND c."isPermanentlyClosed" = false
            ${tagTypeFilter}
          GROUP BY ct."tagType", ct."tagValue", c."id"
        )
        SELECT
          "tagType",
          "tagValue",
          COUNT(DISTINCT "customerId")::int AS "customerCount",
          COALESCE(SUM(revenue), 0)::numeric::float8 AS "totalRevenue",
          CASE
            WHEN COUNT(DISTINCT "customerId") > 0
            THEN (COALESCE(SUM(revenue), 0) / COUNT(DISTINCT "customerId"))::numeric::float8
            ELSE 0::numeric::float8
          END AS "avgRevenuePerCustomer",
          COALESCE(MAX(revenue), 0)::numeric::float8 AS "maxRevenue",
          COALESCE(MIN(revenue), 0)::numeric::float8 AS "minRevenue"
        FROM TaggedCustomerRevenue
        GROUP BY "tagType", "tagValue"
        ORDER BY "tagType", "totalRevenue" DESC
      `;

      // Group by tag type for comparison
      const performanceByType = (tagPerformance as any[]).reduce(
        (acc, row) => {
          if (!acc[row.tagType]) {
            acc[row.tagType] = {
              tagType: row.tagType,
              tags: [],
              totalCustomers: 0,
              totalRevenue: 0,
            };
          }

          acc[row.tagType].tags.push({
            tagValue: row.tagValue,
            customerCount: row.customerCount,
            totalRevenue: row.totalRevenue,
            avgRevenuePerCustomer: row.avgRevenuePerCustomer,
            maxRevenue: row.maxRevenue,
            minRevenue: row.minRevenue,
          });

          acc[row.tagType].totalCustomers += Number(row.customerCount);
          acc[row.tagType].totalRevenue += Number(row.totalRevenue);

          return acc;
        },
        {} as Record<string, any>
      );

      // Calculate overall averages
      const performanceArray = Object.values(performanceByType);
      performanceArray.forEach((typePerf: any) => {
        typePerf.avgRevenuePerCustomer =
          typePerf.totalCustomers > 0
            ? typePerf.totalRevenue / typePerf.totalCustomers
            : 0;
      });

      return NextResponse.json({
        performanceByType: performanceArray,
        detailedPerformance: tagPerformance || [],
        filters: {
          startDate: startDate || null,
          endDate: endDate || null,
          tagType: tagType || null,
        },
      });
    } catch (error) {
      console.error("Error generating tag performance report:", error);
      return NextResponse.json(
        { error: "Failed to generate tag performance report" },
        { status: 500 }
      );
    }
  });
}
