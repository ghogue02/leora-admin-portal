'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";

type AccountSignalEntry = {
  customerId: string;
  daysSinceLastOrder: number;
  averagePace: number;
  lateness: number;
  status: "atRisk" | "dueSoon";
};

type AccountSignalHotlistEntry = AccountSignalEntry & {
  name: string | null;
};

type DashboardResponse = {
  summary: {
    totalCount: number;
    openTotal: number;
    byStatus: Partial<Record<OrderStatus, { count: number; total: number }>>;
  };
  orders: Array<{
    id: string;
    orderedAt: string | null;
    status: OrderStatus;
    total: number | null;
    currency: string | null;
    customer: { id: string; name: string } | null;
    invoiceTotals: { total: number; byStatus: Record<string, number> };
  }>;
  health: {
    paceLabel: string;
    paceSummary: string;
    revenueStatus: string;
    revenueSummary: string;
    suggestions: string[];
    arpdd: {
      status: string;
      summary: string;
      currentValue: number | null;
      previousValue: number | null;
      changePercent: number | null;
      currency: string;
    };
    accountSignals: {
      tracked: number;
      healthy: number;
      dueSoon: number;
      atRisk: number;
      atRiskCustomers: AccountSignalEntry[];
      dueSoonCustomers: AccountSignalEntry[];
      hotlist: AccountSignalHotlistEntry[];
    };
  };
  ingestion: {
    status: string;
    message: string;
    feeds: Array<{ name: string; status: string; lastSyncedAt: string | null }>;
  };
  recommendations: string[];
};

type DashboardState = {
  data: DashboardResponse | null;
  loading: boolean;
  error: string | null;
};

type StatusFilter = "all" | "open" | "fulfilled" | "cancelled";

const STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  SUBMITTED: "Submitted",
  PARTIALLY_FULFILLED: "In fulfillment",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};

