import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { searchParams } = request.nextUrl;
    const limit = parseInt(searchParams.get("limit") || "100");
    const search = searchParams.get("search");

    const where: Prisma.SkuWhereInput = {
      tenantId,
      isActive: true,
    };

    // Add search filter if provided
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { product: { name: { contains: search, mode: "insensitive" } } },
        { product: { brand: { contains: search, mode: "insensitive" } } },
      ];
    }

    const skus = await db.sku.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            category: true,
          },
        },
        inventories: {
          select: {
            location: true,
            onHand: true,
            allocated: true,
          },
        },
        priceListItems: {
          where: {
            priceList: {
              isDefault: true,
            },
          },
          select: {
            price: true,
          },
          take: 1,
        },
      },
      orderBy: [
        { product: { brand: "asc" } },
        { product: { name: "asc" } },
      ],
      take: limit,
    });

    return NextResponse.json({
      skus,
    });
  });
}
