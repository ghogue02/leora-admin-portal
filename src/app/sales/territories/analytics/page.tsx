"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  MapIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

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

export default function TerritoryAnalyticsPage() {
  const [performance, setPerformance] = useState<TerritoryPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<
    "revenue" | "growth" | "coverage" | "customers"
  >("revenue");

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/sales/territories/analytics");

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setPerformance(data.performance || []);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getSortedPerformance = () => {
    return [...performance].sort((a, b) => {
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
  };

  const getTotalStats = () => {
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
  };

  const stats = getTotalStats();
  const sortedPerformance = getSortedPerformance();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Territory Performance Analytics
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Track and compare territory performance across your sales organization
              </p>
            </div>
            <Link
              href="/sales/territories"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Territories
            </Link>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalCustomers.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Customers</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <div className="text-sm text-gray-600">Total Revenue (30d)</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ArrowTrendingUpIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.avgGrowth.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Avg Growth Rate</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <MapIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.avgCoverage.toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Avg Coverage</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Sort by:</span>
            <div className="flex gap-2">
              {[
                { key: "revenue", label: "Revenue" },
                { key: "growth", label: "Growth" },
                { key: "coverage", label: "Coverage" },
                { key: "customers", label: "Customers" },
              ].map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSortBy(option.key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === option.key
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Territory Comparison
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Territory
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sales Rep
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    30-Day Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    90-Day Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Growth Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Coverage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedPerformance.map((territory) => (
                  <tr key={territory.territoryId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {territory.territoryName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {territory.salesRepName || "Unassigned"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {territory.customerCount}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(territory.revenue30Days)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(territory.revenue90Days)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm font-medium ${
                          territory.growthRate >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {territory.growthRate >= 0 ? "+" : ""}
                        {territory.growthRate.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatCurrency(territory.avgOrderValue)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${territory.coverage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900 w-10">
                          {territory.coverage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4">
            Territory Optimization Recommendations
          </h3>
          <ul className="space-y-2 text-sm text-yellow-800">
            <li>
              • Consider splitting high-customer territories (above{" "}
              {Math.max(...performance.map((p) => p.customerCount)) * 0.8} customers)
              for better coverage
            </li>
            <li>
              • Territories with low coverage (&lt;60%) may need additional sales rep
              resources
            </li>
            <li>
              • High-growth territories show strong potential for increased investment
            </li>
            <li>
              • Balance customer distribution across territories for optimal performance
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
