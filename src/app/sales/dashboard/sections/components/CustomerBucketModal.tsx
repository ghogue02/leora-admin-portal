'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CustomerReportRow } from "@/types/sales-dashboard";
import QuickTaskModal from "./QuickTaskModal";

type CustomerBucketModalProps = {
  open: boolean;
  title: string;
  description?: string;
  customers: CustomerReportRow[];
  onClose: () => void;
};

export default function CustomerBucketModal({
  open,
  title,
  description,
  customers,
  onClose,
}: CustomerBucketModalProps) {
  const [taskCustomer, setTaskCustomer] = useState<{ id: string; name: string } | null>(null);

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => a.name.localeCompare(b.name));
  }, [customers]);

  const exportCsv = () => {
    if (!sortedCustomers.length) return;

    const headers = [
      "Name",
      "Account Type",
      "Last Order Date",
      "Days Since Order",
      "Last Activity",
      "Days Since Activity",
    ];

    const rows = sortedCustomers.map((customer) => [
      safeValue(customer.name),
      safeValue(customer.accountType),
      safeValue(customer.lastOrderDate),
      safeValue(customer.daysSinceLastOrder),
      safeValue(customer.lastActivityAt),
      safeValue(customer.daysSinceLastActivity),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">Customer Drilldown</p>
              <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
              {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
              <p className="mt-2 text-xs text-gray-400">{sortedCustomers.length} customers</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={exportCsv}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-slate-300"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {sortedCustomers.length === 0 ? (
            <p className="text-sm text-gray-500">No customers in this bucket yet.</p>
          ) : (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Customer</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Account Type</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Last Order</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">Last Activity</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedCustomers.map((customer) => (
                  <tr key={customer.customerId}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{customer.name}</div>
                      <p className="text-xs text-gray-500">
                        {customer.lastOrderDate
                          ? `Ordered ${formatRelativeDays(customer.daysSinceLastOrder)}`
                          : "No orders yet"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{customer.accountType ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.daysSinceLastOrder !== null
                        ? `${customer.daysSinceLastOrder}d ago`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {customer.daysSinceLastActivity !== null
                        ? `${customer.daysSinceLastActivity}d ago`
                        : "No activity"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setTaskCustomer({ id: customer.customerId, name: customer.name })
                          }
                          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-slate-300"
                        >
                          Create To-Do
                        </button>
                        <Link
                          href={`/sales/customers/${customer.customerId}`}
                          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-slate-300"
                        >
                          Open
                        </Link>
                        <Link
                          href={`/admin/customers/${customer.customerId}`}
                          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-slate-300"
                        >
                          Reassign
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {taskCustomer ? (
        <QuickTaskModal
          customerId={taskCustomer.id}
          customerName={taskCustomer.name}
          onClose={() => setTaskCustomer(null)}
        />
      ) : null}
    </div>
  );
}

function safeValue(value: unknown) {
  if (value === null || typeof value === "undefined") {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function formatRelativeDays(days: number | null) {
  if (days === null) return "N/A";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}
