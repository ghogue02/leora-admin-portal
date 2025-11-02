/**
 * Route Analytics API
 * GET /api/routing/analytics - Get routing analytics and metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId }) => {
      try {
        // Get query params
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Default to last 30 days
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate
          ? new Date(startDate)
          : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Validate dates
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          return NextResponse.json(
            { error: "Invalid date format" },
            { status: 400 },
          );
        }

        // Get routes in date range
        const routes = await db.deliveryRoutes
          .where("tenant_id", "=", tenantId)
          .where("delivery_date", ">=", start)
          .where("delivery_date", "<=", end)
          .execute();

        // Get all stops for these routes
        const routeIds = routes.map((r) => r.id);
        const stops = routeIds.length > 0
          ? await db.routeStops
              .where("route_id", "in", routeIds)
              .execute()
          : [];

        // Calculate analytics
        const totalRoutes = routes.length;
        const totalOrders = routes.reduce((sum, r) => sum + (r.total_stops || 0), 0);
        const avgStopsPerRoute = totalRoutes > 0 ? totalOrders / totalRoutes : 0;

        // On-time delivery rate
        const deliveredStops = stops.filter((s) => s.status === "delivered");
        const onTimeStops = deliveredStops.filter((s) => {
          if (!s.actual_arrival || !s.estimated_arrival) {
            return false;
          }

          const estimated = new Date(s.estimated_arrival).getTime();
          const actual = new Date(s.actual_arrival).getTime();
          const diffMinutes = (actual - estimated) / 60000;

          // Within 15 minutes is considered on-time
          return Math.abs(diffMinutes) <= 15;
        });

        const onTimeDeliveryRate = deliveredStops.length > 0
          ? (onTimeStops.length / deliveredStops.length) * 100
          : 0;

        // Average delivery time
        let totalDeliveryTime = 0;

        for (const stop of deliveredStops) {
          if (stop.actual_arrival && stop.estimated_arrival) {
            const estimated = new Date(stop.estimated_arrival).getTime();
            const actual = new Date(stop.actual_arrival).getTime();
            totalDeliveryTime += Math.abs(actual - estimated);
          }
        }

        const avgDeliveryTime = deliveredStops.length > 0
          ? totalDeliveryTime / deliveredStops.length / 60000 // Convert to minutes
          : 0;

        // Completion rate
        const completedRoutes = routes.filter((r) => r.status === "completed").length;
        const completionRate = totalRoutes > 0
          ? (completedRoutes / totalRoutes) * 100
          : 0;

        // Failed deliveries
        const failedStops = stops.filter((s) => s.status === "failed").length;
        const failureRate = stops.length > 0
          ? (failedStops / stops.length) * 100
          : 0;

        // Territory breakdown
        const territoryStats = routes.reduce((acc, route) => {
          const territory = route.territory || "unassigned";

          if (!acc[territory]) {
            acc[territory] = {
              routes: 0,
              stops: 0,
              completed: 0,
            };
          }

          acc[territory].routes++;
          acc[territory].stops += route.total_stops || 0;

          if (route.status === "completed") {
            acc[territory].completed++;
          }

          return acc;
        }, {} as Record<string, any>);

        return NextResponse.json({
          period: {
            startDate: start.toISOString(),
            endDate: end.toISOString(),
          },
          summary: {
            totalRoutes,
            totalOrders,
            avgStopsPerRoute: Math.round(avgStopsPerRoute * 10) / 10,
            onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 10) / 10,
            avgDeliveryTime: Math.round(avgDeliveryTime),
            completionRate: Math.round(completionRate * 10) / 10,
            failureRate: Math.round(failureRate * 10) / 10,
          },
          breakdown: {
            byTerritory: territoryStats,
            byStatus: {
              planned: routes.filter((r) => r.status === "planned").length,
              in_progress: routes.filter((r) => r.status === "in_progress").length,
              completed: routes.filter((r) => r.status === "completed").length,
              failed: routes.filter((r) => r.status === "failed").length,
            },
          },
        });
      } catch (error) {
        console.error("Route analytics error:", error);

        return NextResponse.json(
          {
            error: "Failed to fetch route analytics",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
