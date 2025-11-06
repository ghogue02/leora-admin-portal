"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

type BtgRow = {
  category: string;
  supplierName: string;
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  customerId: string;
  customerName: string;
  totalUnits: number;
  orderCount: number;
  recentUnits: number;
  averageMonthlyUnits: number;
  firstOrderDate: string | null;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  isActivePlacement: boolean;
};

type ApiResponse = {
  data: BtgRow[];
};

export default function BtgDashboardClient() {
  const [rows, setRows] = useState<BtgRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/sales/btg", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load BTG placements: ${response.statusText}`);
        }
        const payload: ApiResponse = await response.json();
        if (isMounted) {
          setRows(payload.data);
        }
      } catch (err) {
        console.error("Error loading BTG placements", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load BTG placements");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    return showActiveOnly ? rows.filter((row) => row.isActivePlacement) : rows;
  }, [rows, showActiveOnly]);

  const groupedRows = useMemo(() => {
    const categoryMap = new Map<string, Map<string, BtgRow[]>>();

    for (const row of filteredRows) {
      if (!categoryMap.has(row.category)) {
        categoryMap.set(row.category, new Map());
      }
      const supplierMap = categoryMap.get(row.category)!;
      if (!supplierMap.has(row.supplierName)) {
        supplierMap.set(row.supplierName, []);
      }
      supplierMap.get(row.supplierName)!.push(row);
    }

    for (const supplierMap of categoryMap.values()) {
      for (const [supplier, supplierRows] of supplierMap.entries()) {
        supplierRows.sort((a, b) => {
          const productCompare = a.productName.localeCompare(b.productName);
          if (productCompare !== 0) return productCompare;
          return a.customerName.localeCompare(b.customerName);
        });
        supplierMap.set(supplier, supplierRows);
      }
    }

    return categoryMap;
  }, [filteredRows]);

  const activeCount = rows.filter((row) => row.isActivePlacement).length;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 pb-12 p-6">
      <header className="flex flex-col gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            BTG Intelligence
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">By-the-Glass Placements</h1>
        </div>
        <p className="max-w-3xl text-sm text-gray-600">
          Track every recorded BTG placement across categories, suppliers, and customers.
          Use this view to understand velocity, identify at-risk placements, and support supply allocation decisions.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            Showing <strong>{filteredRows.length.toLocaleString()}</strong> placements
            {showActiveOnly ? " (active only)" : ""}. Active placements recorded in the last 90 days:{" "}
            <strong>{activeCount.toLocaleString()}</strong>.
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(event) => setShowActiveOnly(event.target.checked)}
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
            />
            Show active placements only
          </label>
        </div>
      </section>

      {isLoading ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-48 animate-pulse rounded bg-gray-200"></div>
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded bg-gray-100"></div>
            ))}
          </div>
        </section>
      ) : error ? (
        <section className="rounded-lg border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-rose-900">Unable to load BTG placements</h2>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
        </section>
      ) : filteredRows.length === 0 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
            No BTG placements match the selected filters.
          </div>
        </section>
      ) : (
        Array.from(groupedRows.entries()).map(([category, supplierMap]) => (
          <section key={category} className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
              <span className="text-xs uppercase tracking-wide text-gray-400">
                {Array.from(supplierMap.values()).reduce((sum, supplierRows) => sum + supplierRows.length, 0)} placements
              </span>
            </div>
            {Array.from(supplierMap.entries())
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([supplier, supplierRows]) => (
                <div key={`${category}-${supplier}`} className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {supplier}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {supplierRows.length} placement{supplierRows.length === 1 ? "" : "s"}
                      </span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left">SKU</th>
                          <th className="px-4 py-3 text-left">Item / Customer</th>
                          <th className="px-4 py-3 text-right">Avg Units / Month</th>
                          <th className="px-4 py-3 text-right">Total Units</th>
                          <th className="px-4 py-3 text-right">BTG Orders</th>
                          <th className="px-4 py-3 text-right">Last 90 Days</th>
                          <th className="px-4 py-3 text-left">First BTG</th>
                          <th className="px-4 py-3 text-left">Last BTG</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {supplierRows.map((row) => (
                          <tr key={`${row.skuId}-${row.customerId}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.skuCode}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{row.productName}</div>
                              <div className="text-xs text-gray-500">
                                {row.customerName}
                                {row.brand ? ` • ${row.brand}` : ""}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-900">
                              {row.averageMonthlyUnits.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900">
                              {row.totalUnits.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900">
                              {row.orderCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-900">
                              {row.recentUnits.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {row.firstOrderDate
                                ? format(new Date(row.firstOrderDate), "MMM d, yyyy")
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600">
                              {row.lastOrderDate
                                ? format(new Date(row.lastOrderDate), "MMM d, yyyy")
                                : "—"}
                            </td>
                            <td className="px-4 py-3">
                              {row.isActivePlacement ? (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-600">
                                  Dormant
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </section>
        ))
      )}
    </main>
  );
}
