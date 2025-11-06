'use client';

import { useState } from "react";

type TopProduct = {
  skuCode: string;
  productName: string;
  brand: string | null;
  totalCases: number;
  revenue: number;
  orderCount: number;
  lastOrderedAt: string | null;
};

type TopProductsProps = {
  topProducts: {
    byRevenue: TopProduct[];
    byCases: TopProduct[];
  };
};

export default function TopProducts({ topProducts }: TopProductsProps) {
  const [viewMode, setViewMode] = useState<"revenue" | "cases">("revenue");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (isoDate: string | null) => {
    if (!isoDate) {
      return "—";
    }
    try {
      const date = new Date(isoDate);
      if (Number.isNaN(date.getTime())) {
        return "—";
      }
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    } catch {
      return "—";
    }
  };

  const productsToShow =
    viewMode === "revenue" ? topProducts.byRevenue : topProducts.byCases;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Top Products</h2>
          <p className="text-xs text-gray-500">
            Best-selling products (last 6 months)
          </p>
        </div>

        <div className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => setViewMode("revenue")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "revenue"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            By Revenue
          </button>
          <button
            onClick={() => setViewMode("cases")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              viewMode === "cases"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            By Volume
          </button>
        </div>
      </div>

      {productsToShow.length === 0 ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-sm text-gray-500">No order history in the last 6 months</p>
        </div>
      ) : (
        <div className="mt-4">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Product
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Cases
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Orders
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Last Ordered
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {productsToShow.map((product, index) => (
                <tr key={product.skuCode} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-semibold text-gray-500">
                    #{index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-gray-900">
                        {product.productName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {product.brand} - {product.skuCode}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {product.totalCases}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {product.orderCount}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600">
                    {formatDate(product.lastOrderedAt)}
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
