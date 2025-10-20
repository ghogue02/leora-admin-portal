'use client';

import Link from "next/link";
import type { ActivityOutcome, OrderStatus } from "@prisma/client";

type Activity = {
  id: string;
  subject: string;
  notes: string | null;
  occurredAt: string;
  followUpAt: string | null;
  outcome: ActivityOutcome | null;
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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getOutcomeBadge = (outcome: ActivityOutcome | null) => {
    if (!outcome) return null;

    const badges = {
      PENDING: { text: "Pending", color: "bg-gray-100 text-gray-700" },
      SUCCESS: { text: "Success", color: "bg-emerald-100 text-emerald-700" },
      FAILED: { text: "Failed", color: "bg-rose-100 text-rose-700" },
      NO_RESPONSE: { text: "No Response", color: "bg-amber-100 text-amber-700" },
    };

    const badge = badges[outcome];

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}
      >
        {badge.text}
      </span>
    );
  };

  const getActivityTypeIcon = (code: string) => {
    const icons: Record<string, string> = {
      "IN_PERSON_VISIT": "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      "TASTING_APPOINTMENT": "M9 3v1m6-1v1m4 4H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V10a2 2 0 00-2-2z",
      "EMAIL_FOLLOW_UP": "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      "PHONE_CALL": "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z",
      "TEXT_MESSAGE": "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
      "PUBLIC_TASTING_EVENT": "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    };

    return icons[code] || "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2";
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
                <tr key={activity.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d={getActivityTypeIcon(activity.activityType.code)}
                        />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">
                        {activity.activityType.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">{activity.subject}</span>
                      {activity.notes && (
                        <span className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {activity.notes}
                        </span>
                      )}
                      {activity.followUpAt && (
                        <span className="mt-1 text-xs text-blue-600">
                          Follow-up: {formatDateTime(activity.followUpAt)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {activity.customer ? (
                      <div className="flex flex-col">
                        <Link
                          href={`/sales/customers/${activity.customer.id}`}
                          className="font-semibold text-gray-900 underline decoration-dotted underline-offset-4 transition hover:text-blue-600"
                        >
                          {activity.customer.name}
                        </Link>
                        {activity.customer.accountNumber && (
                          <span className="text-xs text-gray-500">
                            #{activity.customer.accountNumber}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatDateTime(activity.occurredAt)}</td>
                  <td className="px-4 py-3">{getOutcomeBadge(activity.outcome)}</td>
                  <td className="px-4 py-3">
                    {activity.order ? (
                      <div className="flex flex-col">
                        <Link
                          href={`/sales/orders/${activity.order.id}`}
                          className="font-semibold text-emerald-600 underline decoration-dotted underline-offset-4 transition hover:text-emerald-700"
                        >
                          {formatCurrency(activity.order.total)}
                        </Link>
                        {activity.order.orderNumber && (
                          <span className="text-xs text-gray-500">
                            Order #{activity.order.orderNumber}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
