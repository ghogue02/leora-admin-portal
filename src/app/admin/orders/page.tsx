"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Order = {
  id: string;
  orderedAt: string | null;
  status: string;
  total: number;
  currency: string;
  deliveryWeek: number | null;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
  };
  salesRep: {
    id: string;
    name: string;
    territory: string;
  } | null;
  invoice: {
    id: string;
    status: string;
    invoiceNumber: string | null;
    total: number;
    dueDate: string | null;
  } | null;
};

type Filters = {
  status: string[];
  invoiceStatus: string[];
  dateFrom: string;
  dateTo: string;
  salesRepId: string;
  customerSearch: string;
  minAmount: string;
  maxAmount: string;
};

const ORDER_STATUSES = ["DRAFT", "SUBMITTED", "FULFILLED", "CANCELLED", "PARTIALLY_FULFILLED"];
const INVOICE_STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"];

export default function OrdersListPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [sortBy, setSortBy] = useState("orderedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Filters>({
    status: [],
    invoiceStatus: [],
    dateFrom: "",
    dateTo: "",
    salesRepId: "",
    customerSearch: "",
    minAmount: "",
    maxAmount: "",
  });
  const [salesReps, setSalesReps] = useState<any[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSalesReps();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, sortBy, sortOrder, filters]);

  const fetchSalesReps = async () => {
    try {
      const response = await fetch("/api/admin/sales-reps");
      const data = await response.json();
      setSalesReps(data.reps || []);
    } catch (error) {
      console.error("Failed to fetch sales reps:", error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
      });

      if (filters.status.length > 0) {
        params.set("status", filters.status.join(","));
      }
      if (filters.invoiceStatus.length > 0) {
        params.set("invoiceStatus", filters.invoiceStatus.join(","));
      }
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (filters.salesRepId) params.set("salesRepId", filters.salesRepId);
      if (filters.customerSearch) params.set("customerSearch", filters.customerSearch);
      if (filters.minAmount) params.set("minAmount", filters.minAmount);
      if (filters.maxAmount) params.set("maxAmount", filters.maxAmount);

      const response = await fetch(`/api/admin/orders?${params}`);
      const data = await response.json();

      setOrders(data.orders || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterToggle = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleInvoiceStatusFilterToggle = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      invoiceStatus: prev.invoiceStatus.includes(status)
        ? prev.invoiceStatus.filter((s) => s !== status)
        : [...prev.invoiceStatus, status],
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map((o) => o.id)));
    }
  };

  const handleBulkAction = async (action: "cancel" | "fulfill") => {
    if (selectedOrders.size === 0) {
      alert("Please select orders first");
      return;
    }

    if (!confirm(`Are you sure you want to ${action} ${selectedOrders.size} orders?`)) {
      return;
    }

    try {
      const promises = Array.from(selectedOrders).map(async (orderId) => {
        if (action === "cancel") {
          return fetch(`/api/admin/orders/${orderId}/cancel`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "Bulk cancellation" }),
          });
        } else {
          return fetch(`/api/admin/orders/${orderId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "FULFILLED" }),
          });
        }
      });

      await Promise.all(promises);
      setSelectedOrders(new Set());
      fetchOrders();
    } catch (error) {
      console.error("Bulk action failed:", error);
      alert("Bulk action failed. Please try again.");
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "SUBMITTED":
        return "bg-blue-100 text-blue-800";
      case "FULFILLED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "PARTIALLY_FULFILLED":
        return "bg-yellow-100 text-yellow-800";
      case "PAID":
        return "bg-green-100 text-green-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      case "SENT":
        return "bg-blue-100 text-blue-800";
      case "VOID":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
            <p className="mt-2 text-gray-600">Manage and track customer orders</p>
          </div>
          <Link
            href="/admin/orders/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Order
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Customer Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Search
              </label>
              <input
                type="text"
                value={filters.customerSearch}
                onChange={(e) => handleFilterChange("customerSearch", e.target.value)}
                placeholder="Search by customer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Sales Rep */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sales Representative
              </label>
              <select
                value={filters.salesRepId}
                onChange={(e) => handleFilterChange("salesRepId", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">All Sales Reps</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.user.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Min Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Amount
              </label>
              <input
                type="number"
                value={filters.minAmount}
                onChange={(e) => handleFilterChange("minAmount", e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Amount
              </label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => handleFilterChange("maxAmount", e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Order Status Filters */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Status
            </label>
            <div className="flex flex-wrap gap-2">
              {ORDER_STATUSES.map((status) => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={() => handleStatusFilterToggle(status)}
                    className="mr-2"
                  />
                  <span className="text-sm">{status.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Invoice Status Filters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Status
            </label>
            <div className="flex flex-wrap gap-2">
              {INVOICE_STATUSES.map((status) => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.invoiceStatus.includes(status)}
                    onChange={() => handleInvoiceStatusFilterToggle(status)}
                    className="mr-2"
                  />
                  <span className="text-sm">{status}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-900 font-medium">
                {selectedOrders.size} orders selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction("fulfill")}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Mark as Fulfilled
                </button>
                <button
                  onClick={() => handleBulkAction("cancel")}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Cancel Orders
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.size === orders.length && orders.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("id")}
                  >
                    Order ID
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("customer")}
                  >
                    Customer
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("orderedAt")}
                  >
                    Order Date
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("total")}
                  >
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Rep
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("updatedAt")}
                  >
                    Last Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                        >
                          {order.id.substring(0, 8)}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/sales/customers/${order.customer.id}`}
                          className="text-gray-900 hover:text-blue-600"
                        >
                          {order.customer.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.orderedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(order.total, order.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                            order.status
                          )}`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {order.invoice ? (
                          <span
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(
                              order.invoice.status
                            )}`}
                          >
                            {order.invoice.status}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">No Invoice</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.salesRep?.name || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && orders.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{" "}
                    <span className="font-medium">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{" "}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav
                    className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.max(1, prev.page - 1),
                        }))
                      }
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: Math.min(prev.totalPages, prev.page + 1),
                        }))
                      }
                      disabled={pagination.page === pagination.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
