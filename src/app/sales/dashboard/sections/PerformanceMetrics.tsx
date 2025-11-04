'use client';

import { DashboardTile } from "@/components/dashboard/DashboardTile";
import type { DashboardDrilldownType } from "@/types/drilldown";
import { MetricTooltip } from "./MetricDefinitions";

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
    currentMonth: {
      revenue: number;
      uniqueCustomers: number;
      quotaProgress: number;
    };
    lastMonth: {
      revenue: number;
    };
    mtd?: {
      revenue: number;
      uniqueCustomers: number;
    };
    ytd?: {
      revenue: number;
      uniqueCustomers: number;
    };
    allTime: {
      revenue: number;
      uniqueCustomers: number;
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

  const revenueChangeColor = metrics.comparison.revenueChange >= 0 ? "text-green-700" : "text-rose-700";

  const tileBaseClasses = "flex h-full flex-col gap-4 rounded-lg border p-6 shadow-sm";
  const territoryName = salesRep.territory?.trim();
  const territoryLabel =
    territoryName && territoryName.toLowerCase().includes("territory")
      ? territoryName
      : territoryName
      ? `${territoryName} territory`
      : null;

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-gray-900">
          Welcome back, {salesRep.name.split(" ")[0]}
        </h2>
        <p className="text-sm text-gray-600">
          {territoryLabel ? `${territoryLabel} - ` : ""}
          Week of {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        <DashboardTile
          drilldownType="weekly-quota"
          title="Weekly Quota Progress"
          onClick={() => onDrilldown?.('weekly-quota')}
          className="group h-full"
        >
          <div className={`${tileBaseClasses} ${quotaProgressColor}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest">Weekly Quota Progress</p>
              <MetricTooltip metricKey="weekly-quota" />
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2">
              <p className="text-3xl font-semibold">
                {metrics.currentWeek.quotaProgress.toFixed(0)}%
              </p>
              <p className="text-xs">
                {formatCurrency(metrics.currentWeek.revenue)} of {formatCurrency(salesRep.weeklyQuota)}
              </p>
            </div>
          </div>
        </DashboardTile>

        <DashboardTile
          drilldownType="this-week-revenue"
          title="This Week Revenue"
          onClick={() => onDrilldown?.('this-week-revenue')}
          className="group h-full"
        >
          <div className={`${tileBaseClasses} border-slate-200 bg-white`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
                This Week Revenue
              </p>
              <MetricTooltip metricKey="this-week-revenue" />
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2">
              <p className="text-3xl font-semibold text-gray-900">
                {formatCurrency(metrics.currentWeek.revenue)}
              </p>
              <p className={`text-xs font-semibold ${revenueChangeColor}`}>
                {metrics.comparison.revenueChange >= 0 ? "+" : ""}
                {metrics.comparison.revenueChangePercent}% vs last week
              </p>
            </div>
          </div>
        </DashboardTile>

        {/* MTD Revenue - New */}
        <DashboardTile
          drilldownType="mtd-revenue"
          title="MTD Revenue"
          onClick={() => onDrilldown?.('mtd-revenue')}
          className="group h-full"
        >
          <div className={`${tileBaseClasses} border-orange-200 bg-orange-50`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest text-orange-700">
                MTD Revenue (Oct 2025)
              </p>
              <MetricTooltip metricKey="mtd-revenue" />
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2">
              <p className="text-3xl font-semibold text-orange-900">
                {formatCurrency(metrics.mtd?.revenue || 0)}
              </p>
              <p className="text-xs text-orange-600">
                {metrics.mtd?.uniqueCustomers || 0} customers
              </p>
            </div>
          </div>
        </DashboardTile>

        {/* Last Month Revenue - New */}
        <DashboardTile
          drilldownType="last-month-revenue"
          title="Last Month Revenue"
          onClick={() => onDrilldown?.('last-month-revenue')}
          className="group h-full"
        >
          <div className={`${tileBaseClasses} border-purple-200 bg-purple-50`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest text-purple-700">
                Last Month Revenue
              </p>
              <MetricTooltip metricKey="last-month-revenue" />
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2">
              <p className="text-3xl font-semibold text-purple-900">
                {formatCurrency(metrics.lastMonth?.revenue || 0)}
              </p>
              <p className="text-xs text-purple-600">
                Previous month total
              </p>
            </div>
          </div>
        </DashboardTile>

        {/* YTD Revenue - New */}
        <DashboardTile
          drilldownType="ytd-revenue"
          title="YTD Revenue"
          onClick={() => onDrilldown?.('ytd-revenue')}
          className="group h-full"
        >
          <div className={`${tileBaseClasses} border-blue-200 bg-blue-50`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest text-blue-700">
                YTD Revenue (2025)
              </p>
              <MetricTooltip metricKey="ytd-revenue" />
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2">
              <p className="text-3xl font-semibold text-blue-900">
                {formatCurrency(metrics.ytd?.revenue || 0)}
              </p>
              <p className="text-xs text-blue-600">
                {metrics.ytd?.uniqueCustomers || 0} customers
              </p>
            </div>
          </div>
        </DashboardTile>

        <DashboardTile
          drilldownType="unique-customers"
          title="Unique Customers This Week"
          onClick={() => onDrilldown?.('unique-customers')}
          className="group h-full"
        >
          <div className={`${tileBaseClasses} border-slate-200 bg-white`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
                Unique Customers
              </p>
              <MetricTooltip metricKey="unique-customers" />
            </div>
            <div className="flex flex-1 flex-col justify-end gap-2">
              <p className="text-3xl font-semibold text-gray-900">
                {metrics.currentWeek.uniqueCustomers}
              </p>
              <p className="text-xs text-gray-500">Orders this week</p>
            </div>
          </div>
        </DashboardTile>
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
