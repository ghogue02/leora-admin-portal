'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";

type OrdersResponse = {
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
};

type OrdersState = {
  data: OrdersResponse | null;
  loading: boolean;
  error: string | null;
};

const STATUS_BADGES: Partial<Record<OrderStatus, string>> = {
  SUBMITTED: "bg-amber-100 text-amber-700",
  PARTIALLY_FULFILLED: "bg-blue-100 text-blue-700",
  FULFILLED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export default function OrdersList() {
  const [state, setState] = useState<OrdersState>({
    data: null,
    loading: true,
    error: null,
  });
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/sales/orders?limit=50", {
        cache: "no-store",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to load orders.");
      }
      const payload = (await response.json()) as OrdersResponse;
      setState({ data: payload, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load orders.",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openOrderCount = useMemo(() => {
    if (!state.data) return 0;
    const statuses: OrderStatus[] = ["SUBMITTED", "PARTIALLY_FULFILLED"];
    return statuses.reduce((count, status) => {
      const entry = state.data?.summary.byStatus?.[status];
      return count + (entry?.count ?? 0);
    }, 0);
  }, [state.data]);

  const handleCancel = useCallback(
    async (orderId: string) => {
      const order = state.data?.orders.find((item) => item.id === orderId);
      if (!order || !isCancelable(order.status)) return;

      const confirmed = window.confirm(
        "Cancel this order? This will release inventory holds and stop fulfillment.",
      );
      if (!confirmed) return;

      setCancelError(null);
      setCancelingId(orderId);
      try {
        const response = await fetch(`/api/sales/orders/${orderId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error ?? "Unable to cancel order.");
        }
        await load();
      } catch (error) {
        setCancelError(error instanceof Error ? error.message : "Unable to cancel order.");
      } finally {
        setCancelingId(null);
      }
    },
    [load, state.data],
  );

  if (state.loading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
            <div className="mt-4 h-3 w-full rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-semibold">We couldn&apos;t load orders right now.</p>
        <p className="mt-1">{state.error ?? "Try again shortly or contact support."}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, orders } = state.data;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-gray-500">At a glance</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <OrdersSummaryStat label="Total orders" value={summary.totalCount.toString()} />
          <OrdersSummaryStat
            label="Open exposure"
            value={new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(summary.openTotal)}
          />
          <OrdersSummaryStat
            label="Open order count"
            value={openOrderCount.toString()}
          />
        </div>
      </header>

      {cancelError ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {cancelError}
        </div>
      ) : null}

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-gray-600">
          No orders yet. Once Supabase ingestion is restored, live orders will populate here.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-sm text-gray-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Totals</th>
                <th className="px-4 py-3 text-left">Invoices</th>
                <th className="px-4 py-3 text-left">Updated</th>
                <th className="px-4 py-3 text-left">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <Link
                        href={`/sales/orders/${order.id}`}
                        className="font-medium text-gray-900 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
                      >
                        #{order.id.slice(0, 8)}
                      </Link>
                      <span className="text-xs text-gray-500">
                        Ordered{" "}
                        {order.orderedAt
                          ? new Date(order.orderedAt).toLocaleDateString()
                          : "—"}
                      </span>
                    </div>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        STATUS_BADGES[order.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {order.customer ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{order.customer.name}</span>
                        <Link
                          href={`/sales/customers/${order.customer.id}`}
                          className="text-xs text-gray-500 underline decoration-dotted underline-offset-2 hover:text-gray-900"
                        >
                          View customer
                        </Link>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Portal order</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">
                      {order.total
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: order.currency ?? "USD",
                            maximumFractionDigits: 0,
                          }).format(order.total)
                        : "TBD"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <ul className="space-y-1 text-xs text-gray-600">
                      {Object.entries(order.invoiceTotals.byStatus).map(([status, amount]) => (
                        <li key={status} className="flex justify-between">
                          <span>{status}</span>
                          <span>
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: order.currency ?? "USD",
                              maximumFractionDigits: 0,
                            }).format(amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    Synced live from Supabase
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {isCancelable(order.status) ? (
                      <button
                        type="button"
                        onClick={() => void handleCancel(order.id)}
                        disabled={cancelingId === order.id}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {cancelingId === order.id ? "Canceling…" : "Cancel order"}
                      </button>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const CANCELABLE_STATUSES: OrderStatus[] = ["SUBMITTED", "PARTIALLY_FULFILLED"];

function isCancelable(status: OrderStatus) {
  return CANCELABLE_STATUSES.includes(status);
}

function OrdersSummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
