'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CustomerRiskStatus } from "@prisma/client";
import CustomerHealthBadge from "./CustomerHealthBadge";
import QuickSampleModal from "../components/QuickSampleModal";
import { Package, NotebookPen, CalendarClock } from "lucide-react";

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
  lifetimeRevenue: number;
  recentRevenue: number;
  ytdRevenue: number;
  recentOrderCount: number;
  daysOverdue: number;
  daysUntilExpected: number | null;
  isDueToOrder: boolean;
};

type SortField = "name" | "lastOrderDate" | "nextExpectedOrderDate" | "revenue";
type SortDirection = "asc" | "desc";

type CustomerTableProps = {
  customers: Customer[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  loading?: boolean;
};

export default function CustomerTable({
  customers,
  sortField,
  sortDirection,
  onSort,
  loading = false,
}: CustomerTableProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string } | null>(null);
  const badgeCache = useMemo(() => new Map<string, Array<{ label: string; className: string }>>(), []);

  const getHealthBadges = (customer: Customer) => {
    if (badgeCache.has(customer.id)) {
      return badgeCache.get(customer.id)!;
    }

    const badges: Array<{ label: string; className: string }> = [];

    if (customer.daysOverdue > 0) {
      badges.push({
        label: `Overdue ${customer.daysOverdue}d`,
        className: "bg-rose-100 text-rose-700 border-rose-200",
      });
    } else if (
      customer.daysUntilExpected !== null &&
      customer.daysUntilExpected <= 7 &&
      customer.daysUntilExpected >= 0
    ) {
      badges.push({
        label: `Due in ${customer.daysUntilExpected}d`,
        className: "bg-amber-100 text-amber-700 border-amber-200",
      });
    } else if (customer.isDueToOrder) {
      badges.push({
        label: "Due this cycle",
        className: "bg-blue-100 text-blue-700 border-blue-200",
      });
    }

    if (customer.riskStatus === "AT_RISK_REVENUE" || customer.riskStatus === "AT_RISK_CADENCE") {
      badges.push({
        label: "At risk",
        className: "bg-orange-100 text-orange-700 border-orange-200",
      });
    }

    badgeCache.set(customer.id, badges);
    return badges;
  };

  const getAriaSort = (field: SortField): "none" | "ascending" | "descending" => {
    if (sortField !== field) {
      return "none";
    }
    return sortDirection === "asc" ? "ascending" : "descending";
  };

  if (loading && customers.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <div className="animate-pulse bg-white">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="border-b border-slate-200 p-4">
              <div className="h-4 w-1/3 rounded bg-slate-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
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
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="mt-4 text-sm font-medium text-gray-700">No customers found</p>
        <p className="mt-1 text-sm text-gray-500">
          Try adjusting your filters or search criteria
        </p>
      </div>
    );
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg
          className="h-3.5 w-3.5 text-gray-300"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 3l-3 3h6l-3-3zM10 17l3-3H7l3 3z" />
        </svg>
      );
    }

    return sortDirection === "asc" ? (
      <svg
        className="h-3.5 w-3.5 text-blue-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M10 4l-4 5h8l-4-5z" />
      </svg>
    ) : (
      <svg
        className="h-3.5 w-3.5 text-blue-600"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M10 16l4-5H6l4 5z" />
      </svg>
    );
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const pluralize = (value: number, unit: string) => {
    return `${value} ${unit}${value === 1 ? "" : "s"}`;
  };

  const getNextOrderStatus = (customer: Customer) => {
    if (customer.daysUntilExpected === null) return null;

    if (customer.daysUntilExpected < 0) {
      const overdueColor =
        customer.daysOverdue > 7 ? "text-rose-600 font-semibold" : "text-orange-600 font-semibold";
      return {
        text: `Overdue by ${pluralize(customer.daysOverdue, "day")}`,
        color: overdueColor,
      };
    }

    if (customer.daysUntilExpected === 0) {
      return { text: "Due today", color: "text-orange-600 font-semibold" };
    }

    if (customer.daysUntilExpected <= 7) {
      return {
        text: `Due in ${pluralize(customer.daysUntilExpected, "day")}`,
        color: "text-blue-600 font-semibold",
      };
    }

    return {
      text: `In ${pluralize(customer.daysUntilExpected, "day")}`,
      color: "text-gray-600",
    };
  };

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
        <div className="relative overflow-x-auto">
          <table
            className="min-w-full divide-y divide-slate-200 bg-white text-sm"
            aria-busy={loading ? "true" : "false"}
          >
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left" aria-sort={getAriaSort("name")}>
                  <button
                    type="button"
                    onClick={() => onSort("name")}
                    className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                      sortField === "name" ? "text-blue-700" : "text-gray-600 hover:text-gray-900"
                    }`}
                    aria-label={`Sort by customer name ${
                      sortField === "name" ? `(${sortDirection === "asc" ? "ascending" : "descending"})` : ""
                    }`}
                  >
                    Customer
                    <SortIcon field="name" />
                    {sortField === "name" && (
                      <span className="sr-only">
                        {sortDirection === "asc" ? "Sorted ascending" : "Sorted descending"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Status
                  </span>
                </th>
                <th className="px-4 py-3 text-left" aria-sort={getAriaSort("lastOrderDate")}>
                  <button
                    type="button"
                    onClick={() => onSort("lastOrderDate")}
                    className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                      sortField === "lastOrderDate"
                        ? "text-blue-700"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    aria-label={`Sort by last order date ${
                      sortField === "lastOrderDate"
                        ? `(${sortDirection === "asc" ? "ascending" : "descending"})`
                        : ""
                    }`}
                  >
                    Last Order
                    <SortIcon field="lastOrderDate" />
                    {sortField === "lastOrderDate" && (
                      <span className="sr-only">
                        {sortDirection === "asc" ? "Sorted ascending" : "Sorted descending"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left" aria-sort={getAriaSort("nextExpectedOrderDate")}>
                  <button
                    type="button"
                    onClick={() => onSort("nextExpectedOrderDate")}
                    className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                      sortField === "nextExpectedOrderDate"
                        ? "text-blue-700"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    aria-label={`Sort by next expected order ${
                      sortField === "nextExpectedOrderDate"
                        ? `(${sortDirection === "asc" ? "ascending" : "descending"})`
                        : ""
                    }`}
                  >
                    Next Expected
                    <SortIcon field="nextExpectedOrderDate" />
                    {sortField === "nextExpectedOrderDate" && (
                      <span className="sr-only">
                        {sortDirection === "asc" ? "Sorted ascending" : "Sorted descending"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left" aria-sort={getAriaSort("revenue")}>
                  <button
                    type="button"
                    onClick={() => onSort("revenue")}
                    className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                      sortField === "revenue"
                        ? "text-blue-700"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    aria-label={`Sort by year-to-date revenue ${
                      sortField === "revenue" ? `(${sortDirection === "asc" ? "ascending" : "descending"})` : ""
                    }`}
                  >
                    <abbr
                      title="Revenue delivered during the current calendar year."
                      className="no-underline decoration-transparent"
                    >
                      $ YTD Revenue (2025)
                    </abbr>
                    <SortIcon field="revenue" />
                    {sortField === "revenue" && (
                      <span className="sr-only">
                        {sortDirection === "asc" ? "Sorted ascending" : "Sorted descending"}
                      </span>
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Quick Actions
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {customers.map((customer) => {
                const nextOrderStatus = getNextOrderStatus(customer);
                const healthBadges = getHealthBadges(customer);

                return (
                  <tr key={customer.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <Link
                          href={`/sales/customers/${customer.id}`}
                          className="font-semibold text-gray-900 underline decoration-dotted underline-offset-4 transition hover:text-blue-600"
                        >
                          {customer.name}
                        </Link>
                        {customer.accountNumber && (
                          <span className="text-xs text-gray-500">#{customer.accountNumber}</span>
                        )}
                        {customer.location && (
                          <span className="text-xs text-gray-500">{customer.location}</span>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          <span>
                            90d: {formatCurrency(customer.recentRevenue)} • Orders:{" "}
                            {(customer.recentOrderCount ?? 0).toLocaleString()}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>Lifetime: {formatCurrency(customer.lifetimeRevenue)}</span>
                        </div>
                        {healthBadges.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {healthBadges.map((badge) => (
                              <span
                                key={`${customer.id}-${badge.label}`}
                                className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CustomerHealthBadge status={customer.riskStatus} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(customer.lastOrderDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-gray-700">{formatDate(customer.nextExpectedOrderDate)}</span>
                        {nextOrderStatus && (
                          <span className={`text-xs ${nextOrderStatus.color}`}>
                            {nextOrderStatus.text}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {formatCurrency(customer.ytdRevenue)}
                    </td>
                    <td
                      className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedCustomer({ id: customer.id, name: customer.name })}
                          className="inline-flex items-center gap-1 rounded-md border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 shadow-sm transition hover:bg-purple-100"
                          title="Quick sample assignment"
                        >
                          <Package className="h-3.5 w-3.5" aria-hidden="true" />
                          Sample
                        </button>
                        <Link
                          href={`/sales/activities/new?customerId=${customer.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                        >
                          <NotebookPen className="h-3.5 w-3.5" aria-hidden="true" />
                          Log Note
                        </Link>
                        <Link
                          href={`/sales/calendar?customerId=${customer.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100"
                        >
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                          Schedule
                        </Link>
                        <Link
                          href={`/sales/customers/${customer.id}`}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {loading && customers.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <svg
                className="h-6 w-6 animate-spin text-blue-600"
                viewBox="0 0 24 24"
                fill="none"
                role="status"
                aria-label="Loading filtered customer results"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Quick Sample Modal */}
      {selectedCustomer && (
        <QuickSampleModal
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          onClose={() => setSelectedCustomer(null)}
          onSuccess={() => {
            setSelectedCustomer(null);
            // Optionally trigger a refresh of the customer list
          }}
        />
      )}
    </>
  );
}
