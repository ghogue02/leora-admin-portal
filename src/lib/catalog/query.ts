import { Prisma, ProductLifecycleStatus } from "@prisma/client";

import { db } from "@/lib/prisma";
import {
  CatalogFacets,
  CatalogItem,
  CatalogResponse,
} from "@/types/catalog";

type CatalogQueryFilters = {
  tenantId: string;
  search?: string;
  brands?: string[];
  categories?: string[];
  lifecycle?: ProductLifecycleStatus[];
  priceListId?: string | null;
  onlyInStock?: boolean;
  sort?: "priority" | "availability" | "az";
  minAvailable?: number;
  page?: number;
  pageSize?: number;
};

type CatalogQueryResult = {
  items: CatalogItem[];
  facets: CatalogFacets;
  meta: CatalogResponse["meta"];
};

const ACTIVE_LIFECYCLE_FILTER = {
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
};

export async function queryCatalog(
  filters: CatalogQueryFilters,
): Promise<CatalogQueryResult> {
  const {
    tenantId,
    search,
    brands = [],
    categories = [],
    lifecycle = [],
    priceListId,
    onlyInStock,
    sort = "priority",
    minAvailable,
    page = 1,
    pageSize = 50,
  } = filters;

  const where: Prisma.SkuWhereInput = {
    tenantId,
    isActive: true,
    product: {
      name: { not: "" },
    },
  };

  if (search) {
    const normalized = search.trim();
    where.OR = [
      { code: { contains: normalized, mode: "insensitive" } },
      { product: { name: { contains: normalized, mode: "insensitive" } } },
      { product: { brand: { contains: normalized, mode: "insensitive" } } },
      { product: { category: { contains: normalized, mode: "insensitive" } } },
    ];
  }

  if (brands.length) {
    where.product = {
      ...(where.product ?? {}),
      brand: { in: brands },
    };
  }

  if (categories.length) {
    where.product = {
      ...(where.product ?? {}),
      category: { in: categories },
    };
  }

  if (lifecycle.length) {
    where.product = {
      ...(where.product ?? {}),
      lifecycleSnapshots: {
        some: {
          status: { in: lifecycle },
          ...ACTIVE_LIFECYCLE_FILTER,
        },
      },
    };
  }

  if (priceListId && priceListId !== "all") {
    where.priceListItems = {
      some: {
        priceListId,
      },
    };
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
          description: true,
          tastingNotes: true,
          foodPairings: true,
          servingInfo: true,
          wineDetails: true,
          enrichedAt: true,
          enrichedBy: true,
          lifecycleSnapshots: {
            where: ACTIVE_LIFECYCLE_FILTER,
            orderBy: { effectiveAt: "desc" },
            take: 1,
          },
          images: {
            select: {
              imageType: true,
              catalogUrl: true,
              storageUrl: true,
            },
          },
        },
      },
      priceListItems: {
        include: {
          priceList: {
            select: {
              id: true,
              name: true,
              currency: true,
              jurisdictionType: true,
              jurisdictionValue: true,
              allowManualOverride: true,
            },
          },
        },
        where: {
          priceList: {
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
        },
      },
      inventories: {
        select: {
          onHand: true,
          allocated: true,
          location: true,
        },
      },
    },
    orderBy: [
      { product: { brand: "asc" } },
      { product: { name: "asc" } },
      { code: "asc" },
    ],
  });

  const items: CatalogItem[] = skus.map((sku) => {
    const totals = sku.inventories.reduce(
      (acc, inventory) => {
        const onHand = inventory.onHand ?? 0;
        const allocated = inventory.allocated ?? 0;
        acc.onHand += onHand;
        acc.allocated += allocated;
        acc.available += onHand - allocated;
        return acc;
      },
      { onHand: 0, allocated: 0, available: 0 },
    );

    const lifecycleStatus =
      sku.product?.lifecycleSnapshots?.[0]?.status ?? null;

    // Map product images by type, preferring catalogUrl over storageUrl
    const images = sku.product?.images?.reduce(
      (acc, img) => {
        const imageUrl = img.catalogUrl || img.storageUrl;
        if (img.imageType === "packshot") {
          acc.packshot = imageUrl;
        } else if (img.imageType === "frontLabel") {
          acc.frontLabel = imageUrl;
        } else if (img.imageType === "backLabel") {
          acc.backLabel = imageUrl;
        }
        return acc;
      },
      {} as { packshot?: string; frontLabel?: string; backLabel?: string },
    );

    return {
      skuId: sku.id,
      skuCode: sku.code,
      productId: sku.product?.id,
      productName: sku.product?.name ?? sku.code,
      brand: sku.product?.brand ?? null,
      category: sku.product?.category ?? null,
      lifecycleStatus,
      unitOfMeasure: sku.unitOfMeasure,
      size: sku.size,
      priceLists: sku.priceListItems.map((item) => ({
        priceListId: item.priceList.id,
        priceListName: item.priceList.name,
        price: Number(item.price),
        currency: item.priceList.currency,
        minQuantity: item.minQuantity,
        maxQuantity: item.maxQuantity,
        jurisdictionType: item.priceList.jurisdictionType,
        jurisdictionValue: item.priceList.jurisdictionValue,
        allowManualOverride: item.priceList.allowManualOverride,
      })),
      inventory: {
        totals,
        lowStock: totals.available < 10,
        outOfStock: totals.available <= 0,
      },
      images: images && Object.keys(images).length > 0 ? images : undefined,
      product: sku.product
        ? {
            description: sku.product.description,
            tastingNotes: sku.product.tastingNotes as Record<string, unknown> | null,
            foodPairings: sku.product.foodPairings,
            servingInfo: sku.product.servingInfo,
            wineDetails: sku.product.wineDetails,
            enrichedAt: sku.product.enrichedAt?.toISOString() ?? null,
            enrichedBy: sku.product.enrichedBy,
          }
        : undefined,
    };
  });

  const filteredItems = onlyInStock
    ? items.filter((item) => item.inventory.totals.available > 0)
    : items;

  const availabilityFiltered = typeof minAvailable === "number"
    ? filteredItems.filter((item) => item.inventory.totals.available >= minAvailable)
    : filteredItems;

  const sortedItems = sortItems(availabilityFiltered, sort);

  const total = sortedItems.length;
  const clampedPage = Math.max(1, page);
  const start = (clampedPage - 1) * pageSize;
  const pagedItems = sortedItems.slice(start, start + pageSize);

  const facets = buildFacets(items);

  return {
    items: pagedItems,
    facets,
    meta: {
      total,
      page: clampedPage,
      pageSize,
      appliedFilters: {
        search,
        brands,
        categories,
        lifecycle,
        priceListId,
        onlyInStock: Boolean(onlyInStock),
        sort,
        minAvailable,
      },
    },
  };
}

