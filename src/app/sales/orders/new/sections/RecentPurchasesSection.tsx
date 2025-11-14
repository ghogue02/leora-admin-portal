/**
 * RecentPurchasesSection - Display and add recent customer purchases
 */

'use client';

import { formatCurrency, formatShortDate } from '@/lib/format';
import type { RecentPurchaseSuggestion } from '@/types/orders';

type RecentPurchasesSectionProps = {
  recentItems: RecentPurchaseSuggestion[];
  loading: boolean;
  error: string | null;
  orderSkuIds: Set<string>;
  onAddItem: (item: RecentPurchaseSuggestion) => void;
  onAddAllItems: () => void;
};

export function RecentPurchasesSection({
  recentItems,
  loading,
  error,
  orderSkuIds,
  onAddItem,
  onAddAllItems,
}: RecentPurchasesSectionProps) {
  return (
    <div>
      {/* Add All Button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        {recentItems.length > 0 && (
          <button
            type="button"
            onClick={onAddAllItems}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Add All Recent Items
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-lg border border-slate-100 p-4">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : recentItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-gray-600">
          No purchases in the last six months. Use the catalog below to build this order.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Last Order</th>
                <th className="px-4 py-3 text-left">Last Price</th>
                <th className="px-4 py-3 text-left">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {recentItems.map((item) => {
                const alreadyAdded = orderSkuIds.has(item.skuId);
                return (
                  <tr key={item.skuId}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-xs text-gray-500">{item.skuCode}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        Last quantity: {item.lastQuantity} • {item.timesOrdered} orders
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{formatShortDate(item.lastOrderedAt)}</div>
                      <div className="text-xs text-gray-500">
                        Order {item.lastOrderNumber ?? item.lastOrderId.slice(0, 8).toUpperCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(item.lastUnitPrice, 'USD')}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                            item.priceMatchesStandard
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.priceMatchesStandard ? 'Standard price' : 'Customer price'}
                        </span>
                        {item.standardPrice && !item.priceMatchesStandard && (
                          <span className="text-gray-500">Std {formatCurrency(item.standardPrice, 'USD')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onAddItem(item)}
                        disabled={alreadyAdded}
                        className="rounded-md border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 transition hover:border-gray-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {alreadyAdded ? 'Added' : 'Add'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
