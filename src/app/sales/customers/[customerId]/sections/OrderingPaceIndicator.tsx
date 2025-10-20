'use client';

import { format } from "date-fns";

type OrderingPaceIndicatorProps = {
  metrics: {
    lastOrderDate: string | null;
    nextExpectedOrderDate: string | null;
    averageOrderIntervalDays: number | null;
    daysSinceLastOrder: number | null;
    daysUntilExpected: number | null;
  };
};

export default function OrderingPaceIndicator({ metrics }: OrderingPaceIndicatorProps) {
  const getStatusColor = () => {
    if (!metrics.daysUntilExpected) return "border-slate-200 bg-slate-50";
    if (metrics.daysUntilExpected < 0) return "border-rose-200 bg-rose-50";
    if (metrics.daysUntilExpected <= 3) return "border-amber-200 bg-amber-50";
    return "border-green-200 bg-green-50";
  };

  const getStatusText = () => {
    if (!metrics.nextExpectedOrderDate) return "No ordering pattern established";
    if (!metrics.daysUntilExpected) return "Expected order date unknown";
    if (metrics.daysUntilExpected < 0)
      return `Overdue by ${Math.abs(metrics.daysUntilExpected)} days`;
    if (metrics.daysUntilExpected === 0) return "Expected to order today";
    if (metrics.daysUntilExpected <= 3)
      return `Due to order in ${metrics.daysUntilExpected} days`;
    return `Next order expected in ${metrics.daysUntilExpected} days`;
  };

  const getStatusTextColor = () => {
    if (!metrics.daysUntilExpected) return "text-slate-700";
    if (metrics.daysUntilExpected < 0) return "text-rose-700";
    if (metrics.daysUntilExpected <= 3) return "text-amber-700";
    return "text-green-700";
  };

  return (
    <section className={`rounded-lg border p-6 shadow-sm ${getStatusColor()}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
            Ordering Pace
          </h3>
          <p className={`mt-2 text-lg font-semibold ${getStatusTextColor()}`}>
            {getStatusText()}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium text-gray-600">Last Order</p>
          <p className="mt-1 font-semibold text-gray-900">
            {metrics.lastOrderDate
              ? format(new Date(metrics.lastOrderDate), "MMM d, yyyy")
              : "Never"}
          </p>
          {metrics.daysSinceLastOrder !== null && (
            <p className="text-xs text-gray-600">
              {metrics.daysSinceLastOrder} days ago
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600">Next Expected</p>
          <p className="mt-1 font-semibold text-gray-900">
            {metrics.nextExpectedOrderDate
              ? format(new Date(metrics.nextExpectedOrderDate), "MMM d, yyyy")
              : "Unknown"}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600">Avg Interval</p>
          <p className="mt-1 font-semibold text-gray-900">
            {metrics.averageOrderIntervalDays
              ? `${metrics.averageOrderIntervalDays} days`
              : "N/A"}
          </p>
          {metrics.averageOrderIntervalDays && (
            <p className="text-xs text-gray-600">
              {metrics.averageOrderIntervalDays <= 7
                ? "Weekly"
                : metrics.averageOrderIntervalDays <= 14
                ? "Bi-weekly"
                : metrics.averageOrderIntervalDays <= 31
                ? "Monthly"
                : "Infrequent"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
