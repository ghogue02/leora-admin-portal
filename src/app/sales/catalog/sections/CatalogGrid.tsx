'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { useToast } from "../../_components/ToastProvider";

import type {
  CatalogFacets,
  CatalogItem,
  CatalogResponse,
} from "@/types/catalog";

import { ProductDrilldownModal } from "../_components/ProductDrilldownModal";

type CatalogMeta = CatalogResponse["meta"];
type ProductExportJob = {
  id: string;
  format: "CSV" | "PDF" | "EXCEL";
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  fileUrl: string | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

type SortOption = "priority" | "availability" | "az";

export default function CatalogGrid() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [priceListFilter, setPriceListFilter] = useState<string>("all");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("priority");
  const [quantityBySku, setQuantityBySku] = useState<Record<string, number>>({});
  const [drilldownSkuId, setDrilldownSkuId] = useState<string | null>(null);
  const [isSubmittingExport, setIsSubmittingExport] = useState(false);
  const [facets, setFacets] = useState<CatalogFacets | null>(null);
  const [fields, setFields] = useState<CatalogResponse["fields"] | null>(null);
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedLifecycle, setSelectedLifecycle] = useState<string[]>([]);
  const [minAvailable, setMinAvailable] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [exportJobs, setExportJobs] = useState<ProductExportJob[]>([]);
