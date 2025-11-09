'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Package, DollarSign, Users } from 'lucide-react';

type TopProduct = {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  totalRevenue: number;
  totalCases: number;
  uniqueCustomers: number;
  percentOfTotal: number;
};

type TopProductsData = {
  products: TopProduct[];
  totalRevenue: number;
  periodStart: string;
  periodEnd: string;
};

export default function TopProducts() {
  const [data, setData] = useState<TopProductsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<TopProduct | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch('/api/sales/dashboard/top-products', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to load top products');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void loadData();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <p className="text-sm text-red-700">Unable to load top products: {error}</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Top Products by Revenue</h3>
        </div>
        <p className="text-xs text-slate-500">
          Double down on what’s moving now so you can mention the right products in every call.
        </p>
        <div className="text-right">
          <p className="text-xs text-gray-500">This Month</p>
          <p className="text-sm font-semibold text-gray-900">
            {new Date(data.periodStart).toLocaleDateString()} - {new Date(data.periodEnd).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {data.products.slice(0, isExpanded ? data.products.length : 3).map((product, index) => (
          <button
            key={product.skuId}
            onClick={() => setSelectedProduct(product)}
            className="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <span className="font-semibold">#{index + 1}</span>
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="truncate font-semibold text-gray-900">{product.productName}</h4>
                <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                  <span>SKU: {product.skuCode}</span>
                  {product.brand && <span>{product.brand}</span>}
                </div>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <DollarSign className="h-3 w-3" />
                    <p className="text-xs">Revenue</p>
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(product.totalRevenue)}</p>
                  <p className="text-xs text-gray-500">{product.percentOfTotal.toFixed(1)}%</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Package className="h-3 w-3" />
                    <p className="text-xs">Cases</p>
                  </div>
                  <p className="font-semibold text-gray-900">{product.totalCases}</p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Users className="h-3 w-3" />
                    <p className="text-xs">Customers</p>
                  </div>
                  <p className="font-semibold text-gray-900">{product.uniqueCustomers}</p>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-blue-600 transition-all"
                style={{ width: `${product.percentOfTotal}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Show More / Show Less Button */}
      {data.products.length > 3 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
          >
            {isExpanded ? '▲ Show Less' : `▼ Show ${data.products.length - 3} More`}
          </button>
        </div>
      )}

      {data.products.length === 0 && (
        <div className="py-12 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">No product sales this month</p>
        </div>
      )}

      {/* Product detail modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="max-w-2xl rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900">{selectedProduct.productName}</h3>
            <p className="mt-1 text-sm text-gray-500">SKU: {selectedProduct.skuCode}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Revenue</p>
                <p className="mt-2 text-2xl font-bold text-blue-900">
                  {formatCurrency(selectedProduct.totalRevenue)}
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  {selectedProduct.percentOfTotal.toFixed(1)}% of weekly total
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Cases Sold</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{selectedProduct.totalCases}</p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">Customers</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{selectedProduct.uniqueCustomers}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedProduct(null)}
              className="mt-6 w-full rounded-lg bg-gray-900 px-4 py-2 font-semibold text-white hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
