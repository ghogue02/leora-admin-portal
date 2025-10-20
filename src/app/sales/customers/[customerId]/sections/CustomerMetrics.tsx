'use client';

type CustomerMetricsProps = {
  metrics: {
    ytdRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    outstandingBalance: number;
  };
};

export default function CustomerMetrics({ metrics }: CustomerMetricsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const metricCards = [
    {
      label: "YTD Revenue",
      value: formatCurrency(metrics.ytdRevenue),
      description: "Total delivered orders this year",
      color: "border-blue-200 bg-blue-50 text-blue-900",
    },
    {
      label: "Total Orders",
      value: metrics.totalOrders.toString(),
      description: "Orders delivered YTD",
      color: "border-green-200 bg-green-50 text-green-900",
    },
    {
      label: "Avg Order Value",
      value: formatCurrency(metrics.avgOrderValue),
      description: "Average per order YTD",
      color: "border-purple-200 bg-purple-50 text-purple-900",
    },
    {
      label: "Outstanding Balance",
      value: formatCurrency(metrics.outstandingBalance),
      description: "Unpaid invoices",
      color:
        metrics.outstandingBalance > 0
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-slate-200 bg-slate-50 text-slate-900",
    },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Performance Metrics</h2>
      <p className="text-xs text-gray-500">Year-to-date customer performance</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-4 ${card.color}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
            <p className="mt-1 text-xs opacity-75">{card.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
