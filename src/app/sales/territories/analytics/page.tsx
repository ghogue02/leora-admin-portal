"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  MapIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import {
  ResponsiveCard,
  ResponsiveCardDescription,
  ResponsiveCardHeader,
  ResponsiveCardTitle,
} from "@/components/ui/responsive-card";
import { ResponsiveTable } from "@/components/ui/responsive-table";

interface TerritoryPerformance {
  territoryId: string;
  territoryName: string;
  salesRepName: string | null;
  customerCount: number;
  revenue30Days: number;
  revenue90Days: number;
  revenue365Days: number;
  growthRate: number;
  avgOrderValue: number;
  coverage: number;
}

type SortKey = "revenue" | "growth" | "coverage" | "customers";

export default function TerritoryAnalyticsPage() {
  const [performance, setPerformance] = useState<TerritoryPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("revenue");

  const fetchPerformanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/sales/territories/analytics");
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      const data = (await response.json()) as { performance?: TerritoryPerformance[] };
      setPerformance(data.performance ?? []);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPerformanceData();
  }, [fetchPerformanceData]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const stats = useMemo(() => {
    return {
      totalCustomers: performance.reduce((sum, p) => sum + p.customerCount, 0),
      totalRevenue: performance.reduce((sum, p) => sum + p.revenue30Days, 0),
      avgGrowth:
        performance.reduce((sum, p) => sum + p.growthRate, 0) /
        (performance.length || 1),
      avgCoverage:
        performance.reduce((sum, p) => sum + p.coverage, 0) /
        (performance.length || 1),
    };
  }, [performance]);

  const sortedPerformance = useMemo(() => {
    const copy = [...performance];
    return copy.sort((a, b) => {
      switch (sortBy) {
        case "revenue":
          return b.revenue30Days - a.revenue30Days;
        case "growth":
          return b.growthRate - a.growthRate;
        case "coverage":
          return b.coverage - a.coverage;
        case "customers":
          return b.customerCount - a.customerCount;
        default:
          return 0;
      }
    });
  }, [performance, sortBy]);

  if (isLoading) {
    return (
      <main className="layout-shell-tight layout-stack pb-12">
        <section className="surface-card flex items-center justify-center p-12 shadow-sm">
          <div className="text-center text-sm text-gray-600">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
            Loading territory analytics...
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Territories
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Territory performance analytics</h1>
          <p className="text-sm text-gray-600">
            Track and compare territory health across the sales organization.
          </p>
        </div>
        <Link
          href="/sales/territories"
          className="touch-target inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          Back to Territories
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <ResponsiveCard>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.totalCustomers.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Total Customers</div>
            </div>
          </div>
        </ResponsiveCard>
        <ResponsiveCard>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="text-sm text-gray-600">Total Revenue (30d)</div>
            </div>
          </div>
        </ResponsiveCard>
        <ResponsiveCard>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <ArrowTrendingUpIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.avgGrowth.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Avg Growth Rate</div>
            </div>
          </div>
        </ResponsiveCard>
        <ResponsiveCard>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-yellow-100 p-3">
              <MapIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.avgCoverage.toFixed(0)}%
              </div>
              <div className="text-sm text-gray-600">Avg Coverage</div>
            </div>
          </div>
        </ResponsiveCard>
      </section>

      <ResponsiveCard>
        <ResponsiveCardHeader className="sm:flex sm:items-center sm:justify-between">
          <ResponsiveCardTitle>Sort territories</ResponsiveCardTitle>
          <ResponsiveCardDescription className="sm:text-right">
            Choose a metric to highlight top performers.
          </ResponsiveCardDescription>
        </ResponsiveCardHeader>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "revenue", label: "Revenue" },
            { key: "growth", label: "Growth" },
            { key: "coverage", label: "Coverage" },
            { key: "customers", label: "Customers" },
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => setSortBy(option.key as SortKey)}
              className={`touch-target rounded-md px-4 py-2 text-sm font-medium transition ${
                sortBy === option.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </ResponsiveCard>

      <ResponsiveTable stickyHeader>
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {[
                  "Territory",
                  "Sales Rep",
                  "Customers",
                  "30-Day Revenue",
                  "90-Day Revenue",
                  "Growth Rate",
                  "Avg Order",
                  "Coverage",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedPerformance.map((territory) => (
                <tr key={territory.territoryId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {territory.territoryName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {territory.salesRepName || "Unassigned"}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {territory.customerCount}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {formatCurrency(territory.revenue30Days)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(territory.revenue90Days)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <span
                      className={
                        territory.growthRate >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {territory.growthRate >= 0 ? "+" : ""}
                      {territory.growthRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatCurrency(territory.avgOrderValue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${territory.coverage}%` }}
                        />
                      </div>
                      <span>{territory.coverage.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </ResponsiveTable>

      <ResponsiveCard variant="muted">
        <ResponsiveCardTitle className="text-yellow-900">
          Territory optimization recommendations
        </ResponsiveCardTitle>
        <ul className="mt-2 space-y-2 text-sm text-yellow-800">
          <li>• Consider splitting high-customer territories for better coverage.</li>
          <li>• Territories with coverage below 60% may need additional rep resources.</li>
          <li>• Invest in high-growth territories to capitalize on momentum.</li>
          <li>• Balance customer distribution to improve average territory performance.</li>
        </ul>
      </ResponsiveCard>
    </main>
  );
}
