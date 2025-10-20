"use client";

import { useState, useEffect } from "react";
import AllRepsPerformance from "./sections/AllRepsPerformance";
import TerritoryHealthOverview from "./sections/TerritoryHealthOverview";
import SampleBudgetOverview from "./sections/SampleBudgetOverview";

export default function ManagerDashboardPage() {
  const [managerData, setManagerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadManagerData();
  }, []);

  const loadManagerData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sales/manager/dashboard");
      if (response.ok) {
        const data = await response.json();
        setManagerData(data);
      }
    } catch (error) {
      console.error("Error loading manager data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 p-6">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
          Management
        </p>
        <h1 className="text-3xl font-semibold text-gray-900">Team Dashboard</h1>
        <p className="text-sm text-gray-600">
          Monitor all sales representatives' performance and territory health
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading team data...</p>
          </div>
        </div>
      ) : managerData ? (
        <>
          {/* All Reps Performance Comparison */}
          <AllRepsPerformance reps={managerData.reps} />

          {/* Territory Health Overview */}
          <TerritoryHealthOverview territories={managerData.territories} />

          {/* Sample Budget Overview */}
          <SampleBudgetOverview budgets={managerData.sampleBudgets} />

          {/* Team Stats Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-600">Total Revenue (This Week)</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                ${managerData.teamStats?.totalRevenue?.toLocaleString() || 0}
              </p>
              {managerData.teamStats?.revenueChange !== undefined && (
                <p
                  className={`mt-1 text-sm ${
                    managerData.teamStats.revenueChange >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {managerData.teamStats.revenueChange >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(managerData.teamStats.revenueChange).toFixed(1)}% vs last week
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {managerData.teamStats?.totalCustomers || 0}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {managerData.teamStats?.activeCustomers || 0} active this week
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-600">At-Risk Customers</p>
              <p className="mt-2 text-3xl font-bold text-orange-600">
                {managerData.teamStats?.atRiskCustomers || 0}
              </p>
              <p className="mt-1 text-sm text-gray-500">Require attention</p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-gray-600">Team Activities</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {managerData.teamStats?.totalActivities || 0}
              </p>
              <p className="mt-1 text-sm text-gray-500">This week</p>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </main>
  );
}
