'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useToast } from "../../_components/ToastProvider";

import type {
  CatalogFacets,
  CatalogItem,
  CatalogResponse,
} from "@/types/catalog";

type CatalogMeta = CatalogResponse["meta"];
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
  const [quantityBySku, setQuantityBySku] = useState<Record<string, number>>({});
  const [facets, setFacets] = useState<CatalogFacets | null>(null);
  const [fields, setFields] = useState<CatalogResponse["fields"] | null>(null);
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [selectedLifecycle, setSelectedLifecycle] = useState<string[]>([]);
  const [minAvailable, setMinAvailable] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);

  const { pushToast } = useToast();

  useEffect(() => {
    setPage(1);
  }, [search, selectedCategories, selectedBrands, selectedLifecycle, priceListFilter, onlyInStock, sortOption, minAvailable]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        selectedCategories.forEach((category) => params.append("category", category));
        selectedBrands.forEach((brand) => params.append("brand", brand));
        selectedLifecycle.forEach((status) => params.append("lifecycle", status));
        if (priceListFilter !== "all") params.set("priceListId", priceListFilter);
        if (onlyInStock) params.set("onlyInStock", "true");
        if (sortOption && sortOption !== "priority") params.set("sort", sortOption);
        if (typeof minAvailable === "number" && !Number.isNaN(minAvailable)) {
          params.set("minAvailable", String(minAvailable));
        }
        params.set("page", page.toString());
        params.set("pageSize", pageSize.toString());

        const queryString = params.toString();
        const response = await fetch(
          `/api/portal/catalog${queryString ? `?${queryString}` : ""}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Unable to load catalog.");
        }

        const payload = (await response.json()) as CatalogResponse;
        if (isMounted) {
          setItems(payload.items);
          setFacets(payload.facets);
          setFields(payload.fields ?? null);
          setMeta(payload.meta ?? null);
          if (payload.meta?.page && payload.meta.page !== page) {
            setPage(payload.meta.page);
          }
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
  }, [
    search,
    selectedCategories,
    selectedBrands,
    selectedLifecycle,
    priceListFilter,
    onlyInStock,
    sortOption,
    minAvailable,
    page,
    pageSize,
  ]);

  const priceListOptions = useMemo(() => {
    if (facets?.priceLists) {
      return facets.priceLists.map((bucket) => ({
        id: bucket.value,
        name: bucket.label,
      }));
    }
    const map = new Map<string, string>();
    items.forEach((item) => {
      item.priceLists.forEach((price) => {
        map.set(price.priceListId, price.priceListName);
      });
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [facets, items]);

  const filterSections = useMemo(() => {
    if (!fields || !facets) return [];
    return fields
      .filter((field) => field.filterable)
      .map((field) => {
        if (field.key === "product.brand") {
          return {
            field,
            facets: facets.brands ?? [],
            selected: selectedBrands,
            toggle: (value: string) =>
              setSelectedBrands((prev) =>
                prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
              ),
          };
        }
        if (field.key === "product.category") {
          return {
            field,
            facets: facets.categories ?? [],
            selected: selectedCategories,
            toggle: (value: string) =>
              setSelectedCategories((prev) =>
                prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
              ),
          };
        }
        if (field.key === "product.lifecycleStatus") {
          return {
            field,
            facets: facets.lifecycle ?? [],
            selected: selectedLifecycle,
            toggle: (value: string) =>
              setSelectedLifecycle((prev) =>
                prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value],
              ),
          };
        }
        return null;
      })
      .filter((section): section is NonNullable<typeof section> => Boolean(section) && section.facets.length > 0);
  }, [fields, facets, selectedBrands, selectedCategories, selectedLifecycle]);

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
      selectedCategories.length === 0 || selectedCategories.includes(item.category ?? "");

    const matchesBrand = (item: CatalogItem) =>
      selectedBrands.length === 0 || selectedBrands.includes(item.brand ?? "");

    const matchesLifecycle = (item: CatalogItem) =>
      selectedLifecycle.length === 0 || selectedLifecycle.includes(item.lifecycleStatus ?? "Uncategorized");

    const matchesPriceList = (item: CatalogItem) =>
      priceListFilter === "all" || item.priceLists.some((price) => price.priceListId === priceListFilter);

    const matchesStock = (item: CatalogItem) => !onlyInStock || item.inventory.totals.available > 0;

    return items.filter(
      (item) =>
        matchesSearch(item) &&
        matchesCategory(item) &&
        matchesBrand(item) &&
        matchesLifecycle(item) &&
        matchesPriceList(item) &&
        matchesStock(item),
    );
  }, [items, search, selectedCategories, selectedBrands, selectedLifecycle, priceListFilter, onlyInStock]);

  const sortedItems = useMemo(() => {
    const sorted = [...filteredItems];
    if (sortOption === "availability") {
      sorted.sort((a, b) => b.inventory.totals.available - a.inventory.totals.available);
    } else if (sortOption === "az") {
      sorted.sort((a, b) => a.productName.localeCompare(b.productName));
    }
    return sorted;
  }, [filteredItems, sortOption]);

  const totalFiltered = meta?.total ?? sortedItems.length;
  const totalPages = useMemo(() => {
    if (!meta?.total || !meta.pageSize) {
      return Math.max(1, Math.ceil(totalFiltered / pageSize));
    }
    return Math.max(1, Math.ceil(meta.total / meta.pageSize));
  }, [meta, pageSize, totalFiltered]);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

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
    setSelectedLifecycle([]);
    setPriceListFilter("all");
    setOnlyInStock(false);
    setSortOption("priority");
    setMinAvailable(undefined);
    setPage(1);
  }, []);

  // Cart system removed - catalog is now view-only
  // To create an order, use the "New Order" button from Orders page

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
              Showing {items.length} of {totalFiltered} SKUs
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

            <label className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-gray-500">Min Inventory</span>
              <input
                type="number"
                min={0}
                value={minAvailable ?? ""}
                onChange={(event) => {
                  const next = event.target.value;
                  setMinAvailable(next === "" ? undefined : Number(next));
                }}
                className="w-24 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-gray-500 focus:outline-none"
              />
            </label>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-gray-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={!canGoPrev}
              className="rounded-md border border-gray-300 px-3 py-1 font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={!canGoNext}
              className="rounded-md border border-gray-300 px-3 py-1 font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>

        {filterSections.length > 0 && (
          <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {filterSections.map((section) => (
              <fieldset key={section.field.id} className="space-y-2">
                <legend className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {section.field.label}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {section.facets.map((bucket) => {
                    const active = section.selected.includes(bucket.value);
                    return (
                      <button
                        type="button"
                        key={bucket.value}
                        onClick={() => section.toggle(bucket.value)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-slate-300 bg-white text-gray-700 hover:border-gray-900/40"
                        }`}
                        aria-pressed={active}
                      >
                        {bucket.label}
                        <span className="ml-1 text-[10px] text-gray-500">({bucket.count})</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}
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
                  <h2 className="text-lg font-semibold text-gray-900">{item.productName}</h2>
                  <p className="text-sm text-gray-600">{item.brand ?? "Brand TBD"}</p>
                  <p className="text-xs text-gray-500">{item.skuCode}</p>
                </header>

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
                  <Link
                    href="/portal/orders"
                    className="flex w-full items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    {outOfStock ? "Out of Stock" : "View Orders"}
                  </Link>
                </footer>
              </article>
            );
          })}
        </div>
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
