import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Get all activity types for the tenant
      const activityTypes = await db.activityType.findMany({
        where: {
          tenantId,
        },
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return NextResponse.json({
        activityTypes,
      });
    }
  );
}
