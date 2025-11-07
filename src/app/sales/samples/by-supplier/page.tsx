"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, TrendingUp, Package } from "lucide-react";

type SupplierPerformance = {
  supplierId: string;
  supplierName: string;
  brand: string;
  totalSamples: number;
  tastingsCount: number;
  ordersCount: number;
  conversionRate: number;
  revenueGenerated: number;
  averageDaysToOrder: number;
  topProduct?: {
    name: string;
    samples: number;
    orders: number;
  };
};

export default function SupplierPerformancePage() {
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<keyof SupplierPerformance>("totalSamples");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    loadSupplierPerformance();
  }, []);

  const loadSupplierPerformance = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sales/samples/supplier-performance");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      }
    } catch (error) {
      console.error("Error loading supplier performance:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof SupplierPerformance) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const modifier = sortDirection === "asc" ? 1 : -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * modifier;
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * modifier;
    }
    return 0;
  });

  const exportToCSV = () => {
    const headers = [
      "Supplier",
      "Brand",
      "Total Samples",
      "Tastings",
      "Orders",
      "Conversion Rate",
      "Revenue Generated",
      "Avg Days to Order",
    ];

    const rows = sortedSuppliers.map((s) => [
      s.supplierName,
      s.brand,
      s.totalSamples,
      s.tastingsCount,
      s.ordersCount,
      `${s.conversionRate.toFixed(1)}%`,
      s.revenueGenerated.toFixed(2),
      s.averageDaysToOrder.toFixed(1),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier-performance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totals = suppliers.reduce(
    (acc, s) => ({
      samples: acc.samples + s.totalSamples,
      orders: acc.orders + s.ordersCount,
      revenue: acc.revenue + s.revenueGenerated,
    }),
    { samples: 0, orders: 0, revenue: 0 }
  );

  const overallConversion = totals.samples > 0 ? (totals.orders / totals.samples) * 100 : 0;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <Link
          href="/sales/samples"
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Samples
        </Link>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <button
            onClick={exportToCSV}
            disabled={suppliers.length === 0}
            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <p className="text-xs uppercase tracking-widest text-gray-500">Total Samples</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{totals.samples}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <p className="text-xs uppercase tracking-widest text-gray-500">Orders</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{totals.orders}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gray-500">Overall Conversion</p>
          <p className="mt-2 text-2xl font-semibold text-blue-600">
            {overallConversion.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gray-500">Revenue Generated</p>
          <p className="mt-2 text-2xl font-semibold text-green-600">
            {formatCurrency(totals.revenue)}
          </p>
        </div>
      </div>

      {/* Supplier Performance Table */}
      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading supplier performance...</p>
          </div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-sm font-medium text-gray-700">No sample data available</p>
          <p className="mt-1 text-sm text-gray-500">
            Start logging samples to see supplier performance
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("supplierName")}
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                    >
                      Supplier
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort("brand")}
                      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                    >
                      Brand
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort("totalSamples")}
                      className="flex items-center justify-end gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                    >
                      Samples Given
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort("tastingsCount")}
                      className="flex items-center justify-end gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                    >
                      Tastings
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort("ordersCount")}
                      className="flex items-center justify-end gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                    >
                      Orders
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort("conversionRate")}
                      className="flex items-center justify-end gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                    >
                      Conversion %
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort("revenueGenerated")}
                      className="flex items-center justify-end gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                    >
                      Revenue
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleSort("averageDaysToOrder")}
                      className="flex items-center justify-end gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                    >
                      Avg Days
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sortedSuppliers.map((supplier) => (
                  <tr key={supplier.supplierId} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {supplier.supplierName}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{supplier.brand}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {supplier.totalSamples}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {supplier.tastingsCount}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      {supplier.ordersCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          supplier.conversionRate >= 50
                            ? "bg-green-100 text-green-800"
                            : supplier.conversionRate >= 25
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {supplier.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(supplier.revenueGenerated)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {supplier.averageDaysToOrder > 0
                        ? `${supplier.averageDaysToOrder.toFixed(0)}d`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="text-sm font-semibold text-blue-900">About This Report</h3>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-600">•</span>
            <span>
              <strong>Conversion Rate:</strong> Percentage of samples that resulted in orders
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-600">•</span>
            <span>
              <strong>Revenue Generated:</strong> Total revenue from orders linked to samples
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-600">•</span>
            <span>
              <strong>Avg Days:</strong> Average time from sample to order (for converted samples)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-blue-600">•</span>
            <span>
              <strong>Export:</strong> Use the CSV export to share performance data with suppliers
            </span>
          </li>
        </ul>
      </div>
    </main>
  );
}
