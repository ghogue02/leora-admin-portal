'use client';

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AccountPriority, CustomerRiskStatus } from "@prisma/client";
import CustomerTable from "./sections/CustomerTable";
import CustomerSearchBar from "./sections/CustomerSearchBar";
import CustomerTagFilter from "./sections/CustomerTagFilter";
import CustomerActivityFeed from "./sections/CustomerActivityFeed";
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
  accountPriority: AccountPriority | null;
  dueForOutreach: null | {
    priority: AccountPriority | "NONE";
    thresholdDays: number;
    lastLovedAt: string | null;
    daysSinceLove: number | null;
    avgMonthlyRevenue: number;
  };
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
type PriorityFilter = "ALL" | "NONE" | AccountPriority;

const parsePriorityParam = (value: string | null): PriorityFilter => {
  if (!value) return "ALL";
  if (value === "NONE") return "NONE";
  if (value === "HIGH" || value === "MEDIUM" || value === "LOW") {
    return value;
  }
  return "ALL";
};

export default function SalesCustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [viewFilterTab, setViewFilterTab] = useState<"views" | "filters">("views");
  const priorityFilter = parsePriorityParam(searchParams?.get("priority"));
  const unlovedOnly = searchParams?.get("unloved") === "true";

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

      if (priorityFilter !== "ALL") {
        params.set("priority", priorityFilter === "NONE" ? "NONE" : priorityFilter);
      }

      if (unlovedOnly) {
        params.set("unloved", "true");
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
  }, [searchQuery, activeFilter, sortField, sortDirection, currentPage, selectedTags, priorityFilter, unlovedOnly]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [priorityFilter, unlovedOnly]);

  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);

  const resetSavedView = useCallback(() => setSelectedViewId(null), []);

  const syncUrlFilters = useCallback(
    (nextPriority: PriorityFilter, nextUnloved: boolean) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");

      if (nextPriority !== "ALL") {
        params.set("priority", nextPriority === "NONE" ? "NONE" : nextPriority);
      } else {
        params.delete("priority");
      }

      if (nextUnloved) {
        params.set("unloved", "true");
      } else {
        params.delete("unloved");
      }

      const queryString = params.toString();
      const nextUrl = queryString ? `/sales/customers?${queryString}` : "/sales/customers";
      router.replace(nextUrl, { scroll: false });
    },
    [router, searchParams]
  );

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

  const handlePriorityFilterChange = (value: PriorityFilter) => {
    resetSavedView();
    if (activeFilter !== "ALL") {
      setActiveFilter("ALL");
    }
    setCurrentPage(1);
    syncUrlFilters(value, unlovedOnly);
  };

  const clearUnlovedFilter = () => {
    resetSavedView();
    setCurrentPage(1);
    syncUrlFilters(priorityFilter, false);
  };

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
      id: "high-risk-revenue",
      label: "High $ at risk",
      description: "At-risk customers with > $25k YTD revenue",
      apply: () => {
        setSelectedViewId("high-risk-revenue");
        setSearchQuery("ytd>25000");
        setActiveFilter("AT_RISK_REVENUE");
        setSelectedTags([]);
        setCurrentPage(1);
      },
    },
    {
      id: "zero-activity-30",
      label: "No activity 30+ days",
      description: "Haven’t ordered or logged activity in 30 days",
      apply: () => {
        setSelectedViewId("zero-activity-30");
        setSearchQuery("lastOrder>30");
        setActiveFilter("ALL");
        setSelectedTags([]);
        setCurrentPage(1);
      },
    },
    {
      id: "fast-movers",
      label: "Fast movers",
      description: "Average order interval <= 21 days and due soon",
      apply: () => {
        setSelectedViewId("fast-movers");
        setSearchQuery("interval<=21");
        setActiveFilter("DUE");
        setSelectedTags([]);
        setCurrentPage(1);
      },
    },
    {
      id: "new-logos",
      label: "New logos (60d)",
      description: "New customers in their first 60 days",
      apply: () => {
        setSelectedViewId("new-logos");
        setSearchQuery("new<=60");
        setActiveFilter("ALL");
        setSelectedTags([]);
        setCurrentPage(1);
      },
    },
    {
      id: "gap-expected",
      label: "10+ days overdue",
      description: "Past expected date by 10 days or more",
      apply: () => {
        setSelectedViewId("gap-expected");
        setSearchQuery("overdue>=10");
        setActiveFilter("ALL");
        setSelectedTags([]);
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

  type Tone = "blue" | "emerald" | "amber" | "orange" | "rose" | "gray" | "indigo";
  type CardConfig = {
    id: string;
    label: string;
    description: string;
    count?: number;
    active: boolean;
    tone: Tone;
    onClick: () => void;
  };
  const toneStyles: Record<Tone, { base: string; active: string }> = {
    blue: { base: "border-blue-100 bg-blue-50 hover:border-blue-300", active: "border-blue-400 ring-2 ring-blue-200" },
    emerald: { base: "border-emerald-100 bg-emerald-50 hover:border-emerald-300", active: "border-emerald-400 ring-2 ring-emerald-200" },
    amber: { base: "border-amber-100 bg-amber-50 hover:border-amber-300", active: "border-amber-400 ring-2 ring-amber-200" },
    orange: { base: "border-orange-100 bg-orange-50 hover:border-orange-300", active: "border-orange-400 ring-2 ring-orange-200" },
    rose: { base: "border-rose-100 bg-rose-50 hover:border-rose-300", active: "border-rose-400 ring-2 ring-rose-200" },
    gray: { base: "border-slate-200 bg-white hover:border-slate-400", active: "border-slate-400 ring-2 ring-slate-200" },
    indigo: { base: "border-indigo-100 bg-indigo-50 hover:border-indigo-300", active: "border-indigo-400 ring-2 ring-indigo-200" },
  };

  const riskCounts = data?.summary.riskCounts ?? {};
  const riskFilterCards: CardConfig[] = data
    ? [
        {
          id: "filter-due",
          label: "Due soon",
          description: "Expected to order within the next delivery cycle.",
          count: data.summary.customersDue,
          active: activeFilter === "DUE",
          tone: "blue" as Tone,
          onClick: () => handleFilterChange("DUE"),
        },
        {
          id: "filter-healthy",
          label: "Healthy",
          description: "Consistent cadence over the past 90 days.",
          count: riskCounts.HEALTHY ?? 0,
          active: activeFilter === "HEALTHY",
          tone: "emerald" as Tone,
          onClick: () => handleFilterChange("HEALTHY"),
        },
        {
          id: "filter-cadence",
          label: "At risk – cadence",
          description: "Missed their typical re-order window.",
          count: riskCounts.AT_RISK_CADENCE ?? 0,
          active: activeFilter === "AT_RISK_CADENCE",
          tone: "amber" as Tone,
          onClick: () => handleFilterChange("AT_RISK_CADENCE"),
        },
        {
          id: "filter-revenue",
          label: "At risk – revenue",
          description: "Trailing revenue is trending down sharply.",
          count: riskCounts.AT_RISK_REVENUE ?? 0,
          active: activeFilter === "AT_RISK_REVENUE",
          tone: "orange" as Tone,
          onClick: () => handleFilterChange("AT_RISK_REVENUE"),
        },
        {
          id: "filter-dormant",
          label: "Dormant",
          description: "No orders in 45+ days.",
          count: riskCounts.DORMANT ?? 0,
          active: activeFilter === "DORMANT",
          tone: "rose" as Tone,
          onClick: () => handleFilterChange("DORMANT"),
        },
        {
          id: "filter-all",
          label: "All customers",
          description: "Show the full book without filters.",
          count: data.summary.totalCustomers,
          active: activeFilter === "ALL",
          tone: "gray" as Tone,
          onClick: () => handleFilterChange("ALL"),
        },
      ]
    : [];

  const savedViewCards: CardConfig[] = data
    ? savedViews.map((view) => ({
        id: `view-${view.id}`,
        label: view.label,
        description: view.description,
        count: undefined,
        active: selectedViewId === view.id,
        tone: "indigo" as Tone,
        onClick: () => applySavedView(view.id),
      }))
    : [];

  const combinedCards: CardConfig[] =
    data && viewFilterTab === "views" ? savedViewCards : viewFilterTab === "filters" ? riskFilterCards : [];

  const priorityOptions: { label: string; value: PriorityFilter; description: string }[] = [
    {
      label: "All priorities",
      value: "ALL",
      description: "Show every account regardless of focus level",
    },
    {
      label: "Priority 1 (High)",
      value: "HIGH",
      description: "Avg monthly revenue ≥ $2.5k (auto) or manually pinned logos.",
    },
    {
      label: "Priority 2 (Medium)",
      value: "MEDIUM",
      description: "Roughly $1k–$2.5k per month; still need steady touches.",
    },
    {
      label: "Priority 3 (Low)",
      value: "LOW",
      description: "Under $1k per month; nurture/long-tail accounts.",
    },
    {
      label: "Not set",
      value: "NONE",
      description: "Accounts missing a priority flag",
    },
  ];

  const priorityFilterLabel =
    priorityFilter === "ALL"
      ? "All priorities"
      : priorityFilter === "NONE"
        ? "Not set"
        : priorityFilter === "HIGH"
          ? "Priority 1"
          : priorityFilter === "MEDIUM"
            ? "Priority 2"
            : "Priority 3";

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 lg:grid lg:grid-cols-[360px,minmax(0,1fr)] lg:items-start lg:gap-10">
      <aside className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-2">
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Search</p>
          <p className="text-xs text-slate-500">Name, account #, email, city</p>
          <div className="mt-3">
            <CustomerSearchBar onSearch={handleSearch} initialValue={searchQuery} />
          </div>
        </section>

        <CustomerActivityFeed />

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account priority</p>
              <p className="text-xs text-slate-500">Focus on the most important accounts first</p>
            </div>
            {priorityFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => handlePriorityFilterChange("ALL")}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-3 space-y-2">
            {priorityOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handlePriorityFilterChange(option.value)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                  priorityFilter === option.value
                    ? "border-blue-400 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{option.description}</p>
              </button>
            ))}
          </div>
        </section>

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

        {data && (
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Views & filters</p>
                  <p className="text-xs text-slate-500">Hover to preview each slice</p>
                </div>
                {(selectedViewId || activeFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedViewId(null);
                      handleFilterChange("ALL");
                      setViewFilterTab("views");
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="mt-3 flex rounded-full border border-slate-200 bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                {[
                  { id: "views", label: "Saved views" },
                  { id: "filters", label: "Risk filters" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setViewFilterTab(tab.id as "views" | "filters")}
                    className={`flex-1 rounded-full px-3 py-1 transition ${
                      viewFilterTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {combinedCards.map((card) => {
                  const tone = toneStyles[card.tone];
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={card.onClick}
                      className={`group relative rounded-xl border px-3 py-1.5 text-left text-xs font-semibold text-slate-900 transition ${tone.base} ${
                        card.active ? tone.active : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{card.label}</span>
                        {card.count !== undefined && (
                          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {card.count.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="pointer-events-none absolute left-1/2 top-full z-20 hidden w-44 -translate-x-1/2 translate-y-2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg group-hover:block">
                        {card.description}
                      </div>
                    </button>
                  );
                })}
              </div>
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

      <section className="space-y-6 lg:col-start-2 lg:min-w-0">
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
            {unlovedOnly && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-5 py-4 text-sm text-rose-900 shadow-sm">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-base font-semibold">Due for outreach filter is on</p>
                    <p className="text-rose-800">
                      Showing accounts without an order or in-person visit beyond their priority threshold.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-rose-200 bg-white/70 px-3 py-1 text-xs font-semibold text-rose-700">
                      {priorityFilterLabel}
                    </span>
                    <button
                      type="button"
                      onClick={clearUnlovedFilter}
                      className="rounded-full border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-800 transition hover:bg-rose-100"
                    >
                      Show all accounts
                    </button>
                  </div>
                </div>
              </div>
            )}
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