const [exportJobsLoading, setExportJobsLoading] = useState(false);
const previousJobStatuses = useRef<Map<string, ProductExportJob["status"]>>(new Map());
const hasInitializedJobStatuses = useRef(false);
const [showExportMenu, setShowExportMenu] = useState(false);
const exportMenuRef = useRef<HTMLDivElement | null>(null);

  const { pushToast } = useToast();

  useEffect(() => {
    setPage(1);
  }, [search, selectedCategories, selectedLifecycle, priceListFilter, onlyInStock, sortOption, minAvailable]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("q", search.trim());
        selectedCategories.forEach((category) => params.append("category", category));
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
          `/api/sales/catalog${queryString ? `?${queryString}` : ""}`,
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
          setMeta(payload.meta);
          setFields(payload.fields ?? null);
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

  const filtersPayload = useMemo(
    () => ({
      search: search.trim() || undefined,
      categories: selectedCategories,
      lifecycle: selectedLifecycle,
      priceListId: priceListFilter !== "all" ? priceListFilter : undefined,
      onlyInStock,
      sort: sortOption,
      minAvailable: typeof minAvailable === "number" ? minAvailable : undefined,
    }),
    [
      search,
      selectedCategories,
      selectedLifecycle,
      priceListFilter,
      onlyInStock,
      sortOption,
      minAvailable,
    ],
  );

  const filterSections = useMemo(() => {
    if (!fields || !facets) return [];
    return fields
      .filter((field) => field.filterable)
      .map((field) => {
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
  }, [fields, facets, selectedCategories, selectedLifecycle]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const matchesSearch = (item: CatalogItem) => {
      if (!normalizedSearch) return true;
      return [item.productName, item.brand ?? "", item.category ?? "", item.skuCode]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    };

    const matchesPriceList = (item: CatalogItem) =>
      priceListFilter === "all" || item.priceLists.some((price) => price.priceListId === priceListFilter);

    const matchesStock = (item: CatalogItem) => !onlyInStock || item.inventory.totals.available > 0;

    return items.filter(
      (item) =>
        matchesSearch(item) &&
        matchesPriceList(item) &&
        matchesStock(item),
    );
  }, [items, search, priceListFilter, onlyInStock]);

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
    setPriceListFilter("all");
    setOnlyInStock(false);
    setSortOption("priority");
    setSelectedCategories([]);
    setSelectedLifecycle([]);
    setMinAvailable(undefined);
    setPage(1);
  }, []);

  const processJobStatusNotifications = useCallback((jobs: ProductExportJob[]) => {
    if (!hasInitializedJobStatuses.current) {
      jobs.forEach((job) => previousJobStatuses.current.set(job.id, job.status));
      hasInitializedJobStatuses.current = true;
      return;
    }

    const statusMap = previousJobStatuses.current;
    jobs.forEach((job) => {
      const previousStatus = statusMap.get(job.id);
      if (previousStatus && previousStatus !== job.status) {
        if (job.status === "COMPLETED") {
          pushToast({
            tone: "success",
            title: "Export ready",
            description: job.fileUrl
              ? `Download ready: ${job.fileUrl}`
              : "CSV available in Recent Exports.",
          });
        } else if (job.status === "FAILED") {
          pushToast({
            tone: "error",
            title: "Export failed",
            description: job.errorMessage ?? "Please try again.",
          });
        }
      }
      statusMap.set(job.id, job.status);
    });

    const jobIds = new Set(jobs.map((job) => job.id));
    Array.from(statusMap.keys()).forEach((id) => {
      if (!jobIds.has(id)) {
        statusMap.delete(id);
      }
    });
  }, [pushToast]);

  const fetchExportJobs = useCallback(async () => {
    setExportJobsLoading(true);
    try {
      const response = await fetch("/api/sales/catalog/export", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to load export jobs");
      }
      const payload = (await response.json()) as { jobs: ProductExportJob[] };
      const jobs = payload.jobs ?? [];
      processJobStatusNotifications(jobs);
      setExportJobs(jobs);
    } catch (err) {
      console.error("Failed to load export jobs", err);
      pushToast({
        tone: "error",
        title: "Unable to load export jobs",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setExportJobsLoading(false);
    }
  }, [processJobStatusNotifications, pushToast]);

useEffect(() => {
  void fetchExportJobs();
  const interval = setInterval(() => {
    void fetchExportJobs();
  }, 15000);
  return () => clearInterval(interval);
}, [fetchExportJobs]);

useEffect(() => {
  if (!showExportMenu) return;
  const handler = (event: MouseEvent) => {
    if (!exportMenuRef.current?.contains(event.target as Node)) {
      setShowExportMenu(false);
    }
  };
  document.addEventListener("mousedown", handler);
  return () => document.removeEventListener("mousedown", handler);
}, [showExportMenu]);

  const handleExportRequest = useCallback(async (format: ProductExportJob["format"]) => {
    if ((meta?.total ?? items.length) === 0) {
      pushToast({
        tone: "warning",
        title: "Nothing to export",
        description: "Adjust your filters to include at least one SKU.",
      });
      return;
    }

    setIsSubmittingExport(true);
    try {
      const response = await fetch("/api/sales/catalog/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          filters: filtersPayload,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to start export.");
      }
      pushToast({
        tone: "success",
        title: "Export queued",
        description: "We'll notify you once the file is ready.",
      });
      void fetchExportJobs();
    } catch (err) {
      pushToast({
        tone: "error",
        title: "Export failed",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSubmittingExport(false);
    }
  }, [filtersPayload, fetchExportJobs, pushToast, meta?.total, items.length]);

  // Cart system removed - catalog is now view-only
  // To create an order, sales reps use the "New Order" button from Orders page

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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="rounded-md border border-gray-300 px-3 py-1 font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900"
              >
                Clear filters
              </button>
              <div className="relative" ref={exportMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowExportMenu((prev) => !prev)}
                  disabled={isSubmittingExport}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1 font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:opacity-60"
                >
                  <Download className="h-3 w-3" aria-hidden="true" />
                  {isSubmittingExport ? "Queuing…" : "Export"}
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 z-10 mt-2 w-40 rounded-md border border-slate-200 bg-white shadow-lg">
                    {["CSV", "PDF", "EXCEL"].map((format) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => {
                          setShowExportMenu(false);
                          void handleExportRequest(format as ProductExportJob["format"]);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-slate-50"
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                  <Link
                    href="/sales/orders"
                    className="flex w-full items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
                  >
                    {outOfStock ? "Out of Stock" : "Create Order"}
                  </Link>
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

function StatusBadge({ status }: { status: ProductExportJob["status"] }) {
  const palette: Record<ProductExportJob["status"], string> = {
    QUEUED: "bg-slate-100 text-slate-700",
    PROCESSING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-rose-100 text-rose-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${palette[status]}`}>
      {status.toLowerCase()}
    </span>
  );
}
