import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { createFollowUpTasksForSamples } from "@/app/api/sales/activities/_helpers";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { customerId, skuId, quantity, tastedAt, feedback, needsFollowUp } = body;

    if (!customerId || !skuId || !tastedAt) {
      return NextResponse.json(
        { error: "customerId, skuId, and tastedAt are required" },
        { status: 400 }
      );
    }

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

    // Verify customer belongs to this rep
    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        salesRepId: salesRep.id,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or not assigned to you" },
        { status: 404 }
      );
    }

    // Create sample usage record
    const tastedAtDate = new Date(tastedAt);

    const sampleUsage = await db.$transaction(async (tx) => {
      const created = await tx.sampleUsage.create({
        data: {
          tenantId,
          salesRepId: salesRep.id,
          customerId,
          skuId,
          quantity: quantity || 1,
          tastedAt: tastedAtDate,
          feedback,
          needsFollowUp: needsFollowUp || false,
          sampleSource: "manual_log",
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
      });

      await createFollowUpTasksForSamples(tx, {
        tenantId,
        userId: session.user.id,
        customerId,
        occurredAt: tastedAtDate,
        items: [
          {
            skuId,
            feedback: feedback ?? undefined,
            followUpNeeded: needsFollowUp ?? false,
            quantity: quantity ?? undefined,
          },
        ],
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      sample: sampleUsage,
    });
  });
}
