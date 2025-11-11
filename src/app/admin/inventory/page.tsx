"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Package,
  Edit,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { tryGetTenantChannelName } from "@/lib/realtime/channels";
import {
  INVENTORY_STOCK_CHANGED_EVENT,
  type InventoryStockChangedEvent,
} from "@/lib/realtime/events/inventory";

type InventoryStatus = "in_stock" | "low_stock" | "out_of_stock";

interface InventoryItem {
  skuId: string;
  skuCode: string;
  productName: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  inventoryLevel: number;
  status: InventoryStatus;
  isActive: boolean;
}

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export default function InventoryListPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryChannel, setInventoryChannel] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [statusFilters, setStatusFilters] = useState<InventoryStatus[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortBy, setSortBy] = useState("productName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);

  // Bulk actions
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Available options
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  const page = pagination.page;
  const limit = pagination.limit;

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(selectedCategory && { category: selectedCategory }),
        ...(selectedBrand && { brand: selectedBrand }),
        ...(statusFilters.length > 0 && { status: statusFilters.join(",") }),
        ...(includeInactive && { includeInactive: "true" }),
        ...(priceMin && { priceMin }),
        ...(priceMax && { priceMax }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/inventory?${params}`);
      if (!response.ok) throw new Error("Failed to fetch inventory");

      const data = await response.json();
      setItems(data.items);
      setPagination({
        page,
        limit,
        totalCount: data.pagination?.totalCount ?? 0,
        totalPages: data.pagination?.totalPages ?? 0,
      });
      setCategories(data.categories || []);
      setBrands(data.brands || []);
      setInventoryChannel(data.realtimeChannels?.inventory ?? null);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    search,
    selectedCategory,
    selectedBrand,
    statusFilters,
    includeInactive,
    priceMin,
    priceMax,
    sortBy,
    sortOrder,
  ]);

  useEffect(() => {
    void fetchInventory();
  }, [fetchInventory]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const tenantChannel = useMemo(
    () => tryGetTenantChannelName(inventoryChannel),
    [inventoryChannel],
  );

  useRealtimeChannel<InventoryStockChangedEvent>({
    channel: tenantChannel,
    event: INVENTORY_STOCK_CHANGED_EVENT,
    enabled: Boolean(tenantChannel),
    handler: () => {
      void fetchInventory();
    },
  });

  const handleStatusFilterToggle = (status: InventoryStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((item) => item.skuId)));
    }
  };

  const handleSelectItem = (skuId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(skuId)) {
      newSelected.delete(skuId);
    } else {
      newSelected.add(skuId);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkActivate = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Activate ${selectedItems.size} selected items?`)) return;

    try {
      const response = await fetch("/api/admin/inventory/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "activate",
          skuIds: Array.from(selectedItems),
        }),
      });

      if (!response.ok) throw new Error("Bulk activation failed");

      setSelectedItems(new Set());
      fetchInventory();
    } catch (error) {
      console.error("Error activating items:", error);
      alert("Failed to activate items");
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Deactivate ${selectedItems.size} selected items?`)) return;

    try {
      const response = await fetch("/api/admin/inventory/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deactivate",
          skuIds: Array.from(selectedItems),
        }),
      });

      if (!response.ok) throw new Error("Bulk deactivation failed");

      setSelectedItems(new Set());
      fetchInventory();
    } catch (error) {
      console.error("Error deactivating items:", error);
      alert("Failed to deactivate items");
    }
  };

  const getStatusBadge = (status: InventoryStatus, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
          <XCircle className="h-3 w-3" />
          Inactive
        </span>
      );
    }

    switch (status) {
      case "in_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            In Stock
          </span>
        );
      case "low_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
            <AlertCircle className="h-3 w-3" />
            Low Stock
          </span>
        );
      case "out_of_stock":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
            <XCircle className="h-3 w-3" />
            Out of Stock
          </span>
        );
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory & Products</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage product catalog, inventory levels, and pricing
          </p>
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
                  setPagination((prev) => ({ ...prev, page: 1 }));
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

        {/* Expandable Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Price Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => {
                    setPriceMin(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-gray-500">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => {
                    setPriceMax(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusFilters.includes("in_stock")}
                    onChange={() => handleStatusFilterToggle("in_stock")}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">In Stock</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusFilters.includes("low_stock")}
                    onChange={() => handleStatusFilterToggle("low_stock")}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Low Stock</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={statusFilters.includes("out_of_stock")}
                    onChange={() => handleStatusFilterToggle("out_of_stock")}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Out of Stock</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeInactive}
                    onChange={(e) => {
                      setIncludeInactive(e.target.checked);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Show Inactive</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkActivate}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Activate
              </button>
              <button
                onClick={handleBulkDeactivate}
                className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                Deactivate
              </button>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-gray-500">
            <Package className="mb-4 h-12 w-12 text-gray-400" />
            <p className="text-lg font-medium">No inventory items found</p>
            <p className="text-sm">Try adjusting your filters or search criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="w-12 px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === items.length && items.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th
                    scope="col"
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                    onClick={() => handleSort("skuCode")}
                  >
                    <div className="flex items-center gap-1">
                      SKU Code
                      <SortIcon field="skuCode" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                    onClick={() => handleSort("productName")}
                  >
                    <div className="flex items-center gap-1">
                      Product Name
                      <SortIcon field="productName" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                    onClick={() => handleSort("brand")}
                  >
                    <div className="flex items-center gap-1">
                      Brand
                      <SortIcon field="brand" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                    onClick={() => handleSort("category")}
                  >
                    <div className="flex items-center gap-1">
                      Category
                      <SortIcon field="category" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center gap-1">
                      Price
                      <SortIcon field="price" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                    onClick={() => handleSort("inventoryLevel")}
                  >
                    <div className="flex items-center gap-1">
                      Inventory
                      <SortIcon field="inventoryLevel" />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => (
                  <tr key={item.skuId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.skuId)}
                        onChange={() => handleSelectItem(item.skuId)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {item.skuCode}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.productName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {item.brand || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {item.category || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {item.price ? `$${item.price.toFixed(2)}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                      {item.inventoryLevel}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      {getStatusBadge(item.status, item.isActive)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => router.push(`/admin/inventory/${item.skuId}`)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    </td>
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
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
              {pagination.totalCount} results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
