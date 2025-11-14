import type { CatalogItem } from "@/types/catalog";
import { queryCatalog } from "@/lib/catalog/query";

type ProductSearchResult = {
  id: string;
  label: string;
  subLabel: string;
  link: string;
  highlights: string[];
  score: number;
};

type ProductSearchParams = {
  tenantId: string;
  query: string;
  limit: number;
};

export async function searchProducts({
  tenantId,
  query,
  limit,
}: ProductSearchParams): Promise<ProductSearchResult[]> {
  const catalog = await queryCatalog({
    tenantId,
    search: query,
    onlyInStock: false,
    page: 1,
    pageSize: limit,
  });

  return catalog.items.map((item) => formatProductResult(item, query));
}

function formatProductResult(item: CatalogItem, query: string): ProductSearchResult {
  const highlights: string[] = [];
  if (item.category) highlights.push(`Category: ${item.category}`);
  if (item.brand) highlights.push(`Brand: ${item.brand}`);
  if (item.lifecycleStatus) highlights.push(`Lifecycle: ${item.lifecycleStatus}`);
  if (item.inventory.totals.available > 0) {
    highlights.push(`${item.inventory.totals.available} available`);
  } else {
    highlights.push("Out of stock");
  }

  const bestPrice = item.priceLists[0];
  const pricingSnippet = bestPrice
    ? `${new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: bestPrice.currency,
      }).format(bestPrice.price)} frontline`
    : "Price TBD";

  return {
    id: item.skuId,
    label: item.productName,
    subLabel: `${item.brand ?? "Brand TBD"} · ${pricingSnippet}`,
    link: `/sales/catalog?sku=${item.skuId}`,
    highlights,
    score: computeScore(item, query),
  };
}

function computeScore(item: CatalogItem, query: string): number {
  const normalized = query.toLowerCase();
  let score = 0;

  if (item.productName.toLowerCase().startsWith(normalized)) {
    score += 0.5;
  } else if (item.productName.toLowerCase().includes(normalized)) {
    score += 0.3;
  }
  if (item.brand?.toLowerCase().includes(normalized)) {
    score += 0.2;
  }
  if (item.category?.toLowerCase().includes(normalized)) {
    score += 0.1;
  }

  return Math.min(1, Math.max(0, score));
}
