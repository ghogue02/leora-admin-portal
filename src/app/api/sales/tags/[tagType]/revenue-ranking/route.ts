import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfYear, subMonths } from "date-fns";

/**
 * GET /api/sales/tags/[tagType]/revenue-ranking
 * Get customers ranked by revenue within a tag type
 * Query params: timeframe (ytd, last12m, alltime)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { tagType: string } }
) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const { tagType } = params;
      const searchParams = request.nextUrl.searchParams;
      const timeframe = searchParams.get("timeframe") || "ytd";

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date | null = null;

      switch (timeframe) {
        case "ytd":
          startDate = startOfYear(now);
          break;
        case "last12m":
          startDate = subMonths(now, 12);
          break;
        case "alltime":
          startDate = null;
          break;
        default:
          return NextResponse.json(
            { error: "Invalid timeframe. Use: ytd, last12m, or alltime" },
            { status: 400 }
          );
      }

      // Build the revenue query with date filter if applicable
      const dateFilter = startDate
        ? `AND o."deliveredAt" >= '${startDate.toISOString()}'`
        : "";

      const rankedCustomers = await db.$queryRaw`
        WITH CustomerRevenue AS (
          SELECT
            c."id" AS "customerId",
            c."name" AS "customerName",
            c."accountNumber",
            ct."tagValue",
            COALESCE(SUM(
              CASE
                WHEN o."status" != 'CANCELLED' ${dateFilter ? `AND o."deliveredAt" >= '${startDate?.toISOString()}'` : ""}
                THEN o."total"
                ELSE 0
              END
            ), 0) AS revenue,
            COUNT(
              CASE
                WHEN o."status" != 'CANCELLED' ${dateFilter ? `AND o."deliveredAt" >= '${startDate?.toISOString()}'` : ""}
                THEN 1
              END
            ) AS "orderCount"
          FROM "CustomerTag" ct
          INNER JOIN "Customer" c ON ct."customerId" = c."id" AND ct."tenantId" = c."tenantId"
          LEFT JOIN "Order" o ON c."id" = o."customerId" AND c."tenantId" = o."tenantId"
          WHERE ct."tenantId" = ${tenantId}::uuid
            AND ct."tagType" = ${tagType}
            AND ct."removedAt" IS NULL
            AND c."isPermanentlyClosed" = false
          GROUP BY c."id", c."name", c."accountNumber", ct."tagValue"
        )
        SELECT
          "customerId",
          "customerName",
          "accountNumber",
          "tagValue",
          revenue::numeric::float8 AS revenue,
          "orderCount",
          RANK() OVER (ORDER BY revenue DESC) AS rank
        FROM CustomerRevenue
        ORDER BY revenue DESC
      `;

      return NextResponse.json({
        tagType,
        timeframe,
        customers: rankedCustomers || [],
      });
    } catch (error) {
      console.error("Error fetching revenue ranking:", error);
      return NextResponse.json(
        { error: "Failed to fetch revenue ranking" },
        { status: 500 }
      );
    }
  });
}
