'use client';

import { useCallback, useEffect, useState } from "react";
import type { CustomerRiskStatus } from "@prisma/client";
import CustomerTable from "./sections/CustomerTable";
import CustomerFilters from "./sections/CustomerFilters";
import CustomerSearchBar from "./sections/CustomerSearchBar";

type Customer = {
  id: string;
  name: string;
  accountNumber: string | null;
  billingEmail: string | null;
  riskStatus: CustomerRiskStatus;
  lastOrderDate: string | null;
  nextExpectedOrderDate: string | null;
  averageOrderIntervalDays: number | null;
  establishedRevenue: number | null;
  dormancySince: string | null;
  location: string | null;
  recentRevenue: number;
  recentOrderCount: number;
  daysOverdue: number;
  isDueToOrder: boolean;
};

type CustomersResponse = {
  customers: Customer[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  summary: {
    totalCustomers: number;
    totalRevenue: number;
    customersDue: number;
    riskCounts: Record<string, number>;
  };
};

type SortField = "name" | "lastOrderDate" | "nextExpectedOrderDate" | "revenue";
type SortDirection = "asc" | "desc";

export default function SalesCustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [activeFilter, setActiveFilter] = useState<CustomerRiskStatus | "ALL" | "DUE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Apply search
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      // Apply risk filter
      if (activeFilter !== "ALL" && activeFilter !== "DUE") {
        params.set("risk", activeFilter);
      }

      // Apply sorting
      params.set("sortField", sortField);
      params.set("sortDirection", sortDirection);
      params.set("page", currentPage.toString());
      params.set("pageSize", "50");

      const response = await fetch(`/api/sales/customers?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to load customers.");
      }

      const payload = (await response.json()) as CustomersResponse;

      // If filter is "DUE", filter client-side for customers due to order
      if (activeFilter === "DUE") {
        const filteredCustomers = payload.customers.filter((c) => c.isDueToOrder);
        setData({
          ...payload,
          customers: filteredCustomers,
        });
      } else {
        setData(payload);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load customers.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, sortField, sortDirection, currentPage]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const handleFilterChange = (filter: CustomerRiskStatus | "ALL" | "DUE") => {
    setActiveFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page when searching
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with default ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">Customers</p>
        <h1 className="text-3xl font-semibold text-gray-900">My Customers</h1>
        <p className="max-w-2xl text-sm text-gray-600">
          View and manage customers in your territory. Track health status, ordering patterns, and revenue.
        </p>
      </header>

      {/* Summary Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-gray-500">Total Customers</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{data.summary.totalCustomers}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-gray-500">Total Revenue (Est.)</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">
              {formatCurrency(data.summary.totalRevenue)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-gray-500">Due to Order</p>
            <p className="mt-2 text-2xl font-semibold text-blue-600">{data.summary.customersDue}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <CustomerSearchBar onSearch={handleSearch} initialValue={searchQuery} />

        {data && (
          <CustomerFilters
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
            riskCounts={data.summary.riskCounts}
            customersDueCount={data.summary.customersDue}
          />
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-semibold">We couldn&apos;t load customers right now.</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void loadCustomers()}
            className="mt-4 inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Customer Table */}
      {!error && (
        <>
          <CustomerTable
            customers={data?.customers ?? []}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            loading={loading}
          />

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <div className="text-sm text-gray-600">
                Showing page {data.pagination.page} of {data.pagination.totalPages} (
                {data.pagination.totalCount} total customers)
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(data.pagination.totalPages, prev + 1))
                  }
                  disabled={currentPage === data.pagination.totalPages}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
