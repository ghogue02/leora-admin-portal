import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const body = await request.json();
      const {
        customerId,
        subject,
        notes,
        occurredAt,
        activityTypeCode = 'TEXT_MESSAGE',
        outcome = 'SUCCESS',
        outcomes,
      } = body;

      // Get sales rep
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

      // Get activity type
      const activityType = await db.activityType.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: activityTypeCode,
          },
        },
      });

      if (!activityType) {
        return NextResponse.json(
          { error: "Invalid activity type" },
          { status: 400 }
        );
      }

      // Verify customer
      const customer = await db.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
          salesRepId: salesRep.id,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      const normalizedOutcomes: string[] = Array.isArray(outcomes)
        ? outcomes
        : outcome
          ? [outcome]
          : [];

      // Create activity
      const activity = await db.activity.create({
        data: {
          tenantId,
          activityTypeId: activityType.id,
          userId: session.user.id,
          customerId,
          subject,
          notes,
          occurredAt: new Date(occurredAt),
          outcomes: { set: normalizedOutcomes },
        },
      });

      return NextResponse.json({ success: true, activityId: activity.id });
    }
  );
}
