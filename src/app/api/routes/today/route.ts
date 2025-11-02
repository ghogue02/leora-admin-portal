/**
 * Today's Routes API
 * GET /api/routes/today - Get all routes for today
 */

import { NextRequest, NextResponse } from "next/server";
import { getTodayRoutes } from "@/lib/route-visibility";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId }) => {
      try {
        // Get today's routes
        const routes = await getTodayRoutes(tenantId);

        // Calculate stats
        const stats = {
          totalRoutes: routes.length,
          totalOrders: routes.reduce((sum, r) => sum + (r.total_stops || 0), 0),
          totalStops: routes.reduce((sum, r) => sum + (r.total_stops || 0), 0),
          completedStops: routes.reduce((sum, r) => sum + (r.completed_stops || 0), 0),
          inProgress: routes.filter((r) => r.status === "in_progress").length,
          completed: routes.filter((r) => r.status === "completed").length,
        };

        return NextResponse.json({
          routes,
          stats,
        });
      } catch (error) {
        console.error("Today routes error:", error);

        return NextResponse.json(
          {
            error: "Failed to fetch today's routes",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
