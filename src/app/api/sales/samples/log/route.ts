import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSalesSession } from "@/lib/auth/sales";
import {
  ensureSampleItemsValid,
  createFollowUpTasksForSamples,
} from "@/app/api/sales/activities/_helpers";

const logSamplesSchema = z.object({
  customerId: z.string().uuid(),
  occurredAt: z.string().datetime().optional(),
  context: z.string().max(100).optional(),
  items: z
    .array(
      z.object({
        skuId: z.string().uuid(),
        sampleListItemId: z.string().uuid().optional(),
        quantity: z.number().int().positive().max(100).optional(),
        feedback: z.string().max(2000).optional(),
        customerResponse: z.string().max(2000).optional(),
        followUp: z.boolean().optional(),
      }),
    )
    .min(1, "At least one sample item is required"),
});

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parseResult = logSamplesSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid sample submission", details: parseResult.error.format() },
        { status: 400 },
      );
    }

    const { customerId, occurredAt, context, items } = parseResult.data;

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

    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        salesRepId: salesRep.id,
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found or not assigned to you" },
        { status: 404 },
      );
    }

    const helperItems = items.map((item) => ({
      skuId: item.skuId,
      sampleListItemId: item.sampleListItemId,
      feedback: item.feedback,
      followUpNeeded: item.followUp ?? false,
      quantity: item.quantity ?? 1,
    }));

    try {
      await ensureSampleItemsValid(db, tenantId, salesRep.id, helperItems);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_SKU_SELECTION") {
          return NextResponse.json(
            { error: "One or more sample items reference invalid SKUs" },
            { status: 400 },
          );
        }
        if (error.message === "INVALID_SAMPLE_LIST_ITEM") {
          return NextResponse.json(
            { error: "Sample list selection is invalid or not accessible" },
            { status: 400 },
          );
        }
        if (error.message === "SAMPLE_LIST_ITEM_MISMATCH") {
          return NextResponse.json(
            { error: "Sample list item does not match the selected SKU" },
            { status: 400 },
          );
        }
      }

      return NextResponse.json(
        { error: "Unable to validate selected samples" },
        { status: 400 },
      );
    }

    const tastedAt = occurredAt ? new Date(occurredAt) : new Date();
    const sampleSource = context?.trim() || "crm_sample_log";

    try {
      const createdSamples = await db.$transaction(async (tx) => {
        const rows = await Promise.all(
          items.map((item) =>
            tx.sampleUsage.create({
              data: {
                tenantId,
                salesRepId: salesRep.id,
                customerId,
                skuId: item.skuId,
                quantity: item.quantity ?? 1,
                tastedAt,
                feedback: item.feedback ?? null,
                customerResponse: item.customerResponse ?? null,
                needsFollowUp: item.followUp ?? false,
                sampleSource,
              },
              include: {
                sku: {
                  select: {
                    id: true,
                    code: true,
                    product: {
                      select: {
                        name: true,
                        brand: true,
                      },
                    },
                  },
                },
              },
            }),
          ),
        );

        await createFollowUpTasksForSamples(tx, {
          tenantId,
          userId: session.user.id,
          customerId,
          occurredAt: tastedAt,
          items: helperItems,
        });

        return rows;
      });

      return NextResponse.json(
        {
          success: true,
          samples: createdSamples.map((sample) => ({
            id: sample.id,
            customerId: sample.customerId,
            skuId: sample.skuId,
            skuCode: sample.sku.code,
            productName: sample.sku.product?.name ?? null,
            brand: sample.sku.product?.brand ?? null,
            quantity: sample.quantity,
            tastedAt: sample.tastedAt.toISOString(),
            feedback: sample.feedback,
            customerResponse: sample.customerResponse,
            needsFollowUp: sample.needsFollowUp,
            sampleSource: sample.sampleSource,
          })),
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Failed to log samples", {
        error,
        tenantId,
        userId: session.user.id,
        customerId,
      });

      return NextResponse.json(
        { error: "Failed to log samples. Please try again." },
        { status: 500 },
      );
    }
  });
}
