'use client';

import { DashboardTile } from "@/components/dashboard/DashboardTile";
import type { DashboardDrilldownType } from "@/types/drilldown";

type PerformanceMetricsProps = {
  salesRep: {
    name: string;
    territory: string;
    weeklyQuota: number;
  };
  metrics: {
    currentWeek: {
      revenue: number;
      uniqueCustomers: number;
      quotaProgress: number;
    };
    lastWeek: {
      revenue: number;
    };
    comparison: {
      revenueChange: number;
      revenueChangePercent: string;
    };
    weeklyMetrics?: {
      inPersonVisits: number;
      tastingAppointments: number;
      emailContacts: number;
      phoneContacts: number;
      textContacts: number;
      newCustomersAdded: number;
      reactivatedCustomers: number;
    } | null;
  };
  onDrilldown?: (type: DashboardDrilldownType) => void;
};

export default function PerformanceMetrics({ salesRep, metrics, onDrilldown }: PerformanceMetricsProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const quotaProgressColor =
    metrics.currentWeek.quotaProgress >= 100
      ? "text-green-700 bg-green-50 border-green-200"
      : metrics.currentWeek.quotaProgress >= 75
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-rose-700 bg-rose-50 border-rose-200";

  const revenueChangeColor =
    metrics.comparison.revenueChange >= 0
      ? "text-green-700"
      : "text-rose-700";

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome back, {salesRep.name.split(" ")[0]}
        </h2>
        <p className="text-sm text-gray-600">
          {salesRep.territory} territory - Week of {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardTile
          drilldownType="weekly-quota"
          title="Weekly Quota Progress"
          onClick={() => onDrilldown?.('weekly-quota')}
        >
          <div className={`rounded-lg border p-6 shadow-sm ${quotaProgressColor}`}>
            <p className="text-xs font-medium uppercase tracking-widest">Weekly Quota Progress</p>
            <p className="mt-2 text-3xl font-semibold">
              {metrics.currentWeek.quotaProgress.toFixed(0)}%
            </p>
            <p className="mt-2 text-xs">
              {formatCurrency(metrics.currentWeek.revenue)} of {formatCurrency(salesRep.weeklyQuota)}
            </p>
          </div>
        </DashboardTile>

        <DashboardTile
          drilldownType="this-week-revenue"
          title="This Week Revenue"
          onClick={() => onDrilldown?.('this-week-revenue')}
        >
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
              This Week Revenue
            </p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">
              {formatCurrency(metrics.currentWeek.revenue)}
            </p>
            <p className={`mt-2 text-xs font-semibold ${revenueChangeColor}`}>
              {metrics.comparison.revenueChange >= 0 ? "+" : ""}
              {metrics.comparison.revenueChangePercent}% vs last week
            </p>
          </div>
        </DashboardTile>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            Unique Customers
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {metrics.currentWeek.uniqueCustomers}
          </p>
          <p className="mt-2 text-xs text-gray-500">Orders this week</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            Last Week
          </p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(metrics.lastWeek.revenue)}
          </p>
          <p className="mt-2 text-xs text-gray-500">For comparison</p>
        </div>
      </div>

      {metrics.weeklyMetrics && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Activity Summary</h3>
          <p className="text-xs text-gray-500">Your engagement this week</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <ActivityMetric
              label="In-Person Visits"
              value={metrics.weeklyMetrics.inPersonVisits}
            />
            <ActivityMetric
              label="Tasting Appointments"
              value={metrics.weeklyMetrics.tastingAppointments}
            />
            <ActivityMetric
              label="Email Contacts"
              value={metrics.weeklyMetrics.emailContacts}
            />
            <ActivityMetric
              label="Phone Calls"
              value={metrics.weeklyMetrics.phoneContacts}
            />
            <ActivityMetric
              label="Text Messages"
              value={metrics.weeklyMetrics.textContacts}
            />
          </div>

          <div className="mt-4 flex gap-4 border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">New Customers:</span>
              <span className="font-semibold text-green-700">
                +{metrics.weeklyMetrics.newCustomersAdded}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">Reactivated:</span>
              <span className="font-semibold text-blue-700">
                +{metrics.weeklyMetrics.reactivatedCustomers}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ActivityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
