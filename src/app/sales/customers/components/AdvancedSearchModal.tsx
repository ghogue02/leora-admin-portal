"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

type SearchFilters = {
  name?: string;
  city?: string;
  productPurchased?: string;
  minOrderValue?: number;
  maxOrderValue?: number;
  dateFrom?: string;
  dateTo?: string;
};

type AdvancedSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: SearchFilters) => void;
};

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  onSearch,
}: AdvancedSearchModalProps) {
  const [filters, setFilters] = useState<SearchFilters>({});
  const [recentSearches, setRecentSearches] = useState<SearchFilters[]>([]);

  if (!isOpen) return null;

  const handleSearch = () => {
    onSearch(filters);

    // Save to recent searches
    setRecentSearches((prev) => {
      const updated = [filters, ...prev.slice(0, 4)];
      localStorage.setItem("recentCustomerSearches", JSON.stringify(updated));
      return updated;
    });

    onClose();
  };

  const handleClear = () => {
    setFilters({});
  };

  const loadRecentSearch = (search: SearchFilters) => {
    setFilters(search);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Advanced Customer Search</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Form */}
        <div className="space-y-4 p-6">
          {/* Name Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Customer Name
            </label>
            <input
              type="text"
              value={filters.name || ""}
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              placeholder="Search by name..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Location Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              value={filters.city || ""}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              placeholder="Search by city..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Product Search */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Product Purchased
            </label>
            <input
              type="text"
              value={filters.productPurchased || ""}
              onChange={(e) => setFilters({ ...filters, productPurchased: e.target.value })}
              placeholder="Search by product name or SKU..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Order Value Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Min Order Value
              </label>
              <input
                type="number"
                value={filters.minOrderValue || ""}
                onChange={(e) => setFilters({ ...filters, minOrderValue: Number(e.target.value) })}
                placeholder="$0"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Max Order Value
              </label>
              <input
                type="number"
                value={filters.maxOrderValue || ""}
                onChange={(e) => setFilters({ ...filters, maxOrderValue: Number(e.target.value) })}
                placeholder="$10,000"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Recent Searches
              </label>
              <div className="space-y-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => loadRecentSearch(search)}
                    className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                  >
                    {Object.entries(search)
                      .filter(([_, value]) => value)
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(", ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
