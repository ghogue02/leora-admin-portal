"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, ChevronDown, ChevronUp, Save, X, DollarSign, Download } from "lucide-react";
import { toastSuccess, toastError, toastInfo } from "../../components/Toast";

interface PriceListInfo {
  id: string;
  name: string;
  currency: string;
}

interface SkuPricing {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  prices: {
    [priceListId: string]: {
      itemId: string | null;
      price: number | null;
      minQuantity: number;
      maxQuantity: number | null;
    };
  };
}

interface EditingState {
  skuId: string;
  priceListId: string;
  value: string;
}

export default function InventoryPricesPage() {
  const [items, setItems] = useState<SkuPricing[]>([]);
  const [priceLists, setPriceLists] = useState<PriceListInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // Separate input state for debouncing
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedPriceList, setSelectedPriceList] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  // Bulk operations
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set());
  const [bulkUpdatePercent, setBulkUpdatePercent] = useState("");
  const [bulkPriceList, setBulkPriceList] = useState("");
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.set("search", search);
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedBrand) params.set("brand", selectedBrand);
      if (selectedPriceList) params.set("priceListId", selectedPriceList);

      const response = await fetch(`/api/admin/inventory/prices?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch pricing data");

      const data = await response.json();
      setItems(data.items);
      setPriceLists(data.priceLists);
      setCategories(data.categories || []);
      setBrands(data.brands || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.totalCount || 0);
    } catch (error) {
      console.error("Error fetching pricing data:", error);
      toastError("Failed to load pricing data");
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedCategory, selectedBrand, selectedPriceList]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleEditStart = (skuId: string, priceListId: string, currentPrice: number | null) => {
    setEditing({
      skuId,
      priceListId,
      value: currentPrice !== null ? currentPrice.toString() : "",
    });
  };

  const handleEditCancel = () => {
    setEditing(null);
  };

  const handleEditChange = (value: string) => {
    if (editing) {
      setEditing({ ...editing, value });
    }
  };

  const handleSavePrice = async (skuId: string, priceListId: string) => {
    if (!editing || editing.skuId !== skuId || editing.priceListId !== priceListId) return;

    const price = parseFloat(editing.value);
    if (isNaN(price) || price < 0) {
      toastError("Invalid price", "Price must be a positive number");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/inventory/${skuId}/pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceListId,
          price,
          minQuantity: 1,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update price");
      }

      toastSuccess("Price updated successfully");
      setEditing(null);
      fetchData();
    } catch (error) {
      console.error("Error updating price:", error);
      toastError("Failed to update price", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedSkus.size === items.length) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(new Set(items.map((item) => item.skuId)));
    }
  };

  const handleSelectSku = (skuId: string) => {
    const newSelected = new Set(selectedSkus);
    if (newSelected.has(skuId)) {
      newSelected.delete(skuId);
    } else {
      newSelected.add(skuId);
    }
    setSelectedSkus(newSelected);
  };

  const handleBulkUpdate = async () => {
    if (selectedSkus.size === 0 || !bulkPriceList) {
      toastInfo("Please select SKUs and a price list");
      return;
    }

    const percent = parseFloat(bulkUpdatePercent);
    if (isNaN(percent)) {
      toastError("Invalid percentage", "Enter a valid number (e.g., 10 for +10%, -5 for -5%)");
      return;
    }

    if (!confirm(`Apply ${percent}% price change to ${selectedSkus.size} SKUs in the selected price list?`)) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/inventory/prices/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skuIds: Array.from(selectedSkus),
          priceListId: bulkPriceList,
          percentChange: percent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Bulk update failed");
      }

      const result = await response.json();
      toastSuccess("Bulk update completed", `Updated ${result.updated} prices`);
      setSelectedSkus(new Set());
      setBulkUpdatePercent("");
      setShowBulkModal(false);
      fetchData();
    } catch (error) {
      console.error("Error in bulk update:", error);
      toastError("Bulk update failed", error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: "csv",
      });

      if (search) params.set("search", search);
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedBrand) params.set("brand", selectedBrand);
      if (selectedPriceList) params.set("priceListId", selectedPriceList);

      const response = await fetch(`/api/admin/inventory/prices/export?${params.toString()}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-prices-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toastSuccess("Export completed");
    } catch (error) {
      console.error("Export error:", error);
      toastError("Export failed");
    }
  };

  const PriceCell = ({
    item,
    priceListId,
  }: {
    item: SkuPricing;
    priceListId: string;
  }) => {
    const priceData = item.prices[priceListId];
    const isEditing = editing?.skuId === item.skuId && editing?.priceListId === priceListId;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            min="0"
            value={editing.value}
            onChange={(e) => handleEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSavePrice(item.skuId, priceListId);
              } else if (e.key === "Escape") {
                handleEditCancel();
              }
            }}
            className="w-24 rounded border border-blue-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            disabled={saving}
          />
          <button
            onClick={() => handleSavePrice(item.skuId, priceListId)}
            disabled={saving}
            className="rounded bg-green-600 p-1 text-white hover:bg-green-700 disabled:opacity-50"
            title="Save"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            onClick={handleEditCancel}
            disabled={saving}
            className="rounded bg-gray-300 p-1 text-gray-700 hover:bg-gray-400 disabled:opacity-50"
            title="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => handleEditStart(item.skuId, priceListId, priceData?.price || null)}
        className="group flex items-center gap-1 text-sm hover:text-blue-600"
      >
        {priceData?.price !== null ? `$${priceData.price.toFixed(2)}` : "-"}
        <DollarSign className="h-3 w-3 opacity-0 group-hover:opacity-100" />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Pricing</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage prices across all price lists with inline editing
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedSkus.size > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <DollarSign className="h-4 w-4" />
              Bulk Update ({selectedSkus.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by SKU code or product name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Brand</label>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Price List</label>
              <select
                value={selectedPriceList}
                onChange={(e) => {
                  setSelectedPriceList(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">All Price Lists</option>
                {priceLists.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">Loading pricing data...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center text-gray-500">
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedSkus.size === items.length && items.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600"
                    />
                  </th>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-gray-50 px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    SKU
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Product
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Brand
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Category
                  </th>
                  {priceLists.map((priceList) => (
                    <th
                      key={priceList.id}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {priceList.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => (
                  <tr key={item.skuId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSkus.has(item.skuId)}
                        onChange={() => handleSelectSku(item.skuId)}
                        className="rounded border-gray-300 text-blue-600"
                      />
                    </td>
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-6 py-4 text-sm font-medium text-gray-900">
                      {item.skuCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.productName}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {item.brand || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {item.category || "-"}
                    </td>
                    {priceLists.map((priceList) => (
                      <td key={priceList.id} className="whitespace-nowrap px-6 py-4">
                        <PriceCell item={item} priceListId={priceList.id} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-3">
            <div className="text-sm text-gray-700">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of{" "}
              {totalCount} products
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowBulkModal(false)} />
            <div className="relative rounded-lg bg-white p-6 shadow-xl">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Bulk Price Update ({selectedSkus.size} SKUs)
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Price List</label>
                  <select
                    value={bulkPriceList}
                    onChange={(e) => setBulkPriceList(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select price list...</option>
                    {priceLists.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Percentage Change
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={bulkUpdatePercent}
                    onChange={(e) => setBulkUpdatePercent(e.target.value)}
                    placeholder="e.g., 10 for +10%, -5 for -5%"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Positive values increase prices, negative values decrease
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpdate}
                  disabled={saving || !bulkPriceList || !bulkUpdatePercent}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Apply Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
