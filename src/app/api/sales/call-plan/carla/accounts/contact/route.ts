import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { ContactOutcome } from "@prisma/client";

/**
 * PUT - Update contact outcome for an account in call plan
 */
export async function PUT(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const body = await request.json();
      const { callPlanId, customerId, contactOutcome, notes } = body;

      if (!callPlanId || !customerId || !contactOutcome) {
        return NextResponse.json(
          { error: "callPlanId, customerId, and contactOutcome are required" },
          { status: 400 }
        );
      }

      // Valid contact outcomes from schema
      const validOutcomes = Object.values(ContactOutcome);

      if (!validOutcomes.includes(contactOutcome)) {
        return NextResponse.json(
          { error: `Invalid contactOutcome. Must be one of: ${validOutcomes.join(", ")}` },
          { status: 400 }
        );
      }

      const normalizedOutcome = contactOutcome as ContactOutcome;

      // Update the call plan account
      const updated = await db.callPlanAccount.updateMany({
        where: {
          callPlanId,
          customerId,
          tenantId,
        },
        data: {
          contactOutcome: normalizedOutcome,
          contactedAt: normalizedOutcome !== ContactOutcome.NOT_ATTEMPTED ? new Date() : null,
          notes: notes || undefined,
        },
      });

      if (updated.count === 0) {
        return NextResponse.json(
          { error: "Call plan account not found" },
          { status: 404 }
        );
      }

      // Get updated account data
      const account = await db.callPlanAccount.findFirst({
        where: {
          callPlanId,
          customerId,
          tenantId,
        },
        include: {
          customer: {
            select: {
              name: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        account: {
          customerId: account?.customerId,
          customerName: account?.customer.name,
          contactOutcome: account?.contactOutcome,
          contactedAt: account?.contactedAt?.toISOString(),
          notes: account?.notes,
        },
      });
    } catch (error) {
      console.error("Error updating contact outcome:", error);
      return NextResponse.json(
        { error: "Failed to update contact outcome" },
        { status: 500 }
      );
    }
  });
}
