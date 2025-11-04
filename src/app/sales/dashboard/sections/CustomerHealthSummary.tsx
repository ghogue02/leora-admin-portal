'use client';

import Link from "next/link";
import { DashboardTile } from "@/components/dashboard/DashboardTile";
import type { DashboardDrilldownType } from "@/types/drilldown";

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
      color: "border-green-200 bg-green-50 text-green-900",
      description: "On track with ordering cadence",
      drilldownType: 'healthy-customers' as DashboardDrilldownType,
    },
    {
      label: "At Risk (Cadence)",
      count: customerHealth.atRiskCadence,
      color: "border-amber-200 bg-amber-50 text-amber-900",
      description: "Ordering frequency declining",
      drilldownType: 'at-risk-cadence' as DashboardDrilldownType,
    },
    {
      label: "At Risk (Revenue)",
      count: customerHealth.atRiskRevenue,
      color: "border-orange-200 bg-orange-50 text-orange-900",
      description: "Revenue down 15%+",
      drilldownType: 'at-risk-revenue' as DashboardDrilldownType,
    },
  ];

  // Prospect cards (never ordered)
  const prospectCards = [
    {
      label: "Recent Prospects",
      count: customerHealth.prospect,
      color: "border-blue-200 bg-blue-50 text-blue-900",
      description: "&lt; 90 days, never ordered",
      drilldownType: 'prospect-customers' as DashboardDrilldownType,
      icon: "🆕",
    },
    {
      label: "Cold Leads",
      count: customerHealth.prospectCold,
      color: "border-slate-200 bg-slate-50 text-slate-900",
      description: "90+ days, never ordered",
      drilldownType: 'prospect-cold' as DashboardDrilldownType,
      icon: "❄️",
    },
  ];

  // Churned/Lost cards
  const churnedCards = [
    {
      label: "Dormant",
      count: customerHealth.dormant,
      color: "border-rose-200 bg-rose-50 text-rose-900",
      description: "Previously active, now inactive",
      drilldownType: 'dormant-customers' as DashboardDrilldownType,
      icon: "😴",
    },
  ];

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
            Segmented view of {activeCustomersTotal + customerHealth.totalProspects + customerHealth.dormant + customerHealth.closed} total accounts
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
            ✓ ACTIVE CUSTOMERS <span className="ml-2 text-gray-500">({activeCustomersTotal})</span>
          </h4>
          <p className="text-xs text-gray-500">
            {healthyPercentage.toFixed(0)}% healthy
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
              <div className={`rounded-lg border p-4 ${card.color} cursor-pointer transition hover:shadow-md`}>
                <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
                <p className="mt-2 text-3xl font-bold">{card.count}</p>
                <p className="mt-1 text-xs opacity-75">{card.description}</p>
              </div>
            </DashboardTile>
          ))}
        </div>
      </div>

      {/* Prospect Pipeline Section */}
      <div className="mt-6">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-700">
            🎯 PROSPECT PIPELINE <span className="ml-2 text-gray-500">({customerHealth.totalProspects})</span>
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
              <div className={`rounded-lg border p-4 ${card.color} cursor-pointer transition hover:shadow-md`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <p className="mt-2 text-3xl font-bold">{card.count}</p>
                <p className="mt-1 text-xs opacity-75">{card.description}</p>
              </div>
            </DashboardTile>
          ))}
        </div>
      </div>

      {/* Lost/Churned Section */}
      <div className="mt-6">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-gray-700">
            😔 LOST/CHURNED <span className="ml-2 text-gray-500">({customerHealth.dormant + customerHealth.closed})</span>
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
              <div className={`rounded-lg border p-4 ${card.color} cursor-pointer transition hover:shadow-md`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
                  <span className="text-xl">{card.icon}</span>
                </div>
                <p className="mt-2 text-3xl font-bold">{card.count}</p>
                <p className="mt-1 text-xs opacity-75">{card.description}</p>
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
              {customerHealth.healthy} healthy out of {activeCustomersTotal} active customers
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
              ⚠️ {atRiskTotal} customer{atRiskTotal === 1 ? "" : "s"} need{atRiskTotal === 1 ? "s" : ""} immediate attention
            </p>
            <p className="mt-1 text-xs">
              Review at-risk accounts to prevent churn. Consider scheduling visits or tastings to address declining revenue or ordering frequency.
            </p>
          </div>
        )}

        {customerHealth.totalProspects > 0 && (
          <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold">
              💡 {customerHealth.totalProspects} prospects in pipeline
            </p>
            <p className="mt-1 text-xs">
              {customerHealth.prospect} recent prospects (&lt; 90 days) and {customerHealth.prospectCold} cold leads need conversion outreach.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
