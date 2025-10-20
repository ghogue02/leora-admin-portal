import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfMonth, endOfMonth, format } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    // Get sales rep profile
    const salesRep = await db.salesRep.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: session.user.id,
        },
      },
    });

    if (!salesRep) {
      return NextResponse.json({ error: "Sales rep not found" }, { status: 404 });
    }

    // Get current month bounds
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Count samples used this month
    const samplesUsed = await db.sampleUsage.count({
      where: {
        salesRepId: salesRep.id,
        tastedAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const allowance = salesRep.sampleAllowancePerMonth;
    const remaining = Math.max(0, allowance - samplesUsed);
    const utilizationRate = allowance > 0 ? (samplesUsed / allowance) * 100 : 0;

    return NextResponse.json({
      allowance,
      used: samplesUsed,
      remaining,
      utilizationRate,
      month: format(now, "MMMM yyyy"),
    });
  });
}
