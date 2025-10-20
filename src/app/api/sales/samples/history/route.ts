import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "50");

    // Get sales rep profile
    const salesRep = await db.salesRep.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: session.user.id,
        },
      },
    });

    if (!salesRep) {
      return NextResponse.json({ error: "Sales rep not found" }, { status: 404 });
    }

    // Get sample usage history
    const samples = await db.sampleUsage.findMany({
      where: {
        salesRepId: salesRep.id,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        sku: {
          include: {
            product: {
              select: {
                name: true,
                brand: true,
              },
            },
          },
        },
      },
      orderBy: {
        tastedAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json({
      samples,
    });
  });
}
