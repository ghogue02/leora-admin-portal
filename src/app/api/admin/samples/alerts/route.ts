import { NextRequest, NextResponse } from "next/server";
import { addDays, subDays } from "date-fns";
import { withAdminSession } from "@/lib/auth/admin";

export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const lookbackDaysParam = Number(request.nextUrl.searchParams.get("lookback"));
    const lookbackDays = Number.isFinite(lookbackDaysParam) && lookbackDaysParam > 0 ? lookbackDaysParam : 30;

    const warningThresholdDate = subDays(new Date(), lookbackDays);
    const staleDate = subDays(new Date(), lookbackDays);

    const overdueFollowUps = await db.sampleUsage.count({
      where: {
        tenantId,
        needsFollowUp: true,
        resultedInOrder: false,
        followedUpAt: null,
        followUpTaskId: null,
        tastedAt: {
          lt: warningThresholdDate,
        },
      },
    });

    const staleSamples = await db.sampleUsage.count({
      where: {
        tenantId,
        needsFollowUp: false,
        resultedInOrder: false,
        tastedAt: {
          lt: staleDate,
        },
      },
    });

    const topSuppliers = await db.sampleUsage.groupBy({
      by: ["skuId"],
      where: {
        tenantId,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          _all: "desc",
        },
      },
      take: 10,
    });

    return NextResponse.json({
      overdueFollowUps,
      staleSamples,
      topSuppliers,
    });
  });
}