function sortItems(
  items: CatalogItem[],
  sort: CatalogQueryFilters["sort"],
) {
  if (sort === "availability") {
    return [...items].sort(
      (a, b) => b.inventory.totals.available - a.inventory.totals.available,
    );
  }
  if (sort === "az") {
    return [...items].sort((a, b) =>
      a.productName.localeCompare(b.productName),
    );
  }
  return items;
}

function buildFacets(items: CatalogItem[]): CatalogFacets {
  const bucketize = (values: Array<string | null>) => {
    const counts = new Map<string, number>();
    values.forEach((value) => {
      const key = value && value.trim().length > 0 ? value : "Uncategorized";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([value, count]) => ({
        value,
        label: value,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };

  const priceListCounts = new Map<string, { label: string; count: number }>();
  items.forEach((item) => {
    item.priceLists.forEach((priceList) => {
      const record =
        priceListCounts.get(priceList.priceListId) ??
        { label: priceList.priceListName, count: 0 };
      record.count += 1;
      priceListCounts.set(priceList.priceListId, record);
    });
  });

  return {
    brands: bucketize(items.map((item) => item.brand)),
    categories: bucketize(items.map((item) => item.category)),
    lifecycle: bucketize(items.map((item) => item.lifecycleStatus)),
    priceLists: Array.from(priceListCounts.entries())
      .map(([value, record]) => ({
        value,
        label: record.label,
        count: record.count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
  };
}
