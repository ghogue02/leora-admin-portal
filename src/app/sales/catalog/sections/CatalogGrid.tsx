'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCart } from "../../_components/CartProvider";
import { useToast } from "../../_components/ToastProvider";
import { ProductDrilldownModal } from "../_components/ProductDrilldownModal";
import { TastingNotesCard } from "../_components/TastingNotesCard";

type CatalogItem = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  unitOfMeasure: string | null;
  size: string | null;
  priceLists: Array<{
    priceListId: string;
    priceListName: string;
    price: number;
    currency: string;
    minQuantity: number;
    maxQuantity: number | null;
  }>;
  inventory: {
    totals: {
      onHand: number;
      available: number;
    };
  };
  product?: {
    tastingNotes?: {
      aroma?: string;
      palate?: string;
      finish?: string;
    };
  };
};

type CatalogResponse = {
  items: CatalogItem[];
};

type SortOption = "priority" | "availability" | "az";

export default function CatalogGrid() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceListFilter, setPriceListFilter] = useState<string>("all");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("priority");
  const [pendingSkuId, setPendingSkuId] = useState<string | null>(null);
  const [quantityBySku, setQuantityBySku] = useState<Record<string, number>>({});
  const [drilldownSkuId, setDrilldownSkuId] = useState<string | null>(null);

  const { addItem, isMutating } = useCart();
  const { pushToast } = useToast();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/sales/catalog", { cache: "no-store" });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Unable to load catalog.");
        }

        const payload = (await response.json()) as CatalogResponse;
        if (isMounted) {
          setItems(payload.items);
          setQuantityBySku(
            payload.items.reduce<Record<string, number>>((acc, item) => {
              const primaryPrice = getPrimaryPrice(item, "all");
              acc[item.skuId] = primaryPrice?.minQuantity ?? 1;
              return acc;
            }, {}),
          );
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load catalog.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const brandOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.brand) set.add(item.brand);
    });
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const priceListOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      item.priceLists.forEach((price) => {
        map.set(price.priceListId, price.priceListName);
      });
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const matchesSearch = (item: CatalogItem) => {
      if (!normalizedSearch) return true;
      return [item.productName, item.brand ?? "", item.category ?? "", item.skuCode]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    };

    const matchesCategory = (item: CatalogItem) =>
      selectedCategories.length === 0 || (item.category && selectedCategories.includes(item.category));

    const matchesBrand = (item: CatalogItem) =>
      selectedBrands.length === 0 || (item.brand && selectedBrands.includes(item.brand));

    const matchesPriceList = (item: CatalogItem) =>
      priceListFilter === "all" || item.priceLists.some((price) => price.priceListId === priceListFilter);

    const matchesStock = (item: CatalogItem) => !onlyInStock || item.inventory.totals.available > 0;

    return items.filter(
      (item) =>
        matchesSearch(item) &&
        matchesCategory(item) &&
        matchesBrand(item) &&
        matchesPriceList(item) &&
        matchesStock(item),
    );
  }, [items, search, selectedCategories, selectedBrands, priceListFilter, onlyInStock]);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    if (sortOption === "availability") {
      sorted.sort((a, b) => b.inventory.totals.available - a.inventory.totals.available);
    } else if (sortOption === "az") {
      sorted.sort((a, b) => a.productName.localeCompare(b.productName));
    }
    return sorted;
  }, [filteredItems, sortOption]);

  const totalFiltered = sortedItems.length;

  const handleQuantityChange = useCallback((skuId: string, value: string) => {
    const parsed = Number.parseInt(value, 10);
    setQuantityBySku((prev) => ({
      ...prev,
      [skuId]: Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
    }));
  }, []);

  const handleQuantityAdjust = useCallback((skuId: string, delta: number, minQuantity = 1) => {
    setQuantityBySku((prev) => {
      const current = prev[skuId] ?? minQuantity;
      return {
        ...prev,
        [skuId]: Math.max(minQuantity, current + delta),
      };
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceListFilter("all");
    setOnlyInStock(false);
    setSortOption("priority");
  }, []);

  const handleAddToCart = useCallback(
    async (skuId: string, minQuantity: number) => {
      setPendingSkuId(skuId);
      try {
        const desiredQuantity = quantityBySku[skuId] ?? minQuantity;
        if (desiredQuantity < minQuantity) {
          throw new Error(`Minimum purchase is ${minQuantity}`);
        }
        await addItem(skuId, desiredQuantity);
        pushToast({
          tone: "success",
          title: "Cart updated",
          description: `Added ${desiredQuantity} unit${desiredQuantity === 1 ? "" : "s"}. Ask Leora to confirm fill rate.`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to add item to cart.";
        pushToast({
          tone: "error",
          title: "Add to cart failed",
          description: message,
        });
      } finally {
        setPendingSkuId(null);
      }
    },
    [addItem, pushToast, quantityBySku],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex w-full items-center gap-3 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 focus-within:border-gray-500 md:max-w-md">
            <span className="sr-only">Search catalog</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search SKUs, brands, categories…"
              className="w-full border-none bg-transparent text-gray-900 focus:outline-none"
              type="search"
            />
          </label>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 md:w-auto">
            <span>
              Showing {totalFiltered} of {items.length} SKUs
            </span>
            <button
              type="button"
              onClick={handleClearFilters}
              className="rounded-md border border-gray-300 px-3 py-1 font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
            >
              Clear filters
            </button>
          </div>
        </div>

        <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="Catalog filters">
          <fieldset className="flex flex-wrap items-center gap-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categories</legend>
            {categoryOptions.length === 0 ? (
              <span className="text-xs text-gray-400">No categories yet</span>
            ) : (
              categoryOptions.map((category) => {
                const active = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setSelectedCategories((prev) =>
                        active ? prev.filter((item) => item !== category) : [...prev, category],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-slate-300 bg-white text-gray-700 hover:border-gray-900/40"
                    }`}
                    aria-pressed={active}
                  >
                    {category}
                  </button>
                );
              })
            )}
          </fieldset>

          <fieldset className="flex flex-wrap items-center gap-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">Brands</legend>
            {brandOptions.length === 0 ? (
              <span className="text-xs text-gray-400">No brands yet</span>
            ) : (
              brandOptions.map((brand) => {
                const active = selectedBrands.includes(brand);
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() =>
                      setSelectedBrands((prev) =>
                        active ? prev.filter((item) => item !== brand) : [...prev, brand],
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      active
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-slate-300 bg-white text-gray-700 hover:border-gray-900/40"
                    }`}
                    aria-pressed={active}
                  >
                    {brand}
                  </button>
                );
              })
            )}
          </fieldset>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-600">
            <label className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-gray-500">Price list</span>
              <select
                value={priceListFilter}
                onChange={(event) => setPriceListFilter(event.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1 focus:border-gray-500 focus:outline-none"
              >
                <option value="all">All price lists</option>
                {priceListOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={onlyInStock}
                onChange={(event) => setOnlyInStock(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              In stock only
            </label>

            <label className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-gray-500">Sort</span>
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value as SortOption)}
                className="rounded-md border border-gray-300 px-3 py-1 focus:border-gray-500 focus:outline-none"
              >
                <option value="priority">Relevance</option>
                <option value="availability">Availability</option>
                <option value="az">A → Z</option>
              </select>
            </label>
          </div>
        </form>
      </div>

     {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
              <div className="h-5 w-1/2 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full rounded bg-slate-200" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
              <div className="mt-4 h-8 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-sm text-gray-600">
          No items match the current filters. Try adjusting categories or price lists to explore the
          full price book.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedItems.map((item) => {
            const primaryPrice = getPrimaryPrice(item, priceListFilter);
            const minQuantity = primaryPrice?.minQuantity ?? 1;
            const quantity = quantityBySku[item.skuId] ?? minQuantity;
            const priceLabel = primaryPrice
              ? new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: primaryPrice.currency,
                }).format(primaryPrice.price)
              : "—";
            const outOfStock = item.inventory.totals.available <= 0;

            return (
              <article
                key={item.skuId}
                className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div onClick={() => setDrilldownSkuId(item.skuId)} className="cursor-pointer">
                  <header className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="uppercase tracking-wide text-gray-500">
                        {item.category ?? "Uncategorized"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold ${
                          outOfStock ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {outOfStock ? "Out of stock" : `${item.inventory.totals.available} available`}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition">
                          {item.productName}
                        </h2>
                        <p className="text-sm text-gray-600">{item.brand ?? "Brand TBD"}</p>
                        <p className="text-xs text-gray-500">{item.skuCode}</p>
                      </div>
                      <span className="flex-shrink-0 text-xs text-indigo-600 hover:text-indigo-800">
                        View details →
                      </span>
                    </div>
                  </header>

                  {item.product?.tastingNotes && (
                    <TastingNotesCard
                      tastingNotes={{
                        aroma: item.product.tastingNotes.aroma,
                        palate: item.product.tastingNotes.palate,
                        finish: item.product.tastingNotes.finish,
                      }}
                      compact
                    />
                  )}

                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <dt>Size</dt>
                    <dd>{item.size ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Unit</dt>
                    <dd>{item.unitOfMeasure ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Best price</dt>
                    <dd>{priceLabel}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Min qty</dt>
                    <dd>{minQuantity}</dd>
                  </div>
                </dl>

                <div className="mt-4 space-y-2 text-xs text-gray-600">
                  {item.priceLists.map((price) => (
                    <div
                      key={`${item.skuId}-${price.priceListId}`}
                      className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
                        price.priceListId === (primaryPrice?.priceListId ?? "")
                          ? "border-gray-900 bg-gray-900/5"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{price.priceListName}</span>
                        <span className="text-xs text-gray-500">
                          {price.minQuantity > 1 ? `Min ${price.minQuantity}` : "Each"}
                          {price.maxQuantity ? ` · Max ${price.maxQuantity}` : ""}
                        </span>
                      </div>
                      <span className="text-gray-700">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: price.currency,
                        }).format(price.price)}
                      </span>
                    </div>
                  ))}
                </div>
                </div>

                <footer className="mt-4 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-gray-600">
                      Qty
                      <input
                        type="number"
                        min={minQuantity}
                        value={quantity}
                        onChange={(event) => handleQuantityChange(item.skuId, event.target.value)}
                        className="mt-1 w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none"
                      />
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuantityAdjust(item.skuId, -minQuantity, minQuantity)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuantityAdjust(item.skuId, minQuantity, minQuantity)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAddToCart(item.skuId, minQuantity)}
                    disabled={isMutating || pendingSkuId === item.skuId || outOfStock}
                    className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {outOfStock
                      ? "Unavailable"
                      : pendingSkuId === item.skuId
                        ? "Adding…"
                        : "Add to cart"}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {/* Product Drilldown Modal */}
      {drilldownSkuId && (
        <ProductDrilldownModal
          skuId={drilldownSkuId}
          onClose={() => setDrilldownSkuId(null)}
        />
      )}
    </section>
  );
}

function getPrimaryPrice(item: CatalogItem, priceListFilter: string) {
  if (priceListFilter !== "all") {
    const match = item.priceLists.find((price) => price.priceListId === priceListFilter);
    if (match) return match;
  }
  return item.priceLists[0] ?? null;
}
