import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  isActive: z.boolean().optional(),
  items: z
    .array(
      z.object({
        skuId: z.string().uuid(),
        defaultFollowUp: z.boolean().optional(),
        notes: z.string().max(500).optional(),
      })
    )
    .optional(),
  preferredPriceListIds: z.array(z.string().uuid()).optional(),
});

const serializeSampleList = (
  list: Prisma.SampleListGetPayload<{
    include: {
      items: {
        include: {
          sku: {
            select: {
              id: true;
              code: true;
              size: true;
              unitOfMeasure: true;
              product: { select: { id: true; name: true; brand: true } };
            };
          };
        };
      };
    };
  }>
) => ({
  id: list.id,
  name: list.name,
  isActive: list.isActive,
  createdAt: list.createdAt,
  updatedAt: list.updatedAt,
  preferredPriceListIds: Array.isArray(list.preferredPriceListIds)
    ? list.preferredPriceListIds
    : [],
  items: list.items.map((item) => ({
    id: item.id,
    skuId: item.skuId,
    defaultFollowUp: item.defaultFollowUp,
    notes: item.notes,
    sku: item.sku
      ? {
          id: item.sku.id,
          code: item.sku.code,
          name: item.sku.product?.name ?? null,
          brand: item.sku.product?.brand ?? null,
          unitOfMeasure: item.sku.unitOfMeasure,
          size: item.sku.size,
        }
      : null,
  })),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { listId: string } }
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

      const { listId } = params;
      const list = await db.sampleList.findFirst({
        where: {
          id: listId,
          tenantId,
          salesRepId,
        },
        include: {
          items: {
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
          },
        },
      });

      if (!list) {
        return NextResponse.json({ error: "Sample list not found" }, { status: 404 });
      }

      const body = await request.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.format() },
          { status: 400 }
        );
      }

      const { name, isActive, items, preferredPriceListIds } = parsed.data;

      if (isActive === true) {
        await db.sampleList.updateMany({
          where: {
            tenantId,
            salesRepId,
            isActive: true,
            NOT: { id: listId },
          },
          data: {
            isActive: false,
          },
        });
      }

      const updated = await db.sampleList.update({
        where: { id: listId },
        data: {
          name: name ?? list.name,
          isActive: isActive ?? list.isActive,
          preferredPriceListIds: preferredPriceListIds ?? list.preferredPriceListIds ?? [],
          items: items
            ? {
                deleteMany: {},
                create: items.map((item) => ({
                  skuId: item.skuId,
                  defaultFollowUp: item.defaultFollowUp ?? false,
                  notes: item.notes ?? null,
                })),
              }
            : undefined,
        },
        include: {
          items: {
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
          },
        },
      });

      return NextResponse.json({
        list: serializeSampleList(updated),
      });
    }
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string } }
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

      const { listId } = params;

      const list = await db.sampleList.findFirst({
        where: {
          id: listId,
          tenantId,
          salesRepId,
        },
      });

      if (!list) {
        return NextResponse.json({ error: "Sample list not found" }, { status: 404 });
      }

      await db.sampleList.delete({
        where: { id: listId },
      });

      return NextResponse.json({ success: true });
    }
  );
}
