import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withSalesSession } from "@/lib/auth/sales";
import type { Prisma } from "@prisma/client";

const updateSchema = z.object({
  followUpCompleted: z.boolean().optional(),
  feedback: z.string().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { activityId: string; sampleItemId: string } }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const salesRepId = session.user.salesRep?.id;
      if (!salesRepId) {
        return NextResponse.json(
          { error: "Sales rep profile required" },
          { status: 403 }
        );
      }

      const { activityId, sampleItemId } = params;

      const item = await db.activitySampleItem.findFirst({
        where: {
          id: sampleItemId,
          activityId,
          activity: {
            tenantId,
            userId: session.user.id,
          },
        },
        include: {
          activity: {
            select: {
              id: true,
              tenantId: true,
              userId: true,
              customerId: true,
            },
          },
          sku: {
            select: {
              id: true,
              code: true,
              size: true,
              unitOfMeasure: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                },
              },
            },
          },
        },
      });

      if (!item) {
        return NextResponse.json({ error: "Sample item not found" }, { status: 404 });
      }

      const body = await request.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.format() },
          { status: 400 }
        );
      }

      const { followUpCompleted, feedback } = parsed.data;
      const updateData: Prisma.ActivitySampleItemUpdateInput = {};

      if (followUpCompleted !== undefined) {
        updateData.followUpCompletedAt = followUpCompleted ? new Date() : null;
      }

      if (feedback !== undefined) {
        updateData.feedback = feedback;
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({
          item: {
            id: item.id,
            skuId: item.skuId,
            feedback: item.feedback,
            followUpNeeded: item.followUpNeeded,
            followUpCompletedAt: item.followUpCompletedAt,
          },
        });
      }

      const updated = await db.activitySampleItem.update({
        where: { id: item.id },
        data: updateData,
        include: {
          sku: {
            select: {
              id: true,
              code: true,
              size: true,
              unitOfMeasure: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        item: {
          id: updated.id,
          skuId: updated.skuId,
          feedback: updated.feedback,
          followUpNeeded: updated.followUpNeeded,
          followUpCompletedAt: updated.followUpCompletedAt,
          sku: updated.sku
            ? {
                id: updated.sku.id,
                code: updated.sku.code,
                name: updated.sku.product?.name ?? null,
                brand: updated.sku.product?.brand ?? null,
                unitOfMeasure: updated.sku.unitOfMeasure,
                size: updated.sku.size,
              }
            : null,
        },
      });
    }
  );
}
