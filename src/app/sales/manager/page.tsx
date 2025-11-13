"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AllRepsPerformance from "./sections/AllRepsPerformance";
import TerritoryHealthOverview from "./sections/TerritoryHealthOverview";
import SampleBudgetOverview from "./sections/SampleBudgetOverview";
import RepDrilldownModal from "./components/RepDrilldownModal";
import TerritoryDrilldownModal from "./components/TerritoryDrilldownModal";
import RevenueForecast from "./components/RevenueForecast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

type ManagerTeamStats = {
  ytdRevenue?: number | null;
  mtdRevenue?: number | null;
  totalCustomers?: number | null;
  activeCustomers?: number | null;
  atRiskCustomers?: number | null;
  totalActivities?: number | null;
};

type ManagerDashboardData = {
  teamStats?: ManagerTeamStats | null;
  reps?: unknown[];
  territories?: unknown[];
  sampleBudgets?: unknown[];
};

export default function ManagerDashboardPage() {
  const [managerData, setManagerData] = useState<ManagerDashboardData | null>(null);
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
        const data = (await response.json()) as ManagerDashboardData;
        setManagerData(data);
      }
    } catch (error) {
      console.error("Error loading manager data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="layout-shell-tight layout-stack pb-12">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Leadership</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manager dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor rep coverage, territory health, and budget usage from any device.
          </p>
        </div>
        <Link
          href="/sales/manager/approvals"
          className="touch-target inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        >
          Order approvals
        </Link>
      </header>

      {loading ? (
        <section className="surface-card flex items-center justify-center p-12 shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading team data...</p>
          </div>
        </section>
      ) : managerData ? (
        <>
          {/* Tabs for Different Views */}
          <section className="surface-card p-4 shadow-sm">
            <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="forecast">Forecast</TabsTrigger>
                <TabsTrigger value="samples">Samples</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
              {/* Team Stats Summary */}
              <div className="grid gap-4 md:grid-cols-4">
                <div className="surface-card p-6 shadow-sm">
                  <p className="text-sm font-medium text-gray-600">Total Revenue (YTD)</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {formatCurrency(Number(managerData.teamStats?.ytdRevenue ?? 0))}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    This month: {formatCurrency(Number(managerData.teamStats?.mtdRevenue ?? 0))}
                  </p>
                </div>

                <div className="surface-card p-6 shadow-sm">
                  <p className="text-sm font-medium text-gray-600">Total Customers</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {formatNumber(Number(managerData.teamStats?.totalCustomers ?? 0))}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatNumber(Number(managerData.teamStats?.activeCustomers ?? 0))} active this week
                  </p>
                </div>

                <div className="surface-card p-6 shadow-sm">
                  <p className="text-sm font-medium text-gray-600">At-Risk Customers</p>
                  <p className="mt-2 text-3xl font-bold text-orange-600">
                    {formatNumber(Number(managerData.teamStats?.atRiskCustomers ?? 0))}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">Require attention</p>
                </div>

                <div className="surface-card p-6 shadow-sm">
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
          </section>

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
        <section className="surface-card p-12 text-center shadow-sm">
          <p className="text-gray-500">No data available</p>
        </section>
      )}
    </main>
  );
}
