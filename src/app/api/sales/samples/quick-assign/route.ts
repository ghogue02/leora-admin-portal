import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      customerId,
      skuId,
      quantity,
      tastedAt,
      feedback,
      customerResponse,
      needsFollowUp,
    } = body;

    if (!customerId || !skuId) {
      return NextResponse.json(
        { error: "customerId and skuId are required" },
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

    // Verify customer belongs to this rep or allow for managers
    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
      },
      include: {
        salesRep: true,
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Create sample usage record
    const sampleUsage = await db.sampleUsage.create({
      data: {
        tenantId,
        salesRepId: salesRep.id,
        customerId,
        skuId,
        quantity: quantity || 1,
        tastedAt: tastedAt ? new Date(tastedAt) : new Date(),
        feedback: feedback || null,
        customerResponse: customerResponse || null,
        needsFollowUp: needsFollowUp || false,
        sampleSource: "quick_assign",
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

    // Create activity log
    await db.activity.create({
      data: {
        tenantId,
        salesRepId: salesRep.id,
        customerId,
        type: "SAMPLE_GIVEN",
        description: `Sample provided: ${sampleUsage.sku.product?.brand} ${sampleUsage.sku.product?.name}`,
        metadata: {
          sampleId: sampleUsage.id,
          skuId,
          quantity: sampleUsage.quantity,
          customerResponse,
          source: "quick_assign",
        },
      },
    });

    // Create follow-up task if needed
    if (needsFollowUp) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 1 week from now

      await db.task.create({
        data: {
          tenantId,
          userId: session.user.id,
          customerId,
          title: `Follow up on ${sampleUsage.sku.product?.brand} ${sampleUsage.sku.product?.name} sample`,
          description: `Check if customer is ready to order after tasting the sample. Customer response: ${customerResponse || "Not recorded"}`,
          dueAt: dueDate,
          status: "PENDING",
          priority: "MEDIUM",
        },
      });
    }

    return NextResponse.json({
      success: true,
      sample: sampleUsage,
      message: "Sample assigned successfully",
    });
  });
}
