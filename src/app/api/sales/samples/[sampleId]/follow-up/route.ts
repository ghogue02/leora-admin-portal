import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

type RouteContext = {
  params: Promise<{
    sampleId: string;
  }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { sampleId } = await context.params;

    const salesRep = await db.salesRep.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: session.user.id,
        },
      },
    });

    if (!salesRep) {
      return NextResponse.json({ error: "Sales rep profile not found" }, { status: 404 });
    }

    const sample = await db.sampleUsage.findUnique({
      where: { id: sampleId },
      select: {
        id: true,
        tenantId: true,
        salesRepId: true,
      },
    });

    if (!sample || sample.tenantId !== tenantId) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }

    if (sample.salesRepId !== salesRep.id) {
      return NextResponse.json(
        { error: "You do not have permission to update this sample" },
        { status: 403 },
      );
    }

    const updated = await db.sampleUsage.update({
      where: { id: sampleId },
      data: {
        followedUpAt: new Date(),
        needsFollowUp: false,
      },
      select: {
        id: true,
        customerId: true,
        skuId: true,
        quantity: true,
        tastedAt: true,
        feedback: true,
        needsFollowUp: true,
        followedUpAt: true,
        resultedInOrder: true,
      },
    });

    return NextResponse.json({
      success: true,
      sample: {
        ...updated,
        tastedAt: updated.tastedAt.toISOString(),
        followedUpAt: updated.followedUpAt?.toISOString() ?? null,
      },
    });
  });
}
