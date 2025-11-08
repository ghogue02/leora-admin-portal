import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  items: z
    .array(
      z.object({
        skuId: z.string().uuid(),
        defaultFollowUp: z.boolean().optional(),
        notes: z.string().max(500).optional(),
      })
    )
    .min(1),
  setActive: z.boolean().optional(),
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

export async function GET(request: NextRequest) {
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

      const lists = await db.sampleList.findMany({
        where: {
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
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({
        lists: lists.map(serializeSampleList),
      });
    }
  );
}

export async function POST(request: NextRequest) {
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

      const body = await request.json();
      const parsed = createSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.format() },
          { status: 400 }
        );
      }

      const { name, items, setActive, preferredPriceListIds } = parsed.data;

      if (setActive ?? true) {
        await db.sampleList.updateMany({
          where: {
            tenantId,
            salesRepId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }

      const created = await db.sampleList.create({
        data: {
          tenantId,
          salesRepId,
          name,
          isActive: setActive ?? true,
          preferredPriceListIds: preferredPriceListIds ?? [],
          items: {
            create: items.map((item) => ({
              skuId: item.skuId,
              defaultFollowUp: item.defaultFollowUp ?? false,
              notes: item.notes ?? null,
            })),
          },
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
        list: serializeSampleList(created),
      });
    }
  );
}
