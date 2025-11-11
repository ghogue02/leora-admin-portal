'use client';

import { useCallback, useEffect, useState } from "react";
import type { ActivityOutcomeValue } from "@/constants/activityOutcomes";
import ActivityForm, { type ActivityFormData } from "./sections/ActivityForm";
import ActivityList from "./sections/ActivityList";

type ActivityType = {
  code: string;
  name: string;
};

type Customer = {
  id: string;
  name: string;
  accountNumber: string | null;
};

type Activity = {
  id: string;
  subject: string;
  notes: string | null;
  occurredAt: string;
  followUpAt: string | null;
  outcomes: ActivityOutcomeValue[];
  outcome?: string | null;
  createdAt: string;
  activityType: {
    id: string;
    name: string;
    code: string;
  };
  customer: {
    id: string;
    name: string;
    accountNumber: string | null;
  } | null;
  order: {
    id: string;
    orderedAt: string | null;
    total: number;
    status: string;
  } | null;
};

type ActivitiesResponse = {
  activities: Activity[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  summary: {
    totalActivities: number;
    activitiesWithOrders: number;
    conversionRate: number;
    typeCounts: Record<string, number>;
  };
};

type SortField = "occurredAt" | "customer" | "type";
type SortDirection = "asc" | "desc";

export default function SalesActivitiesPage() {
  const [data, setData] = useState<ActivitiesResponse | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filters and search
  const [typeFilter, setTypeFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("occurredAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // Load activity types and customers on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load activity types
        const typesResponse = await fetch("/api/sales/activity-types");
        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          setActivityTypes(typesData.activityTypes || []);
        }

        // Load customers
        const customersResponse = await fetch("/api/sales/customers?pageSize=1000");
        if (customersResponse.ok) {
          const customersData = await customersResponse.json();
          setCustomers(customersData.customers || []);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    };

    void loadInitialData();
  }, []);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      // Apply search
      if (searchQuery) {
        params.set("search", searchQuery);
      }

      // Apply type filter
      if (typeFilter) {
        params.set("type", typeFilter);
      }

      // Apply customer filter
      if (customerFilter) {
        params.set("customer", customerFilter);
      }

      // Apply sorting
      params.set("sortField", sortField);
      params.set("sortDirection", sortDirection);
      params.set("page", currentPage.toString());
      params.set("pageSize", "50");

      const response = await fetch(`/api/sales/activities?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Unable to load activities.");
      }

      const payload = (await response.json()) as ActivitiesResponse;
      setData(payload);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load activities.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, typeFilter, customerFilter, sortField, sortDirection, currentPage]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const handleLogActivity = async (formData: ActivityFormData) => {
    try {
      const response = await fetch("/api/sales/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to log activity");
      }

      // Reload activities
      await loadActivities();

      // Close form
      setShowForm(false);
    } catch (error) {
      throw error; // Re-throw to let form handle the error
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with default descending for dates, ascending for others
      setSortField(field);
      setSortDirection(field === "occurredAt" ? "desc" : "asc");
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
      <header className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {showForm ? "Hide Form" : "Log Activity"}
        </button>
      </header>

      {/* Summary Stats */}
      {data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-gray-500">Total Activities</p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{data.summary.totalActivities}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-gray-500">Activities with Orders</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-600">
              {data.summary.activitiesWithOrders}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-widest text-gray-500">Conversion Rate</p>
            <p className="mt-2 text-2xl font-semibold text-blue-600">{data.summary.conversionRate}%</p>
          </div>
        </div>
      )}

      {/* Activity Form */}
      {showForm && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Log New Activity</h2>
          <p className="mt-1 text-sm text-gray-600">
            Record a customer interaction and track its outcome.
          </p>
          <div className="mt-6">
            <ActivityForm
              activityTypes={activityTypes}
              onSubmit={handleLogActivity}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div>
        <label htmlFor="search" className="block text-sm font-semibold text-gray-700">
          Search Activities
        </label>
        <input
          type="text"
          id="search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by subject or notes..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p className="font-semibold">We couldn&apos;t load activities right now.</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => void loadActivities()}
            className="mt-4 inline-flex items-center rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Activities List */}
      {!error && (
        <>
          <ActivityList
            activities={data?.activities ?? []}
            activityTypes={activityTypes}
            customers={customers}
            typeFilter={typeFilter}
            customerFilter={customerFilter}
            sortField={sortField}
            sortDirection={sortDirection}
            onTypeFilterChange={(type) => {
              setTypeFilter(type);
              setCurrentPage(1);
            }}
            onCustomerFilterChange={(customerId) => {
              setCustomerFilter(customerId);
              setCurrentPage(1);
            }}
            onSort={handleSort}
            loading={loading}
          />

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-6 py-4 shadow-sm">
              <div className="text-sm text-gray-600">
                Showing page {data.pagination.page} of {data.pagination.totalPages} (
                {data.pagination.totalCount} total activities)
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
