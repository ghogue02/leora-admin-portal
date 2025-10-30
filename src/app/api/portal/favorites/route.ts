import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";

const favoriteInclude = {
  sku: {
    include: {
      product: true,
      priceListItems: {
        include: {
          priceList: true,
        },
      },
    },
  },
} satisfies Prisma.PortalFavoriteInclude;

type FavoriteWithRelations = Prisma.PortalFavoriteGetPayload<{ include: typeof favoriteInclude }>;

export async function GET(request: NextRequest) {
  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const favorites = await db.portalFavorite.findMany({
        where: {
          tenantId,
          portalUserId: session.portalUserId,
        },
        include: favoriteInclude,
        orderBy: {
          createdAt: "desc",
        },
      });

      return NextResponse.json({ favorites: favorites.map(serializeFavorite) });
    },
    { requiredPermissions: ["portal.favorites.view"] },
  );
}

type FavoritePayload = {
  skuId?: string;
};

export async function POST(request: NextRequest) {
  let payload: FavoritePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const skuId = payload.skuId?.trim();
  if (!skuId) {
    return NextResponse.json({ error: "skuId is required." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      const sku = await db.sku.findFirst({
        where: {
          id: skuId,
          tenantId,
          isActive: true,
        },
      });

      if (!sku) {
        return NextResponse.json({ error: "SKU not found." }, { status: 404 });
      }

      const favorite = await db.portalFavorite.upsert({
        where: {
          tenantId_portalUserId_skuId: {
            tenantId,
            portalUserId: session.portalUserId,
            skuId,
          },
        },
        update: {},
        create: {
          tenantId,
          portalUserId: session.portalUserId,
          skuId,
        },
        include: favoriteInclude,
      });

      return NextResponse.json({ favorite: serializeFavorite(favorite) }, { status: 201 });
    },
    { requiredPermissions: ["portal.favorites.manage"] },
  );
}

export async function DELETE(request: NextRequest) {
  let payload: FavoritePayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const skuId = payload.skuId?.trim();
  if (!skuId) {
    return NextResponse.json({ error: "skuId is required." }, { status: 400 });
  }

  return withPortalSession(
    request,
    async ({ db, tenantId, session }) => {
      await db.portalFavorite.deleteMany({
        where: {
          tenantId,
          portalUserId: session.portalUserId,
          skuId,
        },
      });

      return NextResponse.json({ success: true });
    },
    { requiredPermissions: ["portal.favorites.manage"] },
  );
}

function serializeFavorite(favorite: FavoriteWithRelations) {
  return {
    id: favorite.id,
    skuId: favorite.skuId,
    createdAt: favorite.createdAt,
    sku: {
      id: favorite.sku.id,
      code: favorite.sku.code,
      size: favorite.sku.size,
      unitOfMeasure: favorite.sku.unitOfMeasure,
      product: {
        id: favorite.sku.product.id,
        name: favorite.sku.product.name,
        brand: favorite.sku.product.brand,
        category: favorite.sku.product.category,
      },
      priceLists: favorite.sku.priceListItems.map((item) => ({
        id: item.id,
        priceListId: item.priceListId,
        priceListName: item.priceList.name,
        price: Number(item.price),
        currency: item.priceList.currency,
        minQuantity: item.minQuantity,
        maxQuantity: item.maxQuantity,
      })),
    },
  };
}
