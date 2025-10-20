'use client';

import Link from "next/link";
import type { CustomerRiskStatus } from "@prisma/client";
import CustomerHealthBadge from "./CustomerHealthBadge";

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
  if (loading) {
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

  const getNextOrderStatus = (customer: Customer) => {
    if (!customer.nextExpectedOrderDate) return null;

    const now = new Date();
    const expected = new Date(customer.nextExpectedOrderDate);
    const daysUntil = Math.floor((expected.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < -7) {
      return { text: `${Math.abs(daysUntil)} days overdue`, color: "text-rose-600 font-semibold" };
    } else if (daysUntil < 0) {
      return { text: `${Math.abs(daysUntil)} days overdue`, color: "text-orange-600 font-semibold" };
    } else if (daysUntil <= 7) {
      return { text: `Due in ${daysUntil} days`, color: "text-blue-600 font-semibold" };
    } else {
      return { text: `${daysUntil} days`, color: "text-gray-600" };
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  type="button"
                  onClick={() => onSort("name")}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                >
                  Customer
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Status
                </span>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  type="button"
                  onClick={() => onSort("lastOrderDate")}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                >
                  Last Order
                  <SortIcon field="lastOrderDate" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  type="button"
                  onClick={() => onSort("nextExpectedOrderDate")}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                >
                  Next Expected
                  <SortIcon field="nextExpectedOrderDate" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  type="button"
                  onClick={() => onSort("revenue")}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-600 transition hover:text-gray-900"
                >
                  Revenue (90d)
                  <SortIcon field="revenue" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Orders (90d)
                </span>
              </th>
              <th className="px-4 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {customers.map((customer) => {
              const nextOrderStatus = getNextOrderStatus(customer);

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
                    {formatCurrency(customer.recentRevenue)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {customer.recentOrderCount > 0 ? customer.recentOrderCount : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/sales/customers/${customer.id}`}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
