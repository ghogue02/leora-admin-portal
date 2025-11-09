'use client';

import { useCallback, useEffect, useState } from "react";
import type { CustomerRiskStatus } from "@prisma/client";
import CustomerTable from "./sections/CustomerTable";
import CustomerFilters from "./sections/CustomerFilters";
import CustomerSearchBar from "./sections/CustomerSearchBar";
import CustomerTagFilter from "./sections/CustomerTagFilter";
import { SkeletonTable } from "../_components/SkeletonLoader";
import { EmptyCustomers, EmptySearch } from "../_components/EmptyState";
import { CustomerTagType } from "@/constants/customerTags";

type Customer = {
  id: string;
  name: string;
  accountNumber: string | null;
  billingEmail: string | null;
  riskStatus: CustomerRiskStatus;
  lastOrderDate: string | null;
  nextExpectedOrderDate: string | null;
  averageOrderIntervalDays: number | null;
  establishedRevenue: number | null;
  dormancySince: string | null;
  location: string | null;
  lifetimeRevenue: number;
  recentRevenue: number;
  ytdRevenue: number;
  mtdRevenue?: number;
  recentOrderCount: number;
  daysOverdue: number;
  daysUntilExpected: number | null;
  isDueToOrder: boolean;
};

type CustomersResponse = {
  customers: Customer[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  summary: {
    totalCustomers: number;
    totalRevenue: number;
    mtdRevenue?: number;
    ytdRevenue?: number;
    customersDue: number;
    riskCounts: Record<string, number>;
    tagCounts: {
      type: CustomerTagType;
      count: number;
    }[];
  };
};

type SortField = "name" | "lastOrderDate" | "nextExpectedOrderDate" | "revenue";
type SortDirection = "asc" | "desc";

export default function SalesCustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [activeFilter, setActiveFilter] = useState<CustomerRiskStatus | "ALL" | "DUE">("DUE");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTags, setSelectedTags] = useState<CustomerTagType[]>([]);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Apply search
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      // Apply risk filter
      if (activeFilter !== "ALL" && activeFilter !== "DUE") {
        params.set("risk", activeFilter);
      }

      if (activeFilter === "DUE") {
        params.set("due", "true");
      }

      // Apply sorting
      params.set("sortField", sortField);
      params.set("sortDirection", sortDirection);
      params.set("page", currentPage.toString());
      params.set("pageSize", "50");

      if (selectedTags.length > 0) {
        params.set("tags", selectedTags.join(","));
      }

      const response = await fetch(`/api/sales/customers?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to load customers.");
      }

      const payload = (await response.json()) as CustomersResponse;

      setData(payload);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load customers.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, sortField, sortDirection, currentPage, selectedTags]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);

  const resetSavedView = () => setSelectedViewId(null);

  const handleFilterChange = (filter: CustomerRiskStatus | "ALL" | "DUE") => {
    resetSavedView();
    setActiveFilter(filter);
    setCurrentPage(1);
  };

  const handleTagFilterChange = useCallback((tags: CustomerTagType[]) => {
    resetSavedView();
    setSelectedTags(tags);
    setCurrentPage(1);
  }, []);

  const handleSearch = useCallback((query: string) => {
    resetSavedView();
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with default ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const summaryCards = data
    ? [
        {
          id: "customers",
          label: "Customers in view",
          value: data.summary.totalCustomers.toLocaleString(),
          hint: "Click to view all segments",
          onClick: () => handleFilterChange("ALL"),
        },
        {
          id: "due",
          label: "Due to order",
          value: data.summary.customersDue.toLocaleString(),
          hint: "Expected within the next cycle",
          onClick: () => handleFilterChange("DUE"),
        },
        {
          id: "revenue",
          label: "Total revenue (est)",
          value: formatCurrency(data.summary.totalRevenue),
          hint: "Filtered view",
          onClick: undefined,
        },
      ]
    : [];

  type SavedViewOption = {
    id: string;
    label: string;
    description: string;
    apply: () => void;
  };

  const savedViews: SavedViewOption[] = [
    {
      id: "due-week",
      label: "Due this week",
      description: "Customers expected in the next 7 days",
      apply: () => {
        setSelectedViewId("due-week");
        setSelectedTags([]);
        setSearchQuery("");
        setActiveFilter("DUE");
        setCurrentPage(1);
      },
    },
    {
      id: "dormant",
      label: "Dormant 60+ days",
      description: "Accounts that haven’t ordered in ~2 months",
      apply: () => {
        setSelectedViewId("dormant");
        setSelectedTags([]);
        setSearchQuery("");
        setActiveFilter("DORMANT");
        setCurrentPage(1);
      },
    },
    {
      id: "natural-focus",
      label: "Natural wine focus",
      description: "Tagged for natural or biodynamic programs",
      apply: () => {
        setSelectedViewId("natural-focus");
        setActiveFilter("ALL");
        setSearchQuery("");
        setSelectedTags(["natural_wine", "biodynamic"]);
        setCurrentPage(1);
      },
    },
  ];

  const applySavedView = (viewId: string) => {
    const view = savedViews.find((option) => option.id === viewId);
    if (!view) return;
    view.apply();
  };

  const filteredInfo =
    data && `${data.pagination.totalCount.toLocaleString()} of ${data.summary.totalCustomers.toLocaleString()} customers`;

  return (
    <main className="mx-auto max-w-7xl gap-8 px-4 py-6 lg:grid lg:grid-cols-[320px,1fr]">
      <aside className="space-y-6 lg:sticky lg:top-6">
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Overview</p>
          {!data ? (
            <div className="mt-4 grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 rounded-xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {summaryCards.map((card) => (
                <SummaryCard key={card.id} {...card} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saved views</p>
              <p className="text-xs text-slate-500">Jump to your most common slices</p>
            </div>
            {selectedViewId && (
              <button
                type="button"
                onClick={() => setSelectedViewId(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-3 grid gap-2">
            {savedViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => applySavedView(view.id)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  selectedViewId === view.id
                    ? "border-indigo-400 bg-indigo-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-400"
                }`}
              >
                <p className="font-semibold text-slate-900">{view.label}</p>
                <p className="text-xs text-slate-500">{view.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</p>
          <p className="text-xs text-slate-500">Name, account #, email, city</p>
          <div className="mt-3">
            <CustomerSearchBar onSearch={handleSearch} initialValue={searchQuery} />
          </div>
        </section>

        {data && (
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk filters</p>
              <CustomerFilters
                activeFilter={activeFilter}
                onFilterChange={handleFilterChange}
                riskCounts={data.summary.riskCounts}
                customersDueCount={data.summary.customersDue}
              />
            </div>
            <CustomerTagFilter
              tagCounts={data.summary.tagCounts}
              selectedTags={selectedTags}
              onTagsChange={handleTagFilterChange}
              totalCustomers={data.summary.totalCustomers}
              filteredCustomers={data.pagination.totalCount}
            />
            {filteredInfo && (
              <p className="text-xs text-slate-500" role="status" aria-live="polite">
                Showing {filteredInfo}
              </p>
            )}
          </section>
        )}
      </aside>

      <section className="space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            <p className="font-semibold">We couldn&apos;t load customers right now.</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => void loadCustomers()}
              className="mt-4 inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {!error && (
          <>
            {loading && !data ? (
              <SkeletonTable />
            ) : data && data.customers.length === 0 ? (
              searchQuery ? <EmptySearch /> : <EmptyCustomers />
            ) : (
              <CustomerTable
                customers={data?.customers ?? []}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                loading={loading}
              />
            )}

            {data && data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
                <div className="text-sm text-gray-600">
                  Showing page {data.pagination.page} of {data.pagination.totalPages} (
                  {data.pagination.totalCount} customers)
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(data.pagination.totalPages, prev + 1))}
                    disabled={currentPage === data.pagination.totalPages}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  hint: string;
  onClick?: () => void;
};

function SummaryCard({ label, value, hint, onClick }: SummaryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition ${
        onClick
          ? "border-slate-200 bg-white hover:border-slate-400 hover:shadow"
          : "border-slate-100 bg-slate-50 cursor-default"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{hint}</p>
    </button>
  );
}
