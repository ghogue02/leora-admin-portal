import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { sampleId } = await context.params;

    const sample = await db.sampleUsage.update({
      where: {
        id: sampleId,
        tenantId,
      },
      data: {
        followedUpAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, sample });
  });
}
