import { NextRequest, NextResponse } from "next/server";
import type { OrderStatus, Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const SAMPLE_STATUSES: OrderStatus[] = ["SUBMITTED", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED"];

type SampleUpdatePayload = {
  status?: OrderStatus;
  fulfilledAt?: string | null;
  quantity?: number;
};

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const sampleId = params.id;

  let payload: SampleUpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (payload.status && !SAMPLE_STATUSES.includes(payload.status)) {
    return NextResponse.json({ error: "Invalid status provided." }, { status: 400 });
  }

  if (payload.quantity !== undefined && (!Number.isInteger(payload.quantity) || payload.quantity <= 0)) {
    return NextResponse.json({ error: "quantity must be a positive integer when provided." }, { status: 400 });
  }

  const fulfilledAtDate =
    payload.fulfilledAt !== undefined && payload.fulfilledAt !== null
      ? new Date(payload.fulfilledAt)
      : payload.fulfilledAt === null
        ? null
        : undefined;

  if (fulfilledAtDate instanceof Date && Number.isNaN(fulfilledAtDate.getTime())) {
    return NextResponse.json({ error: "fulfilledAt must be a valid ISO date string." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const scope = buildOrderScope(tenantId, session.portalUserId, session.portalUser.customerId);

      const sampleOrder = await db.order.findFirst({
        where: {
          id: sampleId,
          ...scope,
          lines: {
            some: { isSample: true },
          },
        },
        include: {
          lines: {
            where: { isSample: true },
          },
        },
      });

      if (!sampleOrder) {
        return NextResponse.json({ error: "Sample not found." }, { status: 404 });
      }

      const updateData: Prisma.OrderUpdateInput = {};
      if (payload.status) {
        updateData.status = payload.status;
      }
      if (fulfilledAtDate !== undefined) {
        updateData.fulfilledAt = fulfilledAtDate;
      }

      if (payload.quantity !== undefined && sampleOrder.lines.length > 0) {
        const line = sampleOrder.lines[0];
        await db.orderLine.update({
          where: { id: line.id },
          data: { quantity: payload.quantity },
        });
      }

      const updated = await db.order.update({
        where: { id: sampleOrder.id },
        data: updateData,
        include: {
          lines: {
            where: { isSample: true },
            include: {
              sku: {
                include: {
                  product: true,
                },
              },
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return NextResponse.json({
        sample: {
          id: updated.id,
          status: updated.status,
          orderedAt: updated.orderedAt,
          fulfilledAt: updated.fulfilledAt,
          customer: updated.customer
            ? {
                id: updated.customer.id,
                name: updated.customer.name,
              }
            : null,
          lines: updated.lines.map((line) => ({
            id: line.id,
            quantity: line.quantity,
            sku: {
              id: line.sku.id,
              code: line.sku.code,
              name: line.sku.product?.name ?? null,
              brand: line.sku.product?.brand ?? null,
            },
          })),
        },
      });
    },
    { requiredPermissions: ["portal.samples.manage"] },
  );
}

function buildOrderScope(tenantId: string, portalUserId: string, customerId: string | null) {
  const base: Prisma.OrderWhereInput = { tenantId };
  if (customerId) {
    return {
      ...base,
      customerId,
    } satisfies Prisma.OrderWhereInput;
  }
  return {
    ...base,
    portalUserId,
  } satisfies Prisma.OrderWhereInput;
}
