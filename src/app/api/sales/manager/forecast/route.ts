import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfYear } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const now = new Date();
    const yearStart = startOfYear(now);
    const weeksElapsed = Math.floor(
      (now.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const weeksInYear = 52;

    // Get all active reps
    const salesReps = await db.salesRep.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    // Calculate forecast for each rep
    const repsData = await Promise.all(
      salesReps.map(async (rep) => {
        // Get YTD actual revenue
        const ytdOrders = await db.order.aggregate({
          where: {
            tenantId,
            customer: { salesRepId: rep.id },
            deliveredAt: { gte: yearStart, lte: now },
            status: { not: "CANCELLED" },
          },
          _sum: { total: true },
          _count: true,
        });

        const ytdActual = Number(ytdOrders._sum.total || 0);
        const ytdTarget = Number(rep.weeklyRevenueQuota || 0) * weeksElapsed;

        // Calculate weekly pace
        const currentPace = weeksElapsed > 0 ? ytdActual / weeksElapsed : 0;

        // Project annual based on current pace
        const projectedAnnual = currentPace * weeksInYear;

        // Determine trend (compare last 4 weeks to previous 4 weeks)
        const fourWeeksAgo = new Date(Date.now() - 4 * 7 * 24 * 60 * 60 * 1000);
        const eightWeeksAgo = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);

        const last4Weeks = await db.order.aggregate({
          where: {
            tenantId,
            customer: { salesRepId: rep.id },
            deliveredAt: { gte: fourWeeksAgo, lte: now },
            status: { not: "CANCELLED" },
          },
          _sum: { total: true },
        });

        const previous4Weeks = await db.order.aggregate({
          where: {
            tenantId,
            customer: { salesRepId: rep.id },
            deliveredAt: { gte: eightWeeksAgo, lt: fourWeeksAgo },
            status: { not: "CANCELLED" },
          },
          _sum: { total: true },
        });

        const last4WeeksRevenue = Number(last4Weeks._sum.total || 0);
        const previous4WeeksRevenue = Number(previous4Weeks._sum.total || 0);

        let trend: "up" | "down" | "stable" = "stable";
        if (last4WeeksRevenue > previous4WeeksRevenue * 1.1) {
          trend = "up";
        } else if (last4WeeksRevenue < previous4WeeksRevenue * 0.9) {
          trend = "down";
        }

        // Determine confidence level based on data consistency
        const orderCount = ytdOrders._count;
        let confidenceLevel: "high" | "medium" | "low" = "medium";
        if (orderCount > 50 && weeksElapsed > 10) {
          confidenceLevel = "high";
        } else if (orderCount < 10 || weeksElapsed < 5) {
          confidenceLevel = "low";
        }

        return {
          id: rep.id,
          name: rep.user.fullName,
          projectedAnnual,
          confidenceLevel,
          trend,
          currentPace,
          ytdActual,
          ytdTarget,
        };
      })
    );

    // Team forecast
    const teamYtdActual = repsData.reduce((sum, rep) => sum + rep.ytdActual, 0);
    const teamCurrentPace = repsData.reduce((sum, rep) => sum + rep.currentPace, 0);
    const teamProjectedAnnual = teamCurrentPace * weeksInYear;

    // Generate monthly projection for next 12 months
    const monthlyProjection = [];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(now);
      monthDate.setMonth(monthDate.getMonth() + i);
      const monthName = monthNames[monthDate.getMonth()];

      // Project based on current weekly pace
      const projected = teamCurrentPace * 4.33; // Average weeks per month
      const variance = projected * 0.2; // 20% confidence interval

      monthlyProjection.push({
        month: `${monthName} ${monthDate.getFullYear()}`,
        projected: Math.round(projected),
        lower: Math.round(projected - variance),
        upper: Math.round(projected + variance),
      });
    }

    return NextResponse.json({
      reps: repsData,
      teamForecast: {
        projectedAnnual: teamProjectedAnnual,
        currentPace: teamCurrentPace,
        ytdActual: teamYtdActual,
      },
      monthlyProjection,
    });
  });
}
