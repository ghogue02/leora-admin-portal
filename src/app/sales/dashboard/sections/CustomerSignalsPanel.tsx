import Link from "next/link";
import { Download } from "lucide-react";
import type { CustomerSignals, CustomerSignalClassification } from "@/types/sales-dashboard";

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
};

export default function CustomerSignalsPanel({ signals }: Props) {
  const order: CustomerSignalClassification[] = ["GROWING", "FLAT", "SHRINKING", "DORMANT"];

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
            <article key={classification} className="rounded-md border border-slate-100 bg-slate-50 p-4 shadow-sm">
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
                        <span className="truncate">{customer.name}</span>
                        <span className="text-gray-500">${customer.revenue.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
