/**
 * Export History API
 * GET /api/routing/exports - Get export history
 */

import { NextRequest, NextResponse } from "next/server";
import { getExportHistory } from "@/lib/azuga-export";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId }) => {
      try {
        // Get query params
        const { searchParams } = new URL(request.url);
        const limit = Number.parseInt(searchParams.get("limit") || "50", 10);

        // Validate limit
        if (Number.isNaN(limit) || limit < 1 || limit > 200) {
          return NextResponse.json(
            { error: "Limit must be between 1 and 200" },
            { status: 400 },
          );
        }

        // Get export history
        const exports = await getExportHistory(tenantId, limit);

        return NextResponse.json({
          exports,
          count: exports.length,
        });
      } catch (error) {
        console.error("Export history error:", error);

        return NextResponse.json(
          {
            error: "Failed to fetch export history",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
