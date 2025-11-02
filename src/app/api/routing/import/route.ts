/**
 * Route Import API
 * POST /api/routing/import - Import optimized routes from Azuga
 */

import { NextRequest, NextResponse } from "next/server";
import { importRouteFromAzuga } from "@/lib/route-import";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId }) => {
      try {
        // Parse FormData (for file upload)
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
          return NextResponse.json(
            { error: "CSV file is required" },
            { status: 400 },
          );
        }

        // Validate file type
        if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
          return NextResponse.json(
            { error: "File must be a CSV" },
            { status: 400 },
          );
        }

        // Read CSV content
        const csvData = await file.text();

        // Import route
        const result = await importRouteFromAzuga(tenantId, csvData);

        return NextResponse.json({
          success: true,
          route: result.route,
          stops: result.stops,
          message: `Successfully imported route with ${result.stops} stops`,
        });
      } catch (error) {
        console.error("Route import error:", error);

        return NextResponse.json(
          {
            error: "Failed to import route",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
