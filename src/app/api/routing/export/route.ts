/**
 * Azuga Export API
 * POST /api/routing/export - Export picked orders to Azuga CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { exportToAzuga } from "@/lib/azuga-export";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ tenantId, session }) => {
      try {
        // Parse request body
        const body = await request.json();
        const { deliveryDate, territory, driver } = body;

        // Validate delivery date
        if (!deliveryDate) {
          return NextResponse.json(
            { error: "Delivery date is required" },
            { status: 400 },
          );
        }

        const date = new Date(deliveryDate);

        if (Number.isNaN(date.getTime())) {
          return NextResponse.json(
            { error: "Invalid delivery date format" },
            { status: 400 },
          );
        }

        // Export to Azuga
        const result = await exportToAzuga(
          tenantId,
          session.user.id,
          date,
          { territory, driver },
        );

        // Return CSV as downloadable file
        return new NextResponse(result.csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${result.filename}"`,
            "X-Order-Count": result.orders.length.toString(),
          },
        });
      } catch (error) {
        console.error("Azuga export error:", error);

        return NextResponse.json(
          {
            error: "Failed to export orders",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 },
        );
      }
    },
    { requireSalesRep: false },
  );
}
