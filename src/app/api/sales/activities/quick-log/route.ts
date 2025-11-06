import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Get sales rep profile for the logged-in user
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

      // Parse request body
      const body = await request.json();
      const {
        activityTypeCode,
        customerId,
        orderId,
        sampleId,
        subject,
        notes,
        occurredAt,
        followUpAt,
        outcome,
        outcomes,
      } = body;

      // Validate required fields
      if (!activityTypeCode || !customerId || !subject || !occurredAt) {
        return NextResponse.json(
          { error: "Missing required fields: activityTypeCode, customerId, subject, occurredAt" },
          { status: 400 }
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

      // Verify customer belongs to this sales rep
      const customer = await db.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
          salesRepId: salesRep.id,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found or not assigned to you" },
          { status: 404 }
        );
      }

      // Verify order if provided
      if (orderId) {
        const order = await db.order.findFirst({
          where: {
            id: orderId,
            tenantId,
            customerId,
          },
        });

        if (!order) {
          return NextResponse.json(
            { error: "Order not found or doesn't belong to this customer" },
            { status: 404 }
          );
        }
      }

      // Verify sample if provided
      if (sampleId) {
        const sample = await db.sample.findFirst({
          where: {
            id: sampleId,
            tenantId,
            customerId,
          },
        });

        if (!sample) {
          return NextResponse.json(
            { error: "Sample not found or doesn't belong to this customer" },
            { status: 404 }
          );
        }
      }

      // Create activity with auto-linking
      const normalizedOutcomes: string[] = Array.isArray(outcomes)
        ? outcomes
        : outcome
          ? [outcome]
          : [];

      const activity = await db.activity.create({
        data: {
          tenantId,
          activityTypeId: activityType.id,
          userId: session.user.id,
          customerId,
          orderId: orderId || null,
          sampleId: sampleId || null,
          subject,
          notes: notes || null,
          occurredAt: new Date(occurredAt),
          followUpAt: followUpAt ? new Date(followUpAt) : null,
          outcomes: { set: normalizedOutcomes },
        },
        include: {
          activityType: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
            },
          },
          order: {
            select: {
              id: true,
              orderedAt: true,
              total: true,
              status: true,
            },
          },
          sample: {
            select: {
              id: true,
              sentAt: true,
            },
          },
        },
      });

      return NextResponse.json({
        activity: {
          id: activity.id,
          subject: activity.subject,
          notes: activity.notes,
          occurredAt: activity.occurredAt.toISOString(),
          followUpAt: activity.followUpAt?.toISOString() ?? null,
          outcome: activity.outcomes?.[0] ?? null,
          outcomes: activity.outcomes ?? [],
          outcomes: activity.outcomes ?? [],
          createdAt: activity.createdAt.toISOString(),
          activityType: activity.activityType,
          customer: activity.customer,
          order: activity.order
            ? {
                id: activity.order.id,
                orderedAt: activity.order.orderedAt?.toISOString() ?? null,
                total: Number(activity.order.total ?? 0),
                status: activity.order.status,
              }
            : null,
          sample: activity.sample
            ? {
                id: activity.sample.id,
                sentAt: activity.sample.sentAt?.toISOString() ?? null,
              }
            : null,
        },
      });
    }
  );
}
