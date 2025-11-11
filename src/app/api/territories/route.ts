/**
 * Territories API Route
 * GET /api/territories - List territories
 * POST /api/territories - Create territory
 */

import { NextRequest, NextResponse } from "next/server";
import { createTerritory, getTerritories } from "@/lib/territory-management";
import { z } from "zod";
import { withSalesSession } from "@/lib/auth/sales";

const createSchema = z.object({
  name: z.string().min(1),
  salesRepId: z.string().uuid().optional(),
  boundaries: z.any().optional(),
  color: z.string().optional(),
});

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId }) => {
    try {
      const territories = await getTerritories(tenantId);
      return NextResponse.json({ success: true, territories });
    } catch (error) {
      console.error("[territories] Failed to list territories:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  });
}

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId }) => {
    try {
      const body = await request.json();
      const data = createSchema.parse(body);
      const territory = await createTerritory({
        ...data,
        tenantId,
      });
      return NextResponse.json({ success: true, territory }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: "Invalid request", details: error.errors },
          { status: 400 },
        );
      }
      console.error("[territories] Failed to create territory:", error);
      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  });
}
