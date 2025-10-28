import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { getSuggestedAccountsWithDays } from "@/lib/call-plan/account-suggester";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = request.nextUrl;
    const callPlanId = searchParams.get("callPlanId");
    const territory = searchParams.get("territory");
    const limitParam = searchParams.get("limit");
    const minScoreParam = searchParams.get("minScore");

    let excludeCustomerIds: string[] = [];

    if (callPlanId) {
      const callPlanAccounts = await db.callPlanAccount.findMany({
        where: {
          tenantId,
          callPlanId,
        },
        select: {
          customerId: true,
        },
      });
      excludeCustomerIds = callPlanAccounts.map((account) => account.customerId);
    }

    const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;
    const minScore = minScoreParam ? Number.parseInt(minScoreParam, 10) : 40;

    try {
      const suggestions = await getSuggestedAccountsWithDays(
        tenantId,
        session.user.id,
        callPlanId,
        {
          limit: Number.isNaN(limit) ? 20 : limit,
          territory: territory || null,
          minScore: Number.isNaN(minScore) ? 40 : minScore,
          excludeCustomerIds,
        },
      );

      return NextResponse.json({
        suggestions,
        count: suggestions.length,
        metadata: {
          callPlanId,
          territory: territory || "all",
          excludedCount: excludeCustomerIds.length,
        },
      });
    } catch (error) {
      console.error("[CARLA][Suggestions] error", error);
      return NextResponse.json(
        { error: "Failed to generate suggestions" },
        { status: 500 },
      );
    }
  });
}
