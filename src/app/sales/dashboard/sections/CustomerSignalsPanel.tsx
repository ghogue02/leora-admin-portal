"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";
import type {
  CustomerSignals,
  CustomerSignalClassification,
  CustomerReportRow,
} from "@/types/sales-dashboard";

const LABELS: Record<CustomerSignalClassification, { title: string; description: string }> = {
  GROWING: {
    title: "Growing",
    description: "90 day revenue trending 5%+ above baseline",
  },
  FLAT: {
    title: "Stable",
    description: "Within 5% of trailing average",
  },
  SHRINKING: {
    title: "Declining",
    description: "60 day revenue down more than 5%",
  },
  DORMANT: {
    title: "Dormant",
    description: "No orders in 45+ days (but < 24 months)",
  },
};

type Props = {
  signals: CustomerSignals;
  reportRows: CustomerReportRow[];
};

export default function CustomerSignalsPanel({ signals, reportRows }: Props) {
  const [activeClassification, setActiveClassification] = useState<CustomerSignalClassification | null>(null);

  const order: CustomerSignalClassification[] = ["GROWING", "FLAT", "SHRINKING", "DORMANT"];
  const selectedCustomers = useMemo(() => {
    if (!activeClassification) return [];
    return reportRows.filter((row) => row.classification === activeClassification);
  }, [activeClassification, reportRows]);
  const activeLabel = activeClassification ? LABELS[activeClassification]?.title ?? activeClassification : "";

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString();
  };

  const handleCardClick = (classification: CustomerSignalClassification) => {
    setActiveClassification(classification);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>, classification: CustomerSignalClassification) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick(classification);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Customer Signals</h2>
          <p className="text-xs text-gray-500">
            {signals.totals.active} active accounts / {signals.totals.assigned} assigned total
          </p>
        </div>
        <Link
          href="/api/sales/reports/customer-health?format=csv"
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-slate-300"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Link>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {order.map((classification) => {
          const bucket = signals.buckets[classification];
          const label = LABELS[classification];
          return (
            <article
              key={classification}
              role="button"
              tabIndex={0}
              onClick={() => handleCardClick(classification)}
              onKeyDown={(event) => handleKeyDown(event, classification)}
              className="rounded-md border border-slate-100 bg-slate-50 p-4 shadow-sm cursor-pointer transition hover:border-slate-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label.title}</p>
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-3xl font-semibold text-gray-900">{bucket.count}</p>
                <span className="text-xs text-gray-500">
                  {bucket.percentOfActive.toFixed(0)}% active / {bucket.percentOfAssigned.toFixed(0)}% assigned
                </span>
              </div>
              <p className="text-xs text-gray-500">{label.description}</p>
              <p className="mt-2 text-xs text-gray-400">
                Revenue share: {(bucket.revenueShare * 100).toFixed(1)}%
              </p>
              {bucket.topCustomers.length > 0 && (
                <div className="mt-3 text-xs text-gray-600">
                  <p className="font-medium text-gray-700">Top Accounts</p>
                  <ul className="mt-1 space-y-1">
                    {bucket.topCustomers.map((customer) => (
                      <li key={customer.id} className="flex justify-between">
                        <Link
                          href={`/sales/customers/${customer.id}`}
                          className="truncate text-blue-600 hover:text-blue-700"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {customer.name}
                        </Link>
                        <span className="text-gray-500">{formatCurrency(customer.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-3 text-xs font-semibold text-blue-600">View full list →</p>
            </article>
          );
        })}
      </div>

      {activeClassification && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setActiveClassification(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Customer Signals • {activeLabel}
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-gray-900">
                  {selectedCustomers.length} account{selectedCustomers.length === 1 ? "" : "s"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {LABELS[activeClassification].description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveClassification(null)}
                className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedCustomers.length === 0 ? (
              <div className="p-6 text-sm text-gray-500">
                No customers found for this signal classification.
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-6 py-3">TTM Revenue</th>
                      <th className="px-6 py-3">Avg. Monthly</th>
                      <th className="px-6 py-3">Last Order</th>
                      <th className="px-6 py-3">Days Since Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-gray-700">
                    {selectedCustomers.map((customer) => (
                      <tr key={customer.customerId} className="hover:bg-slate-50">
                        <td className="px-6 py-3">
                          <Link
                            href={`/sales/customers/${customer.customerId}`}
                            className="font-semibold text-blue-700 hover:text-blue-900"
                          >
                            {customer.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {customer.accountType ?? "Uncategorized"}
                          </p>
                        </td>
                        <td className="px-6 py-3 font-semibold">
                          {formatCurrency(customer.trailingTwelveRevenue ?? 0)}
                        </td>
                        <td className="px-6 py-3">{formatCurrency(customer.averageMonthlyRevenue ?? 0)}</td>
                        <td className="px-6 py-3">{formatDate(customer.lastOrderDate)}</td>
                        <td className="px-6 py-3">{customer.daysSinceLastOrder ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