export default function DashboardOverview() {
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null,
  });
  const [range, setRange] = useState<string>("30");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const statusParam = useMemo(() => {
    switch (statusFilter) {
      case "open":
        return "SUBMITTED,PARTIALLY_FULFILLED";
      case "fulfilled":
        return "FULFILLED";
      case "cancelled":
        return "CANCELLED";
      default:
        return null;
    }
  }, [statusFilter]);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const params = new URLSearchParams();
      params.set("limit", "5");
      if (range !== "all") {
        params.set("range", range);
      }
      if (statusParam) {
        params.set("statuses", statusParam);
      }

      const response = await fetch(`/api/portal/dashboard?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to load orders.");
      }

      const payload = (await response.json()) as DashboardResponse;
      setState({ data: payload, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load orders.",
      });
    }
  }, [range, statusParam]);

  useEffect(() => {
    void load();
  }, [load]);

  const summaryCards = useMemo(() => {
    if (!state.data) return [];
    const entries = Object.entries(state.data.summary.byStatus ?? {});

    return entries
      .map(([status, value]) => ({
        status: status as OrderStatus,
        count: value?.count ?? 0,
        total: value?.total ?? 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }, [state.data]);

  if (state.loading) {
    return (
      <section className="grid gap-6">
        <div className="animate-pulse rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded bg-slate-200" />
            <div className="h-3 w-11/12 rounded bg-slate-200" />
            <div className="h-3 w-10/12 rounded bg-slate-200" />
          </div>
        </div>
      </section>
    );
  }

  if (state.error || !state.data) {
    return (
      <section className="rounded-lg border border-red-100 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-medium">We couldn&apos;t load your dashboard just now.</p>
        <p className="mt-1">{state.error ?? "Try again shortly or contact support."}</p>
        <button
          type="button"
          onClick={() => {
            void load();
          }}
          className="mt-4 inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
        >
          Retry
        </button>
      </section>
    );
  }

  const payload = state.data;
  const ingestion = payload.ingestion;
  const accountSignals = payload.health.accountSignals;
  const arpdd = payload.health.arpdd;
  const rangeOptions = [
    { label: "7 days", value: "7" },
    { label: "30 days", value: "30" },
    { label: "90 days", value: "90" },
    { label: "All", value: "all" },
  ];
  const statusOptions: Array<{ label: string; value: StatusFilter }> = [
    { label: "All", value: "all" },
    { label: "Open", value: "open" },
    { label: "Fulfilled", value: "fulfilled" },
    { label: "Cancelled", value: "cancelled" },
  ];
  const displayedLimit = 5;
  const rangeLabel = rangeOptions.find((option) => option.value === range)?.label ?? "All";
  const statusLabel = statusOptions.find((option) => option.value === statusFilter)?.label ?? "All";

  const { summary, orders, recommendations } = payload;
  const health = payload.health;
  const openTotalFormatted =
    summary.openTotal > 0
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(summary.openTotal)
      : "—";
  const arpddMetric =
    arpdd.currentValue !== null
      ? `${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: arpdd.currency,
          maximumFractionDigits: 0,
        }).format(arpdd.currentValue)}/day`
      : "—";
  const arpddDescription = arpdd.summary;

  return (
    <section className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
          <span className="uppercase tracking-wide text-gray-500">Range</span>
          {rangeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-full border px-3 py-1 transition ${
                range === option.value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-slate-300 bg-white text-gray-700 hover:border-gray-900/40"
              }`}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-600">
          <span className="uppercase tracking-wide text-gray-500">Orders</span>
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-full border px-3 py-1 transition ${
                statusFilter === option.value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-slate-300 bg-white text-gray-700 hover:border-gray-900/40"
              }`}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DashboardStatCard
          title="Open order exposure"
          value={openTotalFormatted}
          hint={`Across ${statusLabel.toLowerCase()} statuses in ${rangeLabel.toLowerCase()}.`}
        />
        <DashboardStatCard
          title="Orders this cycle"
          value={summary.totalCount.toString()}
          hint={`Showing last ${displayedLimit} orders (${rangeLabel.toLowerCase()}).`}
        />
      </div>

      <AccountSignalsPanel signals={accountSignals} />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recent orders</h2>
              <p className="text-xs text-gray-500">Latest activity across your linked accounts.</p>
            </div>
            <Link
              href="/portal/account"
              className="text-xs font-semibold text-gray-600 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
            >
              Update delivery info
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="mt-6 text-sm text-gray-600">
              No portal-visible orders yet. Sync your distributor feeds or place a new order to light
              this up.
            </p>
          ) : (
            <ul className="mt-6 space-y-4 text-sm text-gray-700">
              {orders.map((order) => (
                <li key={order.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.customer?.name ?? "Direct order"} ·{" "}
                      <span className="text-xs uppercase tracking-wide text-gray-500">
                        {order.status}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {order.orderedAt
                        ? new Date(order.orderedAt).toLocaleDateString()
                        : "Date unavailable"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {order.total
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: order.currency ?? "USD",
                          maximumFractionDigits: 0,
                        }).format(order.total)
                      : "TBD"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Order momentum</h2>
            <p className="mt-1 text-xs text-gray-500">
              Top statuses by value help you spot bottlenecks.
            </p>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              {summaryCards.length === 0 ? (
                <li>No orders available.</li>
              ) : (
                summaryCards.map((item) => (
                  <li key={item.status} className="flex items-center justify-between">
                    <span>{STATUS_LABELS[item.status] ?? item.status}</span>
                    <span className="font-semibold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(item.total)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Next suggested action</h2>
            <p className="mt-1 text-xs text-gray-500">
              Keep addresses and payment profiles current to speed up checkout for your team.
            </p>
            <Link
              href="/portal/account"
              className="mt-4 inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-700"
            >
              Review account settings
            </Link>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Health snapshots</h2>
            <p className="text-xs text-gray-500">
              Pace and revenue signals refresh automatically as new orders sync from Supabase.
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            Pilot indicator · evolving
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <HealthCard
            title="Order cadence"
            status={health?.paceLabel ?? "Awaiting data"}
            metric={health?.paceSummary ?? "—"}
            description="Average days between portal-visible orders."
          />
          <HealthCard
            title="Revenue trend (30d)"
            status={health?.revenueStatus ?? "Awaiting data"}
            metric={health?.revenueSummary ?? "—"}
            description="Compares the last 30 days of portal orders to the prior 30-day window."
          />
          <HealthCard
            title="ARPDD (30d)"
            status={arpdd.status}
            metric={arpddMetric}
            description={arpddDescription || "Average revenue per delivery day across the last 30 days."}
          />
        </div>

        <div className="mt-6 space-y-2 text-sm text-gray-700">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Focus cues</p>
          {recommendations.length === 0 ? (
            <p className="text-sm text-gray-500">
              No alerts yet. Real usage will surface watch-outs here automatically.
            </p>
          ) : (
            <ul className="space-y-2">
              {recommendations.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
                  <p>{tip}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ingestion status</h2>
            <p className="text-xs text-gray-500">Track which feeds are currently syncing data.</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            {ingestion.status}
          </span>
        </header>
        <p className="mt-4 text-sm text-gray-600">{ingestion.message}</p>
        <ul className="mt-4 grid gap-2 text-sm text-gray-700 md:grid-cols-3">
          {ingestion.feeds.map((feed) => (
            <li key={feed.name} className="rounded-md border border-slate-200 px-3 py-2">
              <p className="font-semibold text-gray-900">{feed.name}</p>
              <p className="text-xs uppercase tracking-widest text-gray-500">{feed.status}</p>
              <p className="text-[11px] text-gray-500">
                {formatDisplayTimestamp(feed.lastSyncedAt)
                  ? `Last sync ${formatDisplayTimestamp(feed.lastSyncedAt)}`
                  : "Not yet synced"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}

function formatDisplayTimestamp(timestamp: string | null) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function DashboardStatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-widest text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{hint}</p>
    </div>
  );
}

function AccountSignalsPanel({
  signals,
}: {
  signals: DashboardResponse["health"]["accountSignals"];
}) {
  const stats = [
    { label: "Tracked accounts", value: signals.tracked, tone: "slate" as const },
    { label: "Due soon", value: signals.dueSoon, tone: "amber" as const },
    { label: "At risk", value: signals.atRisk, tone: "rose" as const },
  ];

  const hotlist = signals.hotlist;

  const statClass = (tone: "slate" | "amber" | "rose") => {
    switch (tone) {
      case "amber":
        return "border-amber-200 bg-amber-50 text-amber-900";
      case "rose":
        return "border-rose-200 bg-rose-50 text-rose-900";
      default:
        return "border-slate-200 bg-slate-50 text-gray-900";
    }
  };

  const badgeClass = (status: "atRisk" | "dueSoon") =>
    status === "atRisk" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700";

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Account cadence</p>
          <h2 className="text-lg font-semibold text-gray-900">Pace monitors</h2>
          <p className="text-xs text-gray-500">We highlight accounts slipping beyond their normal rhythm.</p>
        </div>
      </header>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-md border p-4 ${statClass(stat.tone)}`}
          >
            <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-gray-500">
        {signals.healthy} account{signals.healthy === 1 ? "" : "s"} currently on cadence.
      </p>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Hotlist</p>
        {hotlist.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No cadence alerts yet. Keep orders flowing to teach the monitor.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm text-gray-700">
            {hotlist.map((item) => (
              <li
                key={`${item.customerId}-${item.status}`}
                className="flex items-start justify-between gap-3 rounded-md border border-slate-200 px-3 py-2"
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.name ?? "Account pending"}</p>
                  <p className="text-xs text-gray-500">
                    {item.status === "atRisk" ? "At risk" : "Due soon"} · {item.daysSinceLastOrder} days since last order · pace {item.averagePace}d · {item.lateness}d late
                  </p>
                </div>
                <span className={`flex-shrink-0 rounded-full px-3 py-0.5 text-xs font-semibold ${badgeClass(item.status)}`}>
                  {item.status === "atRisk" ? "At risk" : "Due soon"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function HealthCard({
  title,
  status,
  metric,
  description,
}: {
  title: string;
  status: string;
  metric: string;
  description: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-gray-700">
          {status}
        </span>
      </header>
      <p className="mt-3 text-2xl font-semibold text-gray-900">{metric}</p>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </article>
  );
}
