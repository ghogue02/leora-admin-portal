import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import {
  activitySampleItemSelect,
  ensureSampleItemsValid,
  sampleItemsInputSchema,
  serializeActivityRecord,
} from "../_helpers";

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
        sampleItems,
      } = body;

      const sampleItemsParse = sampleItemsInputSchema.safeParse(sampleItems ?? []);
      if (!sampleItemsParse.success) {
        return NextResponse.json(
          { error: "Invalid sample items", details: sampleItemsParse.error.format() },
          { status: 400 }
        );
      }

      const sampleItemsInput = sampleItemsParse.data ?? [];

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

      try {
        await ensureSampleItemsValid(db, tenantId, salesRep.id, sampleItemsInput);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "INVALID_SKU_SELECTION") {
            return NextResponse.json(
              { error: "One or more sample items reference invalid SKUs" },
              { status: 400 }
            );
          }
          if (error.message === "INVALID_SAMPLE_LIST_ITEM") {
            return NextResponse.json(
              { error: "One or more sample list items are invalid or inaccessible" },
              { status: 400 }
            );
          }
          if (error.message === "SAMPLE_LIST_ITEM_MISMATCH") {
            return NextResponse.json(
              { error: "Sample list item does not match selected SKU" },
              { status: 400 }
            );
          }
        }

        return NextResponse.json(
          { error: "Unable to validate sample items" },
          { status: 400 }
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
      });

      if (sampleItemsInput.length > 0) {
        await Promise.all(
          sampleItemsInput.map((item) =>
            db.activitySampleItem.create({
              data: {
                activityId: activity.id,
                skuId: item.skuId,
                sampleListItemId: item.sampleListItemId ?? null,
                feedback: item.feedback ?? null,
                followUpNeeded: item.followUpNeeded ?? false,
              },
            })
          )
        );
      }

      const fullActivity = await db.activity.findUnique({
        where: { id: activity.id },
        select: {
          id: true,
          subject: true,
          notes: true,
          occurredAt: true,
          followUpAt: true,
          outcomes: true,
          createdAt: true,
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
          sampleItems: {
            select: activitySampleItemSelect,
          },
        },
      });

      return NextResponse.json({
        activity: serializeActivityRecord(fullActivity),
      });
    }
  );
}
