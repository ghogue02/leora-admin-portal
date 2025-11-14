'use client';

import { ActivityCard } from "@/components/activities/ActivityCard";
import type { OrderStatus } from "@prisma/client";
import type { ActivityOutcomeValue } from "@/constants/activityOutcomes";

type Activity = {
  id: string;
  subject: string;
  notes: string | null;
  occurredAt: string;
  followUpAt: string | null;
  outcomes: ActivityOutcomeValue[];
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
    orderNumber: string | null;
    total: number;
    status: OrderStatus;
  } | null;
  samples: Array<{
    id: string;
    skuId: string;
    sampleListItemId: string | null;
    feedback: string;
    followUpNeeded: boolean;
    followUpCompletedAt: string | null;
    sku: {
      id: string;
      code: string;
      name: string | null;
      brand: string | null;
      unitOfMeasure: string | null;
      size: string | null;
    } | null;
  }>;
};

type ActivityType = {
  code: string;
  name: string;
};

type Customer = {
  id: string;
  name: string;
  accountNumber: string | null;
};

type SortField = "occurredAt" | "customer" | "type";
type SortDirection = "asc" | "desc";

type ActivityListProps = {
  activities: Activity[];
  activityTypes: ActivityType[];
  customers: Customer[];
  typeFilter: string;
  customerFilter: string;
  sortField: SortField;
  sortDirection: SortDirection;
  onTypeFilterChange: (type: string) => void;
  onCustomerFilterChange: (customerId: string) => void;
  onSort: (field: SortField) => void;
  loading?: boolean;
};

export default function ActivityList({
  activities,
  activityTypes,
  customers,
  typeFilter,
  customerFilter,
  sortField,
  sortDirection,
  onTypeFilterChange,
  onCustomerFilterChange,
  onSort,
  loading = false,
}: ActivityListProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <div className="animate-pulse bg-white">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border-b border-slate-200 p-4">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="mt-4 text-sm font-medium text-gray-700">No activities found</p>
        <p className="mt-1 text-sm text-gray-500">
          Log your first activity to start tracking customer interactions
        </p>
      </div>
    );
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection === "asc" ? (
      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="typeFilter" className="block text-sm font-semibold text-gray-700">
            Filter by Activity Type
          </label>
          <select
            id="typeFilter"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {activityTypes.map((type) => (
              <option key={type.code} value={type.code}>
                {type.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="customerFilter" className="block text-sm font-semibold text-gray-700">
            Filter by Customer
          </label>
          <select
            id="customerFilter"
            value={customerFilter}
            onChange={(e) => onCustomerFilterChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Customers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.accountNumber ? `(#${customer.accountNumber})` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activities Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => onSort("type")}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                  >
                    Activity Type
                    <SortIcon field="type" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Subject
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => onSort("customer")}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                  >
                    Customer
                    <SortIcon field="customer" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    type="button"
                    onClick={() => onSort("occurredAt")}
                    className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                  >
                    Date & Time
                    <SortIcon field="occurredAt" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Outcome
                  </span>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Order Result
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  variant="table"
                  showCustomer
                  showSamples
                  showRelatedOrder
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
