'use client';

import Link from "next/link";
import { DashboardTile } from "@/components/dashboard/DashboardTile";
import type { DashboardDrilldownType } from "@/types/drilldown";
import { formatNumber } from "@/lib/format";

type CustomerHealthSummaryProps = {
  customerHealth: {
    healthy: number;
    atRiskCadence: number;
    atRiskRevenue: number;
    dormant: number;
    closed: number;
    prospect: number;
    prospectCold: number;
    total: number;
    totalProspects: number;
  };
  onDrilldown?: (type: DashboardDrilldownType) => void;
};

export default function CustomerHealthSummary({ customerHealth, onDrilldown }: CustomerHealthSummaryProps) {
  // Active customer cards (have order history)
  const activeCustomerCards = [
    {
      label: "Healthy",
      count: customerHealth.healthy,
      description: "On track with ordering cadence",
      drilldownType: 'healthy-customers' as DashboardDrilldownType,
    },
    {
      label: "At Risk (Cadence)",
      count: customerHealth.atRiskCadence,
      description: "Ordering frequency declining",
      drilldownType: 'at-risk-cadence' as DashboardDrilldownType,
    },
    {
      label: "At Risk (Revenue)",
      count: customerHealth.atRiskRevenue,
      description: "Revenue down 15%+",
      drilldownType: 'at-risk-revenue' as DashboardDrilldownType,
    },
  ];

  // Prospect cards (never ordered)
  const prospectCards = [
    {
      label: "Recent Prospects",
      count: customerHealth.prospect,
      description: "&lt; 90 days, never ordered",
      drilldownType: 'prospect-customers' as DashboardDrilldownType,
    },
    {
      label: "Cold Leads",
      count: customerHealth.prospectCold,
      description: "90+ days, never ordered",
      drilldownType: 'prospect-cold' as DashboardDrilldownType,
    },
  ];

  // Churned/Lost cards
  const churnedCards = [
    {
      label: "Dormant",
      count: customerHealth.dormant,
      description: "Previously active, now inactive",
      drilldownType: 'dormant-customers' as DashboardDrilldownType,
    },
  ];

  const cardBaseClasses = "rounded-lg border border-slate-200 bg-white p-4 cursor-pointer transition hover:shadow-md";

  const atRiskTotal = customerHealth.atRiskCadence + customerHealth.atRiskRevenue;
  const activeCustomersTotal = customerHealth.healthy + customerHealth.atRiskCadence + customerHealth.atRiskRevenue;
  const healthyPercentage = activeCustomersTotal > 0
    ? (customerHealth.healthy / activeCustomersTotal) * 100
    : 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Customer Portfolio Health</h3>
          <p className="text-xs text-gray-500">
            Segmented view of {formatNumber(activeCustomersTotal + customerHealth.totalProspects + customerHealth.dormant + customerHealth.closed)} total accounts
          </p>
        </div>
        <Link
          href="/sales/customers"
          className="text-xs font-semibold text-gray-600 underline decoration-dotted underline-offset-4 transition hover:text-gray-900"
        >
          View all customers
        </Link>
      </div>

      {/* Active Customers Section */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">
            ACTIVE CUSTOMERS <span className="ml-2 text-gray-500">({activeCustomersTotal})</span>
          </h4>
          <p className="text-xs text-gray-500">
            {`${formatNumber(healthyPercentage)}%`} healthy
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {activeCustomerCards.map((card) => (
          <DashboardTile
            key={card.label}
            drilldownType={card.drilldownType}
            title={card.label}
            onClick={() => onDrilldown?.(card.drilldownType)}
          >
            <div className={cardBaseClasses}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(card.count)}</p>
              <p className="mt-1 text-xs text-gray-500">{card.description}</p>
            </div>
          </DashboardTile>
        ))}
      </div>
    </div>

      {/* Prospect Pipeline Section */}
      <div className="mt-6">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-700">
            PROSPECT PIPELINE <span className="ml-2 text-gray-500">({formatNumber(customerHealth.totalProspects)})</span>
          </h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {prospectCards.map((card) => (
          <DashboardTile
            key={card.label}
            drilldownType={card.drilldownType}
            title={card.label}
            onClick={() => onDrilldown?.(card.drilldownType)}
          >
            <div className={cardBaseClasses}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(card.count)}</p>
              <p className="mt-1 text-xs text-gray-500">{card.description}</p>
            </div>
          </DashboardTile>
        ))}
      </div>
    </div>

      {/* Lost/Churned Section */}
      <div className="mt-6">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-700">
            LOST/CHURNED <span className="ml-2 text-gray-500">({formatNumber(customerHealth.dormant + customerHealth.closed)})</span>
          </h4>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {churnedCards.map((card) => (
          <DashboardTile
            key={card.label}
            drilldownType={card.drilldownType}
            title={card.label}
            onClick={() => onDrilldown?.(card.drilldownType)}
          >
            <div className={cardBaseClasses}>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatNumber(card.count)}</p>
              <p className="mt-1 text-xs text-gray-500">{card.description}</p>
            </div>
          </DashboardTile>
        ))}
      </div>
    </div>

      {/* Summary and Alerts */}
      <div className="mt-6 rounded-md border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="font-semibold text-gray-900">Portfolio Health Score</p>
            <p className="text-xs text-gray-500">
              {formatNumber(customerHealth.healthy)} healthy out of {formatNumber(activeCustomersTotal)} active customers
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {`${formatNumber(healthyPercentage)}%`}
            </p>
            <p className="text-xs text-gray-500">Healthy rate</p>
          </div>
        </div>

        {atRiskTotal > 0 && (
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-gray-700">
            <p className="font-semibold">
              {formatNumber(atRiskTotal)} customer{atRiskTotal === 1 ? "" : "s"} need{atRiskTotal === 1 ? "s" : ""} immediate attention
            </p>
            <p className="mt-1 text-xs">
              Review at-risk accounts to prevent churn. Consider scheduling visits or tastings to address declining revenue or ordering frequency.
            </p>
          </div>
        )}

        {customerHealth.totalProspects > 0 && (
          <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm text-gray-700">
            <p className="font-semibold">
              {formatNumber(customerHealth.totalProspects)} prospects in pipeline
            </p>
            <p className="mt-1 text-xs">
              {formatNumber(customerHealth.prospect)} recent prospects (&lt; 90 days) and {formatNumber(customerHealth.prospectCold)} cold leads need conversion outreach.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
