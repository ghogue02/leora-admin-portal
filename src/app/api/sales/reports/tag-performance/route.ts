import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withSalesSession } from "@/lib/auth/sales";

const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();
const tagTypeSchema = z.string().min(1).optional();

type TagPerformanceRow = {
  tagType: string | null;
  tagValue: string | null;
  customerCount: number | bigint;
  totalRevenue: number;
  avgRevenuePerCustomer: number;
  maxRevenue: number;
  minRevenue: number;
};

/**
 * GET /api/sales/reports/tag-performance
 * Performance metrics by tag type
 * Show customer count, total revenue, avg revenue per customer
 */
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const startDate = dateParamSchema.parse(searchParams.get("startDate") ?? undefined);
      const endDate = dateParamSchema.parse(searchParams.get("endDate") ?? undefined);
      const tagType = tagTypeSchema.parse(searchParams.get("tagType") ?? undefined);

      const dateFilters: Prisma.Sql[] = [];
      if (startDate) {
        dateFilters.push(Prisma.sql`AND o."deliveredAt" >= ${new Date(startDate)}`);
      }
      if (endDate) {
        dateFilters.push(Prisma.sql`AND o."deliveredAt" <= ${new Date(endDate)}`);
      }

      const tagFilters = tagType
        ? Prisma.sql`AND ct."tagType" = ${tagType}`
        : Prisma.empty;

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

      const tagPerformance = await db.$queryRaw<TagPerformanceRow[]>(Prisma.sql`
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
            ${dateFilterSql}
          WHERE ct."tenantId" = ${tenantId}::uuid
            AND ct."removedAt" IS NULL
            AND c."isPermanentlyClosed" = false
            ${tagFilters}
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
      `);

      // Group by tag type for comparison
      const performanceByType = tagPerformance.reduce<
        Record<
          string,
          {
            tagType: string | null;
            tags: Array<{
              tagValue: string | null;
              customerCount: number;
              totalRevenue: number;
              avgRevenuePerCustomer: number;
              maxRevenue: number;
              minRevenue: number;
            }>;
            totalCustomers: number;
            totalRevenue: number;
            avgRevenuePerCustomer?: number;
          }
        >
      >((acc, row) => {
        const key = row.tagType ?? "Untagged";
        if (!acc[key]) {
          acc[key] = {
            tagType: row.tagType,
            tags: [],
            totalCustomers: 0,
            totalRevenue: 0,
          };
        }

        acc[key].tags.push({
          tagValue: row.tagValue,
          customerCount: Number(row.customerCount),
          totalRevenue: Number(row.totalRevenue),
          avgRevenuePerCustomer: Number(row.avgRevenuePerCustomer),
          maxRevenue: Number(row.maxRevenue),
          minRevenue: Number(row.minRevenue),
        });

        acc[key].totalCustomers += Number(row.customerCount);
        acc[key].totalRevenue += Number(row.totalRevenue);

        return acc;
      }, {});

      // Calculate overall averages
      const performanceArray = Object.values(performanceByType);
      performanceArray.forEach((typePerf) => {
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
