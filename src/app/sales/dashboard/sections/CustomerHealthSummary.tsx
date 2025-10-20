'use client';

import Link from "next/link";

type CustomerHealthSummaryProps = {
  customerHealth: {
    healthy: number;
    atRiskCadence: number;
    atRiskRevenue: number;
    dormant: number;
    closed: number;
    total: number;
  };
};

export default function CustomerHealthSummary({ customerHealth }: CustomerHealthSummaryProps) {
  const healthCards = [
    {
      label: "Healthy",
      count: customerHealth.healthy,
      color: "border-green-200 bg-green-50 text-green-900",
      description: "On track with ordering cadence",
    },
    {
      label: "At Risk (Cadence)",
      count: customerHealth.atRiskCadence,
      color: "border-amber-200 bg-amber-50 text-amber-900",
      description: "Ordering frequency declining",
    },
    {
      label: "At Risk (Revenue)",
      count: customerHealth.atRiskRevenue,
      color: "border-orange-200 bg-orange-50 text-orange-900",
      description: "Revenue down 15%+",
    },
    {
      label: "Dormant",
      count: customerHealth.dormant,
      color: "border-rose-200 bg-rose-50 text-rose-900",
      description: "45+ days no order",
    },
  ];

  const atRiskTotal = customerHealth.atRiskCadence + customerHealth.atRiskRevenue + customerHealth.dormant;
  const healthyPercentage = customerHealth.total > 0
    ? (customerHealth.healthy / customerHealth.total) * 100
    : 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Customer Health Summary</h3>
          <p className="text-xs text-gray-500">
            Account status across your {customerHealth.total} active customers
          </p>
        </div>
        <Link
          href="/sales/customers"
          className="text-xs font-semibold text-gray-600 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
        >
          View all customers
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {healthCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-4 ${card.color}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">{card.count}</p>
            <p className="mt-1 text-xs opacity-75">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="font-semibold text-gray-900">Overall Health Score</p>
            <p className="text-xs text-gray-500">
              {customerHealth.healthy} healthy out of {customerHealth.total} total customers
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {healthyPercentage.toFixed(0)}%
            </p>
            <p className="text-xs text-gray-500">Healthy rate</p>
          </div>
        </div>

        {atRiskTotal > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">
              {atRiskTotal} customer{atRiskTotal === 1 ? "" : "s"} need{atRiskTotal === 1 ? "s" : ""} attention
            </p>
            <p className="mt-1 text-xs">
              Review at-risk and dormant accounts to prevent churn. Consider scheduling visits or tastings.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
