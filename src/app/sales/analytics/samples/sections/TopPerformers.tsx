'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ExternalLink } from 'lucide-react';

type Product = {
  id: string;
  productName: string;
  skuCode: string;
  brand: string;
  samplesGiven: number;
  orders: number;
  conversionRate: number;
  revenue: number;
};

type TopPerformersProps = {
  products: Product[];
};

type SortField = 'conversionRate' | 'revenue' | 'samplesGiven';

export default function TopPerformers({ products }: TopPerformersProps) {
  const [sortField, setSortField] = useState<SortField>('conversionRate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedProducts = [...products].sort((a, b) => {
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (a[sortField] - b[sortField]) * multiplier;
  });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Top Performing Products</h2>
          <p className="text-xs text-gray-500">Best converting samples</p>
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
          {products.length} Products
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <button
                    onClick={() => handleSort('samplesGiven')}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    Samples
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Orders
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <button
                    onClick={() => handleSort('conversionRate')}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    Conv. Rate
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <button
                    onClick={() => handleSort('revenue')}
                    className="flex items-center gap-1 hover:text-gray-900"
                  >
                    Revenue
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    No sample data available
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{product.productName}</p>
                        <p className="text-xs text-gray-500">
                          {product.brand} - {product.skuCode}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {product.samplesGiven}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {product.orders}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          product.conversionRate >= 0.3
                            ? 'bg-green-100 text-green-800'
                            : product.conversionRate >= 0.15
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {(product.conversionRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ${product.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/sales/catalog?sku=${product.skuCode}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {products.length > 5 && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Showing top {Math.min(products.length, 10)} products
          </p>
        </div>
      )}
    </section>
  );
}
