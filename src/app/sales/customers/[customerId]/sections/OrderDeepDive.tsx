"use client";

import { useState } from "react";
import { Download } from "lucide-react";

type ProductBreakdown = {
  productId: string;
  productName: string;
  lastOrderDate: string;
  totalOrders: number;
  totalRevenue: number;
  averageFrequencyDays: number;
  ordersPerMonth: number;
};

type OrderDeepDiveProps = {
  customerId: string;
};

export default function OrderDeepDive({ customerId }: OrderDeepDiveProps) {
  const [products, setProducts] = useState<ProductBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof ProductBreakdown>("totalRevenue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Load product breakdown data
  useState(() => {
    async function loadData() {
      try {
        const response = await fetch(
          `/api/sales/customers/${customerId}/product-history?type=breakdown`
        );
        if (!response.ok) throw new Error("Failed to load product breakdown");
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  });

  const handleSort = (field: keyof ProductBreakdown) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    const direction = sortDirection === "asc" ? 1 : -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * direction;
    }
    if (typeof aVal === "string" && typeof bVal === "string") {
      return aVal.localeCompare(bVal) * direction;
    }
    return 0;
  });

  const exportToCSV = () => {
    const headers = [
      "Product",
      "Last Order Date",
      "Total Orders",
      "Total Revenue",
      "Avg Frequency (days)",
      "Orders/Month",
    ];

    const rows = sortedProducts.map((p) => [
      p.productName,
      new Date(p.lastOrderDate).toLocaleDateString(),
      p.totalOrders,
      p.totalRevenue.toFixed(2),
      p.averageFrequencyDays.toFixed(0),
      p.ordersPerMonth.toFixed(1),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-${customerId}-product-breakdown.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-200"></div>
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Order History Deep Dive</h2>
          <p className="mt-1 text-sm text-gray-600">
            Product-by-product ordering patterns and revenue breakdown
          </p>
        </div>
        <button
          type="button"
          onClick={exportToCSV}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Product Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("productName")}
              >
                Product {sortField === "productName" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("lastOrderDate")}
              >
                Last Order {sortField === "lastOrderDate" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("totalOrders")}
              >
                Total Orders {sortField === "totalOrders" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("totalRevenue")}
              >
                Total Revenue {sortField === "totalRevenue" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("averageFrequencyDays")}
              >
                Avg Frequency {sortField === "averageFrequencyDays" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                onClick={() => handleSort("ordersPerMonth")}
              >
                Orders/Month {sortField === "ordersPerMonth" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {sortedProducts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  No order history available
                </td>
              </tr>
            ) : (
              sortedProducts.map((product) => (
                <tr key={product.productId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {product.productName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(product.lastOrderDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    {product.totalOrders}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    ${product.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">
                    {product.averageFrequencyDays.toFixed(0)} days
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-600">
                    {product.ordersPerMonth.toFixed(1)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
