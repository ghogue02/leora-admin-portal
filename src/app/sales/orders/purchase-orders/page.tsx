"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PurchaseOrder = {
  id: string;
  poNumber: string;
  supplier: { id: string; name: string } | null;
  status: string;
  orderedAt: string;
  expectedAt: string | null;
  receivedAt: string | null;
  lineCount: number;
  totalCost: number;
};

type POResponse = {
  purchaseOrders: PurchaseOrder[];
};

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  ORDERED: "bg-purple-100 text-purple-700",
  RECEIVED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export default function PurchaseOrdersPage() {
  const [data, setData] = useState<POResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/sales/orders/purchase-orders", {
          cache: "no-store",
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "Unable to load purchase orders.");
        }

        const payload = (await response.json()) as POResponse;
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load purchase orders.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
          Purchase Orders
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">Supplier Orders & ETAs</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          Track purchase orders from suppliers and view expected arrival dates for backordered
          items.
        </p>
      </header>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {data?.purchaseOrders.length ?? 0} purchase order
          {data?.purchaseOrders.length === 1 ? "" : "s"}
        </div>
        <Link
          href="/sales/orders/purchase-orders/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          Create PO
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : data?.purchaseOrders.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white p-6 text-center text-sm text-gray-600">
          No purchase orders yet. Create your first PO to track supplier inventory.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-sm text-gray-700">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">PO Number</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Ordered</th>
                <th className="px-4 py-3 text-left">Expected</th>
                <th className="px-4 py-3 text-left">Items</th>
                <th className="px-4 py-3 text-left">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data?.purchaseOrders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/orders/purchase-orders/${po.id}`}
                      className="font-medium text-gray-900 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
                    >
                      {po.poNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {po.supplier ? po.supplier.name : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        STATUS_BADGES[po.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(po.orderedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {po.expectedAt ? (
                      <span className="font-semibold text-blue-700">
                        {new Date(po.expectedAt).toLocaleDateString()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">{po.lineCount} items</td>
                  <td className="px-4 py-3 font-semibold">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(po.totalCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
