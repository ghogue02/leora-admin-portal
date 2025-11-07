"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AllRepsPerformance from "./sections/AllRepsPerformance";
import TerritoryHealthOverview from "./sections/TerritoryHealthOverview";
import SampleBudgetOverview from "./sections/SampleBudgetOverview";
import RepDrilldownModal from "./components/RepDrilldownModal";
import TerritoryDrilldownModal from "./components/TerritoryDrilldownModal";
import PerformanceComparison from "./components/PerformanceComparison";
import RevenueForecast from "./components/RevenueForecast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

export default function ManagerDashboardPage() {
  const [managerData, setManagerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("overview");

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
      <header className="flex justify-end gap-4">
        <Link
          href="/sales/manager/approvals"
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
        >
          Order Approvals
        </Link>
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
          {/* Tabs for Different Views */}
          <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
              <TabsTrigger value="samples">Samples</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Team Stats Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-gray-600">Total Revenue (YTD)</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {formatCurrency(Number(managerData.teamStats?.ytdRevenue ?? 0))}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    This month: {formatCurrency(Number(managerData.teamStats?.mtdRevenue ?? 0))}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {formatNumber(Number(managerData.teamStats?.totalCustomers ?? 0))}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatNumber(Number(managerData.teamStats?.activeCustomers ?? 0))} active this week
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-gray-600">At-Risk Customers</p>
                  <p className="mt-2 text-3xl font-bold text-orange-600">
                    {formatNumber(Number(managerData.teamStats?.atRiskCustomers ?? 0))}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">Require attention</p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-gray-600">Team Activities</p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">
                    {formatNumber(Number(managerData.teamStats?.totalActivities ?? 0))}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">This week</p>
                </div>
              </div>

              {/* All Reps Performance Comparison */}
              <AllRepsPerformance
                reps={managerData.reps}
                onRepClick={setSelectedRepId}
              />

              {/* Territory Health Overview */}
              <TerritoryHealthOverview
                territories={managerData.territories}
                onTerritoryClick={setSelectedTerritory}
              />
            </TabsContent>

            <TabsContent value="forecast" className="mt-6">
              <RevenueForecast />
            </TabsContent>

            <TabsContent value="samples" className="mt-6">
              <SampleBudgetOverview budgets={managerData.sampleBudgets} />
            </TabsContent>
          </Tabs>

          {/* Drill-down Modals */}
          <RepDrilldownModal
            repId={selectedRepId}
            open={!!selectedRepId}
            onClose={() => setSelectedRepId(null)}
          />

          <TerritoryDrilldownModal
            territoryName={selectedTerritory}
            open={!!selectedTerritory}
            onClose={() => setSelectedTerritory(null)}
          />
        </>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No data available</p>
        </div>
      )}
    </main>
  );
}
