"use client";

import { format, parseISO } from "date-fns";
import Link from "next/link";
import LogActivityButton from "@/components/shared/LogActivityButton";
import type { SampleActivityRecord, SampleInsightsSummary } from "@/types/activities";

type SampleActivitySummaryProps = {
  insights: SampleInsightsSummary;
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
};

export default function SampleActivitySummary({ insights }: SampleActivitySummaryProps) {
  const { metrics, recentActivities, followUps } = insights;
  const periodConversionPercent = (metrics.periodCustomerConversionRate * 100).toFixed(1);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sample Activity Snapshot</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track shared samples, feedback collected, and follow-ups that still need attention.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <MetricCard label="Samples Logged (This Week)" value={metrics.loggedThisWeek} />
          <MetricCard label="Follow-ups Completed" value={metrics.completedThisWeek} />
          <MetricCard label="Open Follow-ups" value={metrics.openFollowUps} highlight />
          <MetricCard
            label={`${metrics.periodLabel} Conversion`}
            valueLabel={`${periodConversionPercent}%`}
            sublabel={`${metrics.periodSampleQuantity.toLocaleString()} samples across ${metrics.periodUniqueCustomers.toLocaleString()} customers`}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SampleList
          title="Recent Sample Shares"
          emptyState="No recent samples logged."
          items={recentActivities}
          showFollowUpBadge
        />
        <SampleList
          title="Follow-ups Needed"
          emptyState="No open sample follow-ups. Great work!"
          items={followUps}
          showActions
        />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  valueLabel,
  highlight = false,
  sublabel,
}: {
  label: string;
  value?: number;
  valueLabel?: string;
  highlight?: boolean;
  sublabel?: string;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 ${
        highlight ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-2 text-3xl font-bold ${
          highlight ? "text-amber-700" : "text-gray-900"
        }`}
      >
        {valueLabel ?? value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-gray-500">{sublabel}</p>}
    </div>
  );
}

function SampleList({
  title,
  emptyState,
  items,
  showActions = false,
  showFollowUpBadge = false,
}: {
  title: string;
  emptyState: string;
  items: SampleActivityRecord[];
  showActions?: boolean;
  showFollowUpBadge?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-gray-500">{emptyState}</div>
      ) : (
        <ul className="divide-y divide-slate-200">
          {items.map((item) => {
            const activity = item.activity;
            const customerId = activity?.customer?.id ?? null;
            const activityDate = formatDate(activity?.occurredAt ?? item.createdAt);
            const skuLabel =
              item.sku?.name ||
              item.sku?.code ||
              (item.sku?.brand ? `${item.sku.brand} sample` : "Sample");

            return (
              <li key={item.id} className="px-4 py-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {activity?.subject || skuLabel}
                      </p>
                      <p className="text-xs text-gray-500">{activityDate}</p>
                    </div>
                    {showFollowUpBadge && item.followUpNeeded && !item.followUpCompletedAt && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        Follow-up needed
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    {activity?.customer && (
                      <Link
                        href={`/sales/customers/${activity.customer.id}`}
                        className="font-medium text-blue-600 hover:text-blue-700"
                      >
                        {activity.customer.name}
                      </Link>
                    )}
                    {item.sku && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-gray-700">
                        {item.sku.brand && <span>{item.sku.brand}</span>}
                        {item.sku.name && <span>{item.sku.name}</span>}
                        {!item.sku.name && item.sku.code && <span>{item.sku.code}</span>}
                        {item.sku.size && <span>• {item.sku.size}</span>}
                      </span>
                    )}
                  </div>

                  {item.feedback && (
                    <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-gray-700">
                      “{item.feedback}”
                    </p>
                  )}

                  {showActions && customerId && (
                    <div className="flex items-center gap-2">
                      <LogActivityButton
                        customerId={customerId}
                        variant="secondary"
                        size="sm"
                        label="Log Follow-up"
                      />
                      <Link
                        href={`/sales/customers/${customerId}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View customer
                      </Link>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
